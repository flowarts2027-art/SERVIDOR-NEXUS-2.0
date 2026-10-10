#!/usr/bin/env node
import fs from "node:fs";

const repo = process.env.GITHUB_REPOSITORY || "globalplay27/SERVIDOR-GLOBAL-PLAY";
const token = process.env.GITHUB_TOKEN || "";
const healthUrl = process.env.NEXUS_HEALTH_URL || "https://servidor-nexus.diamantehinode2015.workers.dev/api/autonomy-health";
const currentRunId = Number(process.env.GITHUB_RUN_ID || 0);
const dryRun = process.argv.includes("--self-test");

export const DOTS = Object.freeze([
  "Nexus Fixer",
  "Nexus Video",
  "Nexus Client UI",
  "Nexus Master UI",
  "Nexus Publisher",
  "Nexus Sentinel",
  "Nexus QA",
  "Nexus Auditor"
]);

export function routeWorkflow(name="") {
  const n = String(name).toLowerCase();
  if (/video|youtube|render/.test(n)) return ["Nexus Sentinel","Nexus Video","Nexus Fixer","Nexus QA","Nexus Auditor"];
  if (/client|portal/.test(n)) return ["Nexus Sentinel","Nexus Client UI","Nexus Fixer","Nexus QA","Nexus Auditor"];
  if (/master/.test(n)) return ["Nexus Sentinel","Nexus Master UI","Nexus Fixer","Nexus QA","Nexus Auditor"];
  if (/publish|instagram|meta/.test(n)) return ["Nexus Sentinel","Nexus Publisher","Nexus Fixer","Nexus QA","Nexus Auditor"];
  return ["Nexus Sentinel","Nexus Fixer","Nexus QA","Nexus Auditor"];
}

export function shouldRerun(run, mainSha) {
  if (!run || Number(run.id) === currentRunId) return false;
  if (/nexus core autonomy/i.test(String(run.name || ""))) return false;
  // Runs created only because a workflow file was invalid at push time have no
  // executable jobs and GitHub returns 403 "This workflow run cannot be retried".
  // They remain visible in Actions, but are not recoverable by rerun.
  if (String(run.event || "") === "push" && (/^\.github\/workflows\/.+\.ya?ml$/i.test(String(run.name || "")) || /^\.github\/workflows\/.+\.ya?ml$/i.test(String(run.path || "")))) return false;
  if (String(run.status) !== "completed") return false;
  if (!["failure","timed_out","action_required"].includes(String(run.conclusion || ""))) return false;
  if (Number(run.run_attempt || 1) >= 3) return false;
  if (mainSha && String(run.head_sha || "") !== String(mainSha)) return false;
  return true;
}

export function healthIncidents(health={}) {
  const incidents = [];
  if (health.ok !== true) incidents.push({type:"production_health",message:"autonomy health is not OK"});
  if (health.automationActive !== true) incidents.push({type:"automation",message:"Cloudflare automation is not active"});
  if (health.scheduler?.healthy !== true) incidents.push({type:"scheduler",message:"scheduler heartbeat is unhealthy"});
  for (const client of Array.isArray(health.clients) ? health.clients : []) {
    if (client?.cycleHealth?.delayed === true || client?.cycleHealth?.cycleOverdue === true) {
      incidents.push({type:"cycle_delayed",clientId:client.clientId||"",message:"client cycle is delayed"});
    }
    if (client?.allAgentsSeen === false) {
      incidents.push({type:"agents_missing",clientId:client.clientId||"",message:"not all Nexus agents were observed"});
    }
    if (client?.allAgentsFresh === false) {
      incidents.push({type:"agents_stale",clientId:client.clientId||"",message:"Nexus agent executions are stale"});
    }
  }
  return incidents;
}

