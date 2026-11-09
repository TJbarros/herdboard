import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register("./runtime/hooks.mjs", import.meta.url);
const { herdr } = await import("./runtime/herdr.mjs");
const { elements } = await import("./runtime/gpui.mjs");
const { default: Herdboard } = await import("../mods/herdboard/main.js");
let now, timers;
const cx = { spawn: f => f(cx), notify() {}, timer: { every: (ms, f) => timers.push({ ms, f }) } };
const flush = async () => { for (let i = 0; i < 4; i++) await new Promise(r => setImmediate(r)); };
function agent(address, cwd, machine = null, status = "working") {
  const i = herdr.agents.length + 1;
  const a = { address, pane: `p${i}`, tab: `tab${i}`, space: `s${i}`, status, title: "Task", tab_name: String(i), space_name: `Space ${i}` };
  herdr.agents.push(a);
  herdr.spaces.push({ id: a.space, machine, active: i === 1, tabs: [{ id: a.tab }] });
  herdr.panes.push({ pane: a.pane, tab: a.tab, terminal: address, cwd });
  herdr.terminals.push({ address, state: "live", created_ms: i });
  return a;
}
function board(width = 1280) { const b = new Herdboard(); b.init(null, cx); b.w = width; b.h = 200; return b; }
function draw(b) { elements.clear(); b.render(cx); }
function label(a) { return elements.get(`git-${a.address}`)?.children[0]; }
async function settle(call, stdout = "", code = 0) { call.resolve({ code, stdout, stderr: "" }); await flush(); }
beforeEach(t => {
  now = 100000; timers = [];
  t.mock.method(Date, "now", () => now);
  Object.assign(herdr, { agents: [], terminals: [], panes: [], spaces: [], props: {}, calls: [], execCalls: [], runs: [], shared: { "herdboard.lang": "en" }, layout: {} });
});

test("the card queries its own live directory and shows a successful worktree total", async () => {
  const a = agent("remote/t1", "/repo/sub", "remote");
  const b = board(); draw(b);
  assert.equal(label(a), "Worktree: unavailable");
  assert.equal(herdr.execCalls.length, 1);
  assert.deepEqual(herdr.execCalls[0].options, { cwd: "/repo/sub", on: "remote" });
  await settle(herdr.execCalls[0], "/repo/.git\n"); draw(b);
  assert.equal(herdr.execCalls.length, 2);
  await settle(herdr.execCalls[1], " M one\0?? second\0"); draw(b);
  assert.equal(label(a), "Worktree: 2 files");
  now += 10000; timers.find(t => t.ms === 1000).f(cx); draw(b);
  await settle(herdr.execCalls.at(-1), ""); draw(b);
  assert.equal(label(a), "Worktree: 0 files");
  now += 10000; draw(b);
  await settle(herdr.execCalls.at(-1), "", 128); draw(b);
  assert.equal(label(a), "Worktree: unavailable", "a later failure clears the successful clean result");
});

test("a replaced terminal cannot receive an in-flight result even in the same millisecond and directory", async () => {
  const a = agent("t1", "/repo");
  const b = board(); draw(b);
  await settle(herdr.execCalls[0], "/repo/.git\n"); draw(b);
  const old = herdr.execCalls[1];
  herdr.terminals[0].created_ms++;
  draw(b);
  await settle(old, " M old\0"); draw(b);
  assert.equal(label(a), "Worktree: unavailable");
  assert.equal(herdr.execCalls.length, 2, "replacement waits for the next bounded refresh");
  now += 10000; draw(b);
  await settle(herdr.execCalls[2], " M new\0?? another\0"); draw(b);
  assert.equal(label(a), "Worktree: 2 files");
});

test("hidden/re-shown failures retain their minimum retry interval", async () => {
  agent("t1", "/repo"); const b = board(); draw(b);
  herdr.execCalls[0].reject(new Error("disconnected")); await flush(); draw(b);
  herdr.layout = { id: "herdboard-cards", hidden: true }; draw(b);
  herdr.layout.hidden = false; draw(b);
  assert.equal(herdr.execCalls.length, 1);
  now += 10000; draw(b);
  assert.equal(herdr.execCalls.length, 2);
});

test("a board with no visible native height does not query before layout or while hidden by its parent", () => {
  agent("t1", "/repo"); const b = board(); b.h = 0; draw(b);
  for (const timer of timers) timer.f(cx);
  assert.equal(herdr.execCalls.length, 0);
});

test("many agents share discovery and subdirectories share one canonical status query", async () => {
  const agents = Array.from({ length: 40 }, (_, i) => agent(`t${i}`, i % 2 ? "/repo/a" : "/repo/b"));
  const b = board(); draw(b);
  assert.equal(herdr.execCalls.length, 2);
  for (const call of [...herdr.execCalls]) await settle(call, "/repo/.git\n");
  draw(b);
  assert.equal(herdr.execCalls.length, 3);
  await settle(herdr.execCalls[2], " M shared\0"); draw(b);
  assert.ok(agents.every(a => label(a) === "Worktree: 1 file"));
  assert.deepEqual(herdr.execCalls.map(c => c.args[0]), ["rev-parse", "rev-parse", "--no-optional-locks"]);
});

