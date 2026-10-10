const RECOVERABLE = new Set(["NEXUS CI","NEXUS Overnight Regression","Deploy NEXUS Cloudflare"]);
const BAD_CONCLUSIONS = new Set(["failure","timed_out"]);
const SAFE_PATH = /^(?:cloudflare\/(?:src\/[a-z0-9-]+\.js|test\/[a-z0-9-]+\.test\.mjs)|public\/[a-z0-9-]+\.js|scripts\/test_[a-z0-9_-]+\.py)$/;
const SENSITIVE_PATH = /(?:auth|credential|secret|publisher|payment|token|security|policy|emergency|master|instagram|meta|oauth|permission)/i;
const SECURITY_TEXT = /(?:authorization|bearer|password|token|secret|api.?key|github|workflow|process\.env|eval\s*\(|new Function|child_process|execSync|spawnSync|fetch\s*\(|https?:\/\/|media_publish|publishingGate|approvalRequired|visualApproval|qualityGates|callbackToken|retryCount|CLIENT_SECRET|GH_TOKEN)/i;

export function recoverableRun(run, mainSha, now = Date.now()) {
  if (!run || run.head_sha !== mainSha || run.head_branch !== "main") return false;
  if (!RECOVERABLE.has(run.name) || !BAD_CONCLUSIONS.has(run.conclusion)) return false;
  if (run.status !== "completed" || Number(run.run_attempt || 1) !== 1) return false;
  if (!["push","schedule","workflow_run"].includes(run.event)) return false;
  const completed = Date.parse(run.updated_at || run.created_at || "");
  return Number.isFinite(completed) && now - completed >= 20 * 60 * 1000;
}

export function healthIncidents(data = {}, instagram = {}) {
  const issues = [];
  if (data.ok !== true || data.scheduler?.healthy !== true || data.automationActive !== true) {
    issues.push({type:"worker_or_cron_unhealthy", component:"Cloudflare", details:"Worker or scheduler health not healthy"});
  }
  const managed = ["globalplay-streaming","ragnar-one"];
  for (const clientId of managed) {
    const row = (data.clients || []).find(x => x.clientId === clientId);
    if (!row || row.cycleHealth?.cycleOverdue === true || row.cycleHealth?.status === "failed") {
      issues.push({type:"agent_cycle",clientId,details:"Managed client cycle missing, failed, or overdue"});
    }
    const conn = (instagram.clients || []).find(x => x.clientId === clientId);
    if (!conn || conn.connected !== true || conn.tokenValid !== true || conn.accountMatches !== true) {
      issues.push({type:"instagram_credentials",clientId,details:"Instagram connection needs human authorization or investigation"});
    }
  }
  return issues;
}

export function eligibleCodePatch(path, oldText, newText, original) {
  if (typeof path !== "string" || !SAFE_PATH.test(path) || SENSITIVE_PATH.test(path)) return {ok:false,reason:"path_not_allowlisted"};
  if (typeof oldText !== "string" || typeof newText !== "string" || !oldText.trim() || !newText.trim()) return {ok:false,reason:"empty_patch"};
  if (oldText.length > 1200 || newText.length > 1600 || oldText === newText) return {ok:false,reason:"patch_size_or_noop"};
  if (SECURITY_TEXT.test(oldText) || SECURITY_TEXT.test(newText)) return {ok:false,reason:"safety_gate"};
  if (typeof original !== "string" || original.split(oldText).length !== 2) return {ok:false,reason:"nonunique_context"};
  return {ok:true,reason:""};
}

export function scrubLog(value) {
  return String(value || "")
    .replace(/(?:gh[pousr]_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{15,}|sk-[A-Za-z0-9_-]{18,})/g,"[REDACTED]")
    .replace(/(Bearer\s+)[^\s"']+/gi,"$1[REDACTED]")
    .replace(/([?&](?:token|key|access_token|signature)=)[^&\s]+/gi,"$1[REDACTED]")
    .replace(/(password|secret|api[_-]?key|access[_-]?token|gh[_-]?token)\s*[:=]\s*["']?[^\s"']+/gi,"$1=[REDACTED]")
    .slice(-12000);
}

export function incidentKey(kind, id) {
  return "[NEXUS AutoFix] " + String(kind).replace(/[^a-z0-9_-]/gi,"_").slice(0,40) + " " + String(id).replace(/[^a-z0-9_-]/gi,"_").slice(0,55);
}
