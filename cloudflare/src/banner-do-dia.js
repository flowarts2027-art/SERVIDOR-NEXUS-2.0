import { movies, series } from "./providers/movies.js";
const day = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const hour = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  hour: "2-digit",
  minute: "2-digit",
});
const reply = (data, status = 200) =>
  Response.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
async function source(url, headers = {}, ttl = 900) {
  const result = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(24000),
    cf: { cacheEverything: true, cacheTtl: ttl },
  });
  if (!result.ok) throw Error("provider");
  return result.json();
}
async function sports(kind, key) {
  const base =
    "https://www.thesportsdb.com/api/v1/json/" + encodeURIComponent(key) + "/";
  const today = day.format(new Date());
  const tomorrow = new Date(today + "T12:00:00Z");
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const dates = [today, tomorrow.toISOString().slice(0, 10)];
  // The daily feed can be truncated. Query the featured competitions separately.
  const leagues = [
    "Brazilian Serie A",
    "Copa Libertadores",
    "Copa do Brasil",
    "UEFA Champions League",
    "English Premier League",
    "Spanish La Liga",
    "Italian Serie A",
    "German Bundesliga",
    "French Ligue 1",
  ];
  const filters =
    kind === "football"
      ? leagues
          .map((l) => "&l=" + encodeURIComponent(l))
          .concat("&s=Soccer")
      : ["&s=Fighting", ""];
  const pages = await Promise.all(
    dates.flatMap((d) =>
      filters.map((filter) => source(base + "eventsday.php?d=" + d + filter)),
    ),
  );
  const rows = new Map();
  for (const e of pages.flatMap((p) => p.events || [])) {
    if ((e.strSport === "Soccer") !== (kind === "football")) continue;
    const stamp =
      e.strTimestamp || (e.strTime && e.dateEvent + "T" + e.strTime);
    if (!stamp) continue;
    const time = new Date(
      /(Z|[+-]\d\d:\d\d)$/i.test(stamp) ? stamp : stamp + "Z",
    );
    if (!Number.isFinite(+time) || day.format(time) !== today) continue;
    rows.set(e.idEvent, {
      title:
        e.strHomeTeam && e.strAwayTeam
          ? e.strHomeTeam + " × " + e.strAwayTeam
          : e.strEvent,
      meta: e.strLeague,
      body: hour.format(time) + " • Brasília",
      date: today.split("-").reverse().join("/"),
      time: +time,
      teams: [e.idHomeTeam, e.idAwayTeam],
    });
  }
  return [...rows.values()].sort((a, b) => a.time - b.time);
}
export async function bannerDoDia(request, env, url, id) {
  const subscribers = String(env.BANNER_DO_DIA_CLIENTES || "")
    .split(",")
    .map((value) => value.trim());
  if (!subscribers.includes(String(id)))
    return reply(
      { error: "Banner do Dia não está ativo para esta conta." },
      403,
    );
  const action = url.pathname.slice("/api/portal/banner/".length);
  try {
    if (action === "logo") {
      const path = "banner-do-dia/logos/" + encodeURIComponent(id) + ".png";
      if (request.method === "PUT") {
        if (
          request.headers.get("Origin") !== url.origin ||
          request.headers.get("Content-Type") !== "image/png"
        )
          return reply({}, 403);
        if (Number(request.headers.get("Content-Length")) > 1048576)
          return reply({}, 413);
        const bytes = new Uint8Array(await request.arrayBuffer());
        if (
          bytes.length > 1048576 ||
          ![137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => v === bytes[i])
        )
          return reply({}, 422);
        await env.MEDIA.put(path, bytes);
        return reply({ ok: true });
      }
      if (request.method === "GET") {
        const obj = await env.MEDIA.get(path);
        return new Response(obj?.body || null, {
          status: obj ? 200 : 204,
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
    }
    if (request.method !== "GET") return reply({}, 405);
    if (action === "movies" || action === "series") {
      const q = (url.searchParams.get("q") || "").trim();
      if (q.length < 2 || q.length > 100)
        return reply({ error: "Digite de 2 a 100 caracteres." }, 400);
      return reply(await (action === "movies" ? movies : series)(q, source));
    }
    if (action === "football" || action === "sports")
      return reply(await sports(action, env.THESPORTSDB_KEY || "123"));
    if (action === "colors") {
      const ids = (url.searchParams.get("ids") || "").split(",");
      if (ids.length !== 2 || !ids.every((x) => /^\d{1,12}$/.test(x)))
        return reply([]);
      return reply(
        await Promise.all(
          ids.map(async (id) => {
            const data = await source(
              "https://www.thesportsdb.com/api/v1/json/" +
                encodeURIComponent(env.THESPORTSDB_KEY || "123") +
                "/lookupteam.php?id=" +
                id,
              {},
              86400,
            );
            return data.teams?.[0]?.strColour1 || null;
          }),
        ),
      );
    }
    return reply({}, 404);
  } catch {
    return reply(
      { error: "Serviço indisponível no momento. Tente novamente." },
      502,
    );
  }
}