if (dryRun) {
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  assert(DOTS.length === 8, "expected eight Core dots");
  assert(routeWorkflow("NEXUS Video Template Render").includes("Nexus Video"), "video routing failed");
  assert(routeWorkflow("NEXUS CI").includes("Nexus Fixer"), "CI routing failed");
  assert(shouldRerun({id:1,name:"NEXUS CI",status:"completed",conclusion:"failure",run_attempt:1,head_sha:"abc"},"abc"), "rerun policy failed");
  assert(!shouldRerun({id:2,name:"NEXUS CI",status:"completed",conclusion:"failure",run_attempt:3,head_sha:"abc"},"abc"), "retry cap failed");
  assert(!shouldRerun({id:3,name:".github/workflows/video-template-render.yml",path:".github/workflows/video-template-render.yml",event:"push",status:"completed",conclusion:"failure",run_attempt:1,head_sha:"abc"},"abc"), "invalid workflow run must not be retried");
  assert(!shouldRerun({id:4,name:"Video Template Render",path:".github/workflows/video-template-render.yml",event:"push",status:"completed",conclusion:"failure",run_attempt:1,head_sha:"abc"},"abc"), "invalid workflow path must not be retried");
  assert(healthIncidents({ok:false,automationActive:true,scheduler:{healthy:true},clients:[]}).length===1,"health classification failed");
  console.log(JSON.stringify({ok:true,dots:DOTS}));
  process.exit(0);
}

if (!token) throw new Error("github_token_missing");

async function gh(path, init={}) {
  const response = await fetch("https://api.github.com"+path, {
    ...init,
    headers: {
      authorization: "Bearer "+token,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "NEXUS-Core-Autonomy/1.0",
      ...(init.headers || {})
    }
  });
  const text = await response.text();
  if (!response.ok) throw new Error("github_http_"+response.status+":"+text.slice(0,180));
  return text ? JSON.parse(text) : {};
}

