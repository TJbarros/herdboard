// Working activity through the real mod, with controlled Herdr/time boundaries.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
register("./runtime/hooks.mjs", import.meta.url);
const { herdr } = await import("./runtime/herdr.mjs");
const { elements } = await import("./runtime/gpui.mjs");
const { default: Herdboard } = await import("../mods/herdboard/main.js");
const SCREEN = readFileSync(new URL("./fixtures/activity/claude-code-2.1.319/working-wide.txt", import.meta.url), "utf8");
const TERMINAL = JSON.parse(readFileSync(new URL("./fixtures/activity/claude-code-2.1.319/working-wide.json", import.meta.url), "utf8"));
const timers = [];
const cx = { spawn: f => f(cx), notify() {}, timer: { every: (ms, f) => timers.push({ ms, f }) } };
const strings = values => values.flatMap(v => typeof v === "string" ? [v] : strings(v?.data?.children ?? []));
function render(b) { elements.clear(); b.render(cx); }
function resize(height, width = 1236) { elements.get("herdboard-root").props.on_size_change[0]({ width, height }, cx); }
function board(height = 358) {
  const b = new Herdboard(); b.init(null, cx);
  if (!herdr.props.role) { render(b); resize(height); }
  return b;
}
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)); };
async function settle(call, stdout = SCREEN, code = 0) { call.settled = true; call.resolve({ stdout, code }); await flush(); }
function terminal(address = "t1") { return { ...structuredClone(TERMINAL), address }; }
function advance(t, ms) { t.mock.timers.tick(ms); for (const timer of timers) timer.f(cx); }
beforeEach(t => {
  t.mock.timers.enable({ apis: ["Date"], now: 100000 });
  herdr.agents = [{ address: "t1", app: "claude-code", status: "working", seq: 1, space: "s1", tab: "tab1", pane: "p1", title: "Read a project", space_name: "Test", tab_name: "1" }];
  herdr.terminals = []; herdr.props = {}; herdr.shared = {}; herdr.layout = { id: "herdboard-cards", hidden: false };
  herdr.spaces = [{ id: "s1", active: true, tabs: [{ id: "tab1", name: "1", active: true }] }];
  herdr.panes = [{ pane: "p1", terminal: "t1", tab: "tab1" }];
  herdr.calls.length = 0; herdr.runs.length = 0; timers.length = 0;
});
test("Working cards wait for a positive native board height before reading", async t => {
  herdr.terminals = [terminal()];
  const b = board(0); render(b);
  advance(t, 10000); render(b);
  assert.equal(herdr.calls.length, 0, "a present layout node is insufficient before the board has visible height");
  resize(358); render(b);
  assert.deepEqual(herdr.calls.map(c => c.args), [["read", "t1", "--lines", "0"]]);
  await settle(herdr.calls[0]); render(b);
  assert.ok(strings(elements.get("activity-t1").children).includes("Aguarda 40s e imprime marcador de captura"));
});
test("Working cards show a translated neutral activity when no terminal is available, in both layouts", () => {
  const b = board();
  for (const [language, label, fallback] of [["en", "Doing now", "Activity unavailable"], ["pt", "Fazendo agora", "Atividade indisponível"]]) {
    herdr.shared["herdboard.lang"] = language;
    for (const width of [1236, 980, 716]) {
      resize(358, width); render(b);
      assert.deepEqual(strings(elements.get("activity-t1")?.children ?? []), [label, fallback]);
      assert.ok(elements.get("agent-t1").props.h[0] >= 86, "the card reserves room for its activity line");
    }
  }
  assert.equal(herdr.calls.length, 0, "missing terminals must not create read attempts");
});
test("visible Working cards read automatically at most once per five seconds and preserve full addresses", async t => {
  herdr.agents[0].address = "remote/t1";
  herdr.terminals = [terminal("remote/t1")];
  const b = board(); render(b);
  assert.deepEqual(herdr.calls.map(c => c.args), [["read", "remote/t1", "--lines", "0"]]);
  for (let i = 0; i < 50; i++) render(b);
  await settle(herdr.calls[0]); render(b);
  assert.ok(strings(elements.get("activity-remote/t1").children).includes("Aguarda 40s e imprime marcador de captura"));
  assert.equal(elements.get("activity-text-remote/t1").props.tooltip[0], "Aguarda 40s e imprime marcador de captura");
  advance(t, 4999); render(b); assert.equal(herdr.calls.length, 1);
  advance(t, 1); assert.equal(herdr.calls.length, 2);
  await settle(herdr.calls[1], "", 1); render(b);
  assert.ok(strings(elements.get("activity-remote/t1").children).includes("Atividade indisponível"));
  for (let i = 0; i < 50; i++) render(b);
  assert.equal(herdr.calls.length, 2, "failed reads do not retry on render");
});
test("a stalled physical read keeps its slot but expires previously observed activity", async t => {
  herdr.terminals = [terminal()];
  const b = board(); render(b); await settle(herdr.calls[0]); render(b);
  assert.ok(strings(elements.get("activity-t1").children).includes("Aguarda 40s e imprime marcador de captura"));
  advance(t, 5000); assert.equal(herdr.calls.length, 2);
  for (let i = 0; i < 10; i++) { advance(t, 1000); render(b); }
  assert.equal(herdr.calls.length, 2, "a slow physical read must never be duplicated");
  assert.ok(strings(elements.get("activity-t1").children).includes("Atividade indisponível"), "an old snapshot is unavailable after ten seconds even when the replacement read hangs");
  herdr.calls[1].reject(new Error("disconnected")); await flush(); render(b);
  assert.equal(herdr.calls.length, 2, "rejection cannot trigger an immediate retry");
  advance(t, 4999); assert.equal(herdr.calls.length, 2);
  advance(t, 1); assert.equal(herdr.calls.length, 3);
});
for (const [name, change] of [
  ["new turn", () => herdr.terminals[0].turn++],
  ["same-address terminal replacement", () => herdr.terminals[0].created_ms++],
  ["foreground replacement", () => herdr.terminals[0].foreground.pid++],
  ["working report revision", () => herdr.agents[0].seq++],
  ["agent association", () => herdr.agents[0].pane = "p2"],
]) test(`${name} discards the old value and late result without duplicating a pending address`, async t => {
  herdr.terminals = [terminal()];
  const b = board(); render(b); await settle(herdr.calls[0]);
  advance(t, 5000); assert.equal(herdr.calls.length, 2);
  change(); render(b);
  assert.ok(strings(elements.get("activity-t1").children).includes("Atividade indisponível"));
  advance(t, 10000); render(b);
  assert.equal(herdr.calls.length, 2, "the old physical read still owns its address");
  await settle(herdr.calls[1]); render(b);
  assert.ok(strings(elements.get("activity-t1").children).includes("Atividade indisponível"), "a late old-lifecycle result cannot refill the card");
  advance(t, 5000); assert.equal(herdr.calls.length, 3);
  await settle(herdr.calls[2]); render(b);
  assert.ok(strings(elements.get("activity-t1").children).includes("Aguarda 40s e imprime marcador de captura"));
});
for (const [name, hide, show] of [
  ["filter", () => { herdr.shared["herdboard.filter"] = "here"; herdr.spaces[0].active = false; }, () => herdr.spaces[0].active = true],
  ["put-away", () => herdr.spaces[0].tabs[0].settled = true, () => herdr.spaces[0].tabs[0].settled = false],
  ["expanded board", () => herdr.layout.hidden = true, () => herdr.layout.hidden = false],
  ["hidden ancestor", () => herdr.layout = { hidden: true, children: [herdr.layout] }, () => herdr.layout.hidden = false],
  ["different layout", () => herdr.layout = { id: "main" }, () => herdr.layout = { id: "herdboard-cards" }],
  ["zero native board height", () => resize(0), () => resize(358)],
  ["non-Working status", () => herdr.agents[0].status = "done", () => herdr.agents[0].status = "working"],
  ["removed terminal", () => herdr.terminals = [], () => herdr.terminals = [terminal()]],
]) test(`${name} stops reads and invalidates late responses before the card returns`, async t => {
  herdr.terminals = [terminal()]; const b = board(); render(b);
  hide(); render(b);
  advance(t, 20000); assert.equal(herdr.calls.length, 1);
  await settle(herdr.calls[0]); render(b);
  show(); render(b);
  assert.ok(strings(elements.get("activity-t1").children).includes("Atividade indisponível"));
  assert.equal(herdr.calls.length, 1, "returning cards still respect completion cooldown");
  advance(t, 5000); assert.equal(herdr.calls.length, 2);
});
for (const role of ["header", "menu", "terminals", "pane"]) test(`${role} instances originate no activity reads or periodic work`, t => {
  herdr.props = { role }; herdr.terminals = [terminal()];
  const b = board(); render(b); advance(t, 30000); render(b);
  assert.equal(herdr.calls.length, 0); assert.equal(timers.length, 0);
});
test("twenty consumers count every attempt, share two slots, and cannot queue obsolete cards", async t => {
  herdr.agents = Array.from({ length: 20 }, (_, i) => ({ ...herdr.agents[0], address: `t${i+1}` }));
  herdr.terminals = herdr.agents.map(a => terminal(a.address));
  const b = board(); render(b);
  let peak = 0;
  const pending = () => herdr.calls.filter(c => !c.settled);
  for (let i = 0; i < 20; i++) {
    for (let n = 0; n < 10; n++) render(b);
    peak = Math.max(peak, pending().length);
    assert.ok(pending().length <= 2, "every attempted hc read counts against the physical limit");
    assert.equal(new Set(pending().map(c => c.args[1])).size, pending().length, "no address overlaps");
    assert.ok(herdr.calls.length <= Math.min(20, i + 2), "renders cannot add excess attempts");
    await settle(pending()[0], i % 2 ? "" : SCREEN, i % 2 ? 1 : 0);
  }
  assert.equal(herdr.calls.length, 20); assert.equal(peak, 2);
  advance(t, 4999); assert.equal(herdr.calls.length, 20);
  advance(t, 1); assert.equal(herdr.calls.length, 22);
  // Hide eighteen queued consumers while the other two physical reads are pending.
  herdr.agents = herdr.agents.slice(0, 2); render(b);
  await settle(pending()[1]); await settle(pending()[0]);
  assert.equal(herdr.calls.length, 22, "obsolete consumers never survive as a stored queue");
});
test("long original activity is available in its tooltip and failure in one terminal leaves another usable", async () => {
  herdr.agents.push({ ...herdr.agents[0], address: "remote/t1", title: "Another task" });
  herdr.terminals = [terminal(), terminal("remote/t1")];
  const b = board(); render(b);
  const long = "Examining an original accented ação with enough detail to extend beyond the available card width and remain readable on hover";
  await settle(herdr.calls[0], SCREEN.replace("Aguarda 40s e imprime marcador de captura · 7s", `${long} · 7s`));
  herdr.calls[1].settled = true; herdr.calls[1].reject(new Error("remote disconnected")); await flush();
  render(b);
  assert.equal(elements.get("activity-text-t1").props.tooltip[0], long);
  assert.ok(strings(elements.get("activity-t1").children).includes(long));
  assert.ok(strings(elements.get("activity-remote/t1").children).includes("Atividade indisponível"));
});
test("the captured Codex launch with an initial task also receives bounded activity reads", async () => {
  herdr.agents[0].app = "codex";
  const t = JSON.parse(readFileSync(new URL("./fixtures/activity/codex-0.167.0/initial-task-wide.json", import.meta.url), "utf8"));
  t.address = "t1"; herdr.terminals = [t];
  const b = board(); render(b);
  assert.equal(herdr.calls.length, 1, "Herdr's initial task argument is a captured launch shape");
  await settle(herdr.calls[0], readFileSync(new URL("./fixtures/activity/codex-0.167.0/initial-task-wide.txt", import.meta.url), "utf8"));
  render(b); assert.ok(strings(elements.get("activity-t1").children).includes("Working"));
});
for (const [name, hide, show] of [
  ["layout visibility", () => herdr.layout.hidden = true, () => herdr.layout.hidden = false],
  ["native board height", () => resize(0), () => resize(358)],
]) test(`deferred spawns recheck ${name} and lifecycle before originating any screen read`, async () => {
  herdr.terminals = [terminal()];
  const original = cx.spawn, queued = [];
  cx.spawn = f => queued.push(f);
  try {
    const b = board(); render(b);
    assert.equal(herdr.calls.length, 0, "the executor has not dispatched the spawn yet");
    hide();
    queued.shift()(cx);
    await flush();
    assert.equal(herdr.calls.length, 0, "hidden cards cannot dispatch a previously scheduled read");
    show();
    herdr.terminals[0].turn++;
    render(b);
    assert.equal(queued.length, 1);
    while (queued.length) {
      herdr.agents[0].status = "done";
      await queued.shift()(cx);
    }
    assert.equal(herdr.calls.length, 0, "a queued previous lifecycle must not dispatch either");
  } finally { cx.spawn = original; }
});
