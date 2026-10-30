// Roteador de IA grátis do Nexus (lista: github.com/mnfst/awesome-free-llm-apis).
// Tenta um provedor grátis de cada vez. Se um falhar ou bater o limite, passa para o próximo.
// Só usa provedor que tem chave cadastrada no Cloudflare. O último é o Workers AI (já ligado, sem chave).
// Provedores que guardam as conversas sem chave (Kilo, LLM7 anônimo) ficam de fora de propósito:
// o WhatsApp tem dados de clientes.

export const FREE_PROVIDERS = {
  groq: {
    keyName: "GROQ_API_KEY",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "openai/gpt-oss-120b"
  },
  gemini: {
    keyName: "GEMINI_API_KEY",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-2.5-flash"
  },
  openrouter: {
    keyName: "OPENROUTER_API_KEY",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "openrouter/free"
  },
  mistral: {
    keyName: "MISTRAL_API_KEY",
    url: "https://api.mistral.ai/v1/chat/completions",
    model: "mistral-small-latest"
  },
  nvidia: {
    keyName: "NVIDIA_API_KEY",
    url: "https://integrate.api.nvidia.com/v1/chat/completions",
    model: "openai/gpt-oss-20b"
  },
  cloudflare: {
    binding: "AI",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast"
  }
};

export const DEFAULT_ORDER = ["groq", "gemini", "openrouter", "mistral", "nvidia", "cloudflare"];

function modelFor(env, name) {
  const custom = String(env?.["FREE_LLM_" + name.toUpperCase() + "_MODEL"] || "").trim();
  return custom || FREE_PROVIDERS[name].model;
}

function configured(env, name) {
  const p = FREE_PROVIDERS[name];
  if (!p) return false;
  if (p.binding) return Boolean(env?.[p.binding]);
  return Boolean(String(env?.[p.keyName] || "").trim());
}

export function providerOrder(env, order) {
  const raw = order || String(env?.FREE_LLM_ORDER || "").split(",");
  const list = (Array.isArray(raw) ? raw : DEFAULT_ORDER)
    .map(s => String(s).trim().toLowerCase())
    .filter(s => FREE_PROVIDERS[s]);
  return [...new Set(list.length ? list : DEFAULT_ORDER)];
}

// Para o painel: mostra quais provedores estão prontos (nunca mostra a chave).
export function freeLlmStatus(env) {
  return providerOrder(env).map(name => ({
    provider: name,
    ready: configured(env, name),
    model: modelFor(env, name),
    needs: FREE_PROVIDERS[name].keyName || "binding " + FREE_PROVIDERS[name].binding
  }));
}

function messagesFrom({ system, user, messages }) {
  if (Array.isArray(messages) && messages.length) return messages;
  const out = [];
  if (system) out.push({ role: "system", content: String(system) });
  out.push({ role: "user", content: String(user || "") });
  return out;
}

async function callOpenAICompatible(env, name, messages, opts, fetcher) {
  const p = FREE_PROVIDERS[name];
  const res = await fetcher(p.url, {
    method: "POST",
    headers: {
      authorization: "Bearer " + String(env[p.keyName]).trim(),
      "content-type": "application/json",
      accept: "application/json",
      "user-agent": "Servidor-Nexus/1.0"
    },
    body: JSON.stringify({
      model: modelFor(env, name),
      messages,
      max_tokens: opts.maxTokens,
      temperature: opts.temperature
    }),
    signal: AbortSignal.timeout(opts.timeoutMs)
  });
  if (!res.ok) throw new Error(name + "_http_" + res.status);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content;
  return typeof text === "string" ? text : "";
}

async function callCloudflare(env, messages, opts) {
  const run = env.AI.run(modelFor(env, "cloudflare"), {
    messages, max_tokens: opts.maxTokens, temperature: opts.temperature
  });
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error("cloudflare_timeout")), opts.timeoutMs); });
  try {
    const out = await Promise.race([run, timeout]);
    return typeof out?.response === "string" ? out.response : JSON.stringify(out?.response ?? "");
  } finally {
    clearTimeout(timer);
  }
}

// Pede uma resposta de texto. Devolve { text, provider, model, tried }.
// Se todos falharem, lança erro "free_llm_all_failed" com a lista do que foi tentado.
export async function freeChat(env, request = {}, { fetcher = fetch, order } = {}) {
  const messages = messagesFrom(request);
  const opts = {
    maxTokens: Math.max(64, Math.min(4000, Number(request.maxTokens) || 800)),
    temperature: Number.isFinite(Number(request.temperature)) ? Number(request.temperature) : 0.7,
    timeoutMs: Math.max(5000, Math.min(90000, Number(request.timeoutMs) || 30000))
  };
  const tried = [];
  for (const name of providerOrder(env, order)) {
    if (!configured(env, name)) continue;
    try {
      const text = name === "cloudflare"
        ? await callCloudflare(env, messages, opts)
        : await callOpenAICompatible(env, name, messages, opts, fetcher);
      if (String(text || "").trim()) return { text: String(text), provider: name, model: modelFor(env, name), tried };
      tried.push(name + ":vazio");
    } catch (error) {
      tried.push(name + ":" + String(error?.message || error).slice(0, 60));
    }
  }
  const error = new Error("free_llm_all_failed");
  error.tried = tried;
  throw error;
}