test("identical paths on different machines and linked worktrees retain separate totals", async () => {
  const local = agent("t1", "/repo", null), remote = agent("other/t1", "/repo", "other");
  const linked = agent("t3", "/linked", null);
  const b = board(); draw(b);
  assert.deepEqual(herdr.execCalls.map(c => c.options.on), [null, "other"]);
  await settle(herdr.execCalls[0], "/repo/.git\n");
  await settle(herdr.execCalls[1], "/repo/.git\n"); draw(b);
  for (const call of herdr.execCalls.filter(c => !c.settled)) await settle(call, call.options.on === null ? " M one\0" : "");
  draw(b);
  const discovery = herdr.execCalls.at(-1);
  assert.equal(discovery.options.cwd, "/linked");
  await settle(discovery, "/repo/.git/worktrees/linked\n"); draw(b);
  await settle(herdr.execCalls.at(-1), "?? x\0?? y\0"); draw(b);
  assert.deepEqual([label(local), label(remote), label(linked)], ["Worktree: 1 file", "Worktree: 0 files", "Worktree: 2 files"]);
});

test("directory and machine changes reject old responses and never route remote failures locally", async () => {
  const a = agent("remote/t1", "/old", "remote"); const b = board(); draw(b);
  const old = herdr.execCalls[0];
  herdr.panes[0].cwd = "/new"; draw(b);
  await settle(old, "/old/.git\n"); draw(b);
  assert.equal(herdr.execCalls.length, 2);
  await settle(herdr.execCalls[1], "/new/.git\n"); draw(b);
  const pending = herdr.execCalls.at(-1);
  herdr.spaces[0].machine = "second"; draw(b);
  await settle(pending, " M old\0"); draw(b);
  assert.equal(label(a), "Worktree: unavailable");
  herdr.execCalls.at(-1).reject(new Error("remote disconnected")); await flush(); draw(b);
  assert.ok(herdr.execCalls.every(c => c.options.on === "remote" || c.options.on === "second"));
  assert.equal(label(a), "Worktree: unavailable");
});

test("every attempted command obeys the physical limit through slow calls, repeats and failures", async () => {
  for (let i = 0; i < 8; i++) agent(`t${i}`, `/repo${i}`);
  const b = board(); draw(b);
  for (let i = 0; i < 100; i++) { now += 1000; timers.find(t => t.ms === 1000).f(cx); draw(b); }
  assert.equal(herdr.execCalls.length, 2, "a logical timeout never releases physical capacity");
  for (let i = 0; i < 16; i++) {
    assert.ok(herdr.execCalls.filter(c => !c.settled).length <= 2);
    const call = herdr.execCalls.find(c => !c.settled);
    assert.ok(call, `command ${i + 1} exists`);
    if (call.args[0] === "rev-parse") await settle(call, `${call.options.cwd}/.git\n`);
    else await settle(call, "", 1);
    draw(b);
  }
  assert.equal(herdr.execCalls.length, 16, "all discovery and status attempts are counted");
  for (let i = 0; i < 100; i++) draw(b);
  assert.equal(herdr.execCalls.length, 16);
});

for (const role of ["header", "pane", "terminals", "menu"]) test(`${role} never originates periodic Git queries`, () => {
  agent("t1", "/repo"); herdr.props.role = role;
  const b = board(); draw(b);
  assert.equal(herdr.execCalls.length, 0);
  assert.equal(timers.length, 0);
});

for (const hide of [
  () => { herdr.layout = { id: "herdboard-cards", hidden: true }; },
  () => { herdr.shared["herdboard.filter"] = "here"; herdr.spaces[0].active = false; },
  () => { herdr.spaces[0].tabs[0].settled = true; },
  () => { herdr.agents[0].status = "idle"; herdr.shared["herdboard.idleOpen"] = false; },
]) test("hidden, filtered, put-away or folded consumers originate no queries", () => {
  agent("t1", "/repo"); hide(); const b = board(); draw(b);
  for (const timer of timers) timer.f(cx);
  assert.equal(herdr.execCalls.length, 0);
});

test("a visible compact Idle entry consumes Git results and shows Portuguese worktree wording", async () => {
  const a = agent("t1", "/repo", null, "idle");
  herdr.shared["herdboard.idleOpen"] = false; herdr.shared["herdboard.lang"] = "pt";
  const b = board(760); draw(b);
  await settle(herdr.execCalls[0], "/repo/.git\n"); draw(b);
  await settle(herdr.execCalls[1], "?? one\0"); draw(b);
  assert.equal(label(a), "Worktree: 1 arquivo");
  assert.match(elements.get(`git-${a.address}`).props.tooltip[0], /qualquer pessoa/);
});

for (const invalidate of [
  () => { delete herdr.spaces[0].machine; },
  () => { herdr.spaces = []; },
  () => { delete herdr.panes[0].cwd; },
  () => { herdr.panes[0].terminal = "another"; },
  () => { herdr.terminals[0].state = "disconnected"; },
]) test("missing or disconnected context stays unavailable without a local/default-folder fallback", () => {
  const a = agent("t1", "/repo"); herdr.spaces[0].folder = "/fallback";
  invalidate(); const b = board(); draw(b);
  assert.equal(herdr.execCalls.length, 0);
  assert.equal(label(a), "Worktree: unavailable");
});
