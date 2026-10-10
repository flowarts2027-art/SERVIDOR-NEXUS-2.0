#!/usr/bin/env node
// Nexus AutoFix: safe remediation of workflow and Worker faults.
// Does not publish Instagram content, deploy arbitrary code or merge PRs.
import fs from "node:fs";
import {recoverableRun,healthIncidents,eligibleCodePatch,scrubLog,incidentKey} from "./nexus-autofix-policy.mjs";

const repo=process.env.GITHUB_REPOSITORY||"globalplay27/SERVIDOR-GLOBAL-PLAY";
const token=process.env.GITHUB_TOKEN||"";
const base=process.env.NEXUS_WORKER_URL||"https://servidor-nexus.diamantehinode2015.workers.dev";
const now=new Date().toISOString();
const report={startedAt:now,repo,mode:process.argv.includes("--self-test")?"self-test":"active",actions:[],incidents:[],unresolved:[]};

if(report.mode==="self-test"){
  const assert=(v,message)=>{if(!v)throw Error(message);};
  assert(!recoverableRun({name:"NEXUS CI",head_sha:"a",head_branch:"main",status:"completed",conclusion:"failure",run_attempt:1,event:"push",updated_at:now},"a"),"cooldown");
  assert(eligibleCodePatch("cloudflare/test/format-builder.test.mjs","const x=1","const x=2","const x=1").ok,"allowlist");
  assert(!eligibleCodePatch("cloudflare/src/publisher.js","foo","bar","foo").ok,"protected publisher");
  assert(!eligibleCodePatch("cloudflare/test/a.test.mjs","foo","fetch('https://evil')","foo").ok,"protected network");
  assert(scrubLog("Bearer abcdefghijklmnopqrst").includes("[REDACTED]"),"secret redaction");
  console.log(JSON.stringify({ok:true,checks:5}));
  process.exit(0);
}
if(!token)throw Error("github_token_missing");
if(!/^[\w.-]+\/[\w.-]+$/.test(repo))throw Error("invalid_repo");

async function gh(path,init={}){
  const response=await fetch("https://api.github.com"+path,{
    ...init,signal:AbortSignal.timeout(25000),
    headers:{authorization:"Bearer "+token,accept:"application/vnd.github+json","x-github-api-version":"2022-11-28","user-agent":"Nexus-AutoFix/1.0",...init.headers}
  });
  const body=await response.text();
  if(!response.ok)throw Error("github_http_"+response.status+":"+body.slice(0,170));
  return body?JSON.parse(body):{};
}
async function readHealth(endpoint){
  const r=await fetch(base+endpoint,{signal:AbortSignal.timeout(24000),headers:{"user-agent":"Nexus-AutoFix-Sentinel/1.0"}});
  if(!r.ok)throw Error("worker_http_"+r.status);
  return r.json();
}
async function issueOnce(title,body,known){
  const existing=known.find(x=>x.title===title);
  if(existing)return {url:existing.html_url,created:false};
  const created=await gh("/repos/"+repo+"/issues",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({title,body})
  });
  known.push(created);
  return {url:created.html_url,created:true};
}
function action(kind,data){report.actions.push({kind,at:new Date().toISOString(),...data});}