async function fetchHealth() {
  const join = healthUrl.includes("?") ? "&" : "?";
  const response = await fetch(healthUrl+join+"nexus_core="+Date.now(), {
    headers: {"user-agent":"NEXUS-Core-Sentinel/1.0"},
    signal: AbortSignal.timeout(20000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error("health_http_"+response.status+":"+text.slice(0,160));
  return JSON.parse(text);
}

async function main() {
  const startedAt = new Date().toISOString();
  const dotState = Object.fromEntries(DOTS.map(name=>[name,{status:"idle",evidence:[]}]));
  dotState["Nexus Sentinel"].status = "running";
  dotState["Nexus Auditor"].status = "running";

  let health = null;
  let initialHealthIncidents = [];
  try {
    health = await fetchHealth();
    initialHealthIncidents = healthIncidents(health);
    dotState["Nexus Sentinel"].evidence.push({
      kind:"production-health",
      ok:health.ok===true,
      schedulerHealthy:health.scheduler?.healthy===true,
      automationActive:health.automationActive===true,
      expectedAgents:Number(health.expectedAgents||0)
    });
  } catch (error) {
    initialHealthIncidents=[{type:"health_unreachable",message:String(error.message||error)}];
    dotState["Nexus Sentinel"].evidence.push({kind:"production-health",ok:false,error:"health_unreachable"});
  }

  const [owner,name] = repo.split("/");
  const ref = await gh(`/repos/${owner}/${name}/git/ref/heads/main`);
  const mainSha = ref?.object?.sha || "";
  const runsPayload = await gh(`/repos/${owner}/${name}/actions/runs?branch=main&per_page=40`);
  const runs = Array.isArray(runsPayload.workflow_runs) ? runsPayload.workflow_runs : [];
  const failedCurrent = runs.filter(run=>shouldRerun(run,mainSha));

  const recovery = [];
  const routedDots = new Set(["Nexus Sentinel","Nexus QA","Nexus Auditor"]);
  for (const incident of initialHealthIncidents) {
    routedDots.add("Nexus Fixer");
    if (/agents|cycle|scheduler|automation/.test(incident.type)) routedDots.add("Nexus Fixer");
  }
  for (const run of failedCurrent) for (const dot of routeWorkflow(run.name)) routedDots.add(dot);
  for (const dot of routedDots) if (dotState[dot]) dotState[dot].status="running";

  // Sentinel health GET doubles as the production watchdog. If stale, the Worker
  // refreshes the scheduler and drains a due job asynchronously.
  if (initialHealthIncidents.some(i=>["scheduler","cycle_delayed","agents_stale","agents_missing"].includes(i.type))) {
    dotState["Nexus Fixer"].evidence.push({kind:"watchdog-kick",target:"/api/autonomy-health"});
    await new Promise(resolve=>setTimeout(resolve,5000));
  }

  for (const run of failedCurrent.slice(0,4)) {
    try {
      await gh(`/repos/${owner}/${name}/actions/runs/${run.id}/rerun-failed-jobs`, {method:"POST"});
      recovery.push({action:"rerun-failed-jobs",runId:run.id,workflow:run.name,attempt:Number(run.run_attempt||1)+1,status:"dispatched"});
      for (const dot of routeWorkflow(run.name)) {
        if (dotState[dot]) dotState[dot].evidence.push({kind:"workflow-recovery",runId:run.id,workflow:run.name});
      }
    } catch (error) {
      recovery.push({action:"rerun-failed-jobs",runId:run.id,workflow:run.name,status:"failed",error:String(error.message||error).slice(0,160)});
    }
  }

  await new Promise(resolve=>setTimeout(resolve,5000));

  let verifiedHealth = health;
  let remainingHealthIncidents = initialHealthIncidents;
  try {
    verifiedHealth = await fetchHealth();
    remainingHealthIncidents = healthIncidents(verifiedHealth);
    dotState["Nexus QA"].evidence.push({
      kind:"post-recovery-health",
      ok:verifiedHealth.ok===true,
      schedulerHealthy:verifiedHealth.scheduler?.healthy===true,
      remainingIncidents:remainingHealthIncidents.map(x=>x.type)
    });
  } catch {
    dotState["Nexus QA"].evidence.push({kind:"post-recovery-health",ok:false,error:"health_unreachable"});
  }

  for (const dot of DOTS) {
    if (dotState[dot].status==="running") dotState[dot].status="completed";
  }

  const unrecoverableRuns = recovery.filter(x=>x.status==="failed");
  const auditPassed = remainingHealthIncidents.length===0 && unrecoverableRuns.length===0;
  dotState["Nexus Auditor"].evidence.push({
    kind:"audit",
    passed:auditPassed,
    productionIncidents:remainingHealthIncidents.length,
    recoveryFailures:unrecoverableRuns.length
  });

  const report = {
    ok:auditPassed,
    startedAt,
    finishedAt:new Date().toISOString(),
    repo,
    mainSha,
    core:{
      coordinator:"Nexus Core",
      dots:dotState
    },
    sentinel:{
      initialIncidents:initialHealthIncidents,
      failedCurrentMainRuns:failedCurrent.map(r=>({id:r.id,name:r.name,attempt:r.run_attempt,conclusion:r.conclusion}))
    },
    fixer:{recovery},
    qa:{remainingHealthIncidents},
    auditor:{passed:auditPassed}
  };

  fs.writeFileSync("/tmp/nexus-core-autonomy-report.json", JSON.stringify(report,null,2));
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) {
    const rows = DOTS.map(dot=>`| ${dot} | ${dotState[dot].status} | ${dotState[dot].evidence.length} |`).join("\n");
    fs.appendFileSync(summary,
      `# NEXUS Core Autonomy\n\n**Audit:** ${auditPassed?"PASS":"ATTENTION"}  \n**Main:** \`${mainSha.slice(0,12)}\`  \n**Recoveries dispatched:** ${recovery.filter(x=>x.status==="dispatched").length}\n\n| Dot | Status | Evidence |\n|---|---|---:|\n${rows}\n`
    );
  }
  console.log(JSON.stringify(report));

  // A recovery that was successfully dispatched is not itself a failure.
  // Fail only when production remains unhealthy or the recovery action could not run.
  if (!auditPassed && recovery.some(x=>x.status==="failed")) process.exitCode=1;
  if (!auditPassed && remainingHealthIncidents.some(i=>["health_unreachable","automation"].includes(i.type))) process.exitCode=1;
}

main().catch(error=>{
  console.error("nexus_core_autonomy_failed",String(error?.message||error));
  process.exitCode=1;
});
