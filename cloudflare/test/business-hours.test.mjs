import test from "node:test";
import assert from "node:assert/strict";
import { parseOsmHours, googleHours, hoursStatus, COMMERCIAL_WEEK, readWeek } from "../src/business-hours.js";

// Domingo 18/10/2026 10:30 em Brasília = 13:30 UTC.
const SUN_1030 = new Date("2026-10-18T13:30:00Z");

test("lê horários do mapa (OSM)", () => {
  const w = parseOsmHours("Mo-Fr 08:00-18:00; Sa 08:00-12:00");
  assert.deepEqual(w[1], [[480, 1080]]);
  assert.deepEqual(w[6], [[480, 720]]);
  assert.deepEqual(w[0], []);
  assert.deepEqual(parseOsmHours("Tu-Su 18:00-02:00")[2], [[1080, 1560]]);
  assert.equal(parseOsmHours("24/7")[3][0][1], 1440);
  assert.equal(parseOsmHours("bagunça"), null);
  assert.equal(parseOsmHours(""), null);
});

test("pizzaria fechada no domingo de manhã: abre hoje às 18:00", () => {
  const s = hoursStatus(parseOsmHours("Tu-Su 18:00-23:30"), SUN_1030);
  assert.equal(s.openNow, false);
  assert.equal(s.label, "Fechada · abre hoje às 18:00");
  assert.equal(s.nextOpenAt, "2026-10-18T21:00:00.000Z");
  assert.equal(s.nextOpenDay, "2026-10-18");
});

test("sem horário conhecido: domingo fora do comercial, abre amanhã às 09:00", () => {
  const s = hoursStatus(null, SUN_1030);
  assert.equal(s.openNow, false);
  assert.equal(s.guessed, true);
  assert.match(s.label, /abre amanhã às 09:00/);
  assert.equal(s.nextOpenDay, "2026-10-19");
});

test("aberta agora e madrugada que passa da meia-noite", () => {
  assert.equal(hoursStatus(parseOsmHours("Mo-Su 08:00-20:00"), SUN_1030).openNow, true);
  // segunda 01:00 Brasília, bar de domingo 18:00-02:00
  assert.equal(hoursStatus(parseOsmHours("Su 18:00-02:00"), new Date("2026-10-19T04:00:00Z")).openNow, true);
});

test("horário do Google", () => {
  const w = googleHours({ periods: [{ open: { day: 1, hour: 9, minute: 0 }, close: { day: 1, hour: 17, minute: 30 } }] });
  assert.deepEqual(w[1], [[540, 1050]]);
  assert.equal(hoursStatus(w, SUN_1030).label, "Fechada · abre amanhã às 09:00");
  assert.equal(googleHours({}), null);
  assert.deepEqual(readWeek(JSON.stringify(COMMERCIAL_WEEK)), COMMERCIAL_WEEK);
  assert.equal(readWeek("x"), null);
});