async function run(){
  const ref=await gh("/repos/"+repo+"/git/ref/heads/main");
  const sha=String(ref.object?.sha||"");
  report.mainSha=sha;
  const [runsPage,issuesPage]=await Promise.all([
    gh("/repos/"+repo+"/actions/runs?branch=main&per_page=40"),
    gh("/repos/"+repo+"/issues?state=open&per_page=100")
  ]);
  const runs=Array.isArray(runsPage.workflow_runs)?runsPage.workflow_runs:[];
  const known=(Array.isArray(issuesPage)?issuesPage:[]).filter(x=>!x.pull_request);
  const failing=runs.filter(x=>x.head_sha===sha&&["failure","timed_out","action_required"].includes(x.conclusion));
  for(const workflow of failing.slice(0,4)){
    const incident={workflow:workflow.name,runId:workflow.id,url:workflow.html_url,attempts:workflow.run_attempt||1};
    report.incidents.push(incident);
    let remediation="awaiting_diagnosis";
    if(recoverableRun(workflow,sha)){
      try{
        await gh("/repos/"+repo+"/actions/runs/"+workflow.id+"/rerun-failed-jobs",{method:"POST"});
        remediation="retry_dispatched";
        action("rerun-failed-jobs",{runId:workflow.id,attempt:2});
      }catch(error){
        remediation="retry_failed";
        incident.recoveryError=String(error.message||error).slice(0,150);
      }
    }
    // Beyond safe retries we record an actionable incident for Fixer/QA.
    // Critical runtime changes are intentionally never pushed straight to main.
    try{
      const title=incidentKey("workflow",workflow.id);
      const result=await issueOnce(title,JSON.stringify({
        component:"Nexus Sentinel + Fixer",workflow:workflow.name,
        sha,run:workflow.html_url,remediation,
        next:"Check failing step and logs; propose a minimal branch fix with CI + QA.",
        safeguards:"No Instagram publish, credentials changes, or automatic deploy."
      },null,2),known);
      action("incident-recorded",{url:result.url,created:result.created});
    }catch(error){report.unresolved.push({kind:"issue_write_failed",error:String(error.message||error).slice(0,130)});}
  }

  let initial=[],remaining=[];
  try{
    const [health,instagram]=await Promise.all([readHealth("/api/autonomy-health"),readHealth("/api/instagram-publishing-health")]);
    initial=healthIncidents(health,instagram);
  }catch(error){initial=[{type:"health_unreachable",details:String(error.message||error).slice(0,150)}];}
  if(initial.length){
    // The public health endpoint already triggers the Worker watchdog.
    await new Promise(resolve=>setTimeout(resolve,4500));
    try{
      const [health,instagram]=await Promise.all([readHealth("/api/autonomy-health"),readHealth("/api/instagram-publishing-health")]);
      remaining=healthIncidents(health,instagram);
    }catch(error){remaining=[{type:"health_unreachable",details:String(error.message||error).slice(0,150)}];}
  }
  report.initialHealthIncidents=initial;
  report.remainingHealthIncidents=remaining;
  for(const incident of remaining){
    const key=incident.type+"_"+(incident.clientId||"system")+"_"+new Date().toISOString().slice(0,10);
    try{
      const title=incidentKey("health",key);
      const issue=await issueOnce(title,JSON.stringify({
        component:"Nexus Sentinel + Fixer",incident,
        recovery:"Repeated read-only health check to activate existing watchdog.",
        next:"Check Cloudflare cron and D1 state. Credential changes need reconnect by account owner.",
        guard:"No real publish or deployment triggered."
      },null,2),known);
      action("health-incident",{url:issue.url,created:issue.created});
    }catch(error){report.unresolved.push({kind:"issue_write_failed",error:String(error.message||error).slice(0,130)});}
  }

  report.ok=remaining.length===0&&failing.length===0&&report.unresolved.length===0;
  report.finishedAt=new Date().toISOString();
  fs.writeFileSync("/tmp/nexus-autofix-report.json",JSON.stringify(report,null,2));
  if(process.env.GITHUB_STEP_SUMMARY){
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      "# Nexus AutoFix\n\nMain: "+sha.slice(0,12)+
      "\nFailures: "+failing.length+"\nHealth incidents: "+remaining.length+
      "\nActions: "+report.actions.length+
      "\n\nOnly confirmed corrective actions count; no live Meta publication was performed.\n"
    );
  }
  console.log(JSON.stringify(report));
}
run().catch(e=>{console.error("nexus_autofix_failed",String(e.message||e).slice(0,190));process.exitCode=1;});
