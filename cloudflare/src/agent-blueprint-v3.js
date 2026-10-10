export const NEXUS_AGENT_SYSTEM_VERSION = "nexus-agent-system-v3-seven";

export const NEXUS_COORDINATOR_ID = "odin";

export const NEXUS_AUTONOMY_CONTRACT = Object.freeze({
  mode: "autonomous",
  memoryRequired: true,
  legacyFallbackAllowed: false,
  silentFallbackAllowed: false,
  publishRequiresValidatedArtifact: true,
  defaultPublishMode: "dry-run",
  principle: "Master defines goals and limits; agents decide execution, review each other and advance only with evidence."
});

export const AGENT_CORE_MODULES = Object.freeze([
  {
    id:"odin", name:"ODIN", role:"coordinator", reportsTo:null,
    skills:["orchestration","delegation","memory-routing","cycle-supervision","conflict-resolution"],
    mission:"Read active memory and goals, delegate the cycle, resolve conflicts and block any step without evidence."
  },
  {
    id:"radar", name:"RADAR", role:"worker", reportsTo:"odin",
    skills:["research","instagram-signals","performance-analysis","trend-validation","growth-feedback"],
    mission:"Read real account signals and recent history, find opportunities, detect repetition and feed evidence to strategy."
  },
  {
    id:"estrategista", name:"ESTRATEGISTA", role:"worker", reportsTo:"odin",
    skills:["campaign-planning","format-allocation","audience-angle","experiment-design","memory-application"],
    mission:"Turn goals, memory and Radar evidence into the creative plan while respecting locked schedule and format constraints."
  },
  {
    id:"creator", name:"CREATOR", role:"worker", reportsTo:"odin",
    skills:["concept","hook","story","caption","cta","carousel-script","reel-script"],
    mission:"Create the original concept, story, copy and scene plan autonomously. Never reuse legacy scripts or generic filler."
  },
  {
    id:"designer", name:"DESIGNER", role:"worker", reportsTo:"odin",
    skills:["visual-direction","brand-layout","image-generation","carousel-assembly","reel-assembly","format-builder"],
    mission:"Turn the approved concept into the exact visual format, with brand, hierarchy, continuity and no hidden fallback."
  },
  {
    id:"qa-recovery", name:"QA/RECOVERY", role:"worker", reportsTo:"odin",
    skills:["copy-review","visual-review","audit","anti-repeat","policy","recovery","incident-triage"],
    mission:"Independently reject weak, repeated, legacy or malformed output and send it back to the responsible agent before release."
  },
  {
    id:"publisher", name:"PUBLISHER", role:"worker", reportsTo:"odin",
    skills:["schedule","instagram-delivery","artifact-integrity","post-publish-verification"],
    mission:"Publish only the exact validated artifact. Never regenerate, reinterpret, replace or fallback."
  }
]);

export const NEXUS_WORKER_MODULES = Object.freeze(
  AGENT_CORE_MODULES.filter(module => module.id !== NEXUS_COORDINATOR_ID)
);
