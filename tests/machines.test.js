// Machine ownership and full identities through the real mod's Herdr/GPUI boundary.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
register("./runtime/hooks.mjs", import.meta.url);
const { herdr } = await import("./runtime/herdr.mjs");
const { clicks, elements } = await import("./runtime/gpui.mjs");
const { default: Herdboard } = await import("../mods/herdboard/main.js");

const timers = [];
const cx = { spawn: f => f(cx), notify() {}, stop_propagation() {},
  timer: { every: (ms, f) => timers.push({ ms, f }) }, sleep: () => new Promise(() => {}) };
const agent = (address, space, tab, extra = {}) => ({ address, space, tab, pane: `${address}-pane`,
  space_name: "Project", tab_name: "1", title: "Implement task", status: "working", seq: 1,
  program: { name: "Claude Code", key: "claude-code" }, ...extra });
const space = (id, machine, tab, active = false) => ({ id, machine, name: "Project", active,
  tabs: [{ id: tab, name: "1", active: true }] });
const strings = values => values.flatMap(v => typeof v === "string" ? [v] : strings(v?.data?.children ?? []));
function board() { const b = new Herdboard(); b.init(null, cx); return b; }
function render(b) { clicks.clear(); elements.clear(); return b.render(cx); }
const text = id => strings(elements.get(id)?.children ?? []).join(" ");
function click(id) { assert.ok(clicks.has(id), `missing ${id}`); clicks.get(id)({}, cx); }

beforeEach(() => {
  herdr.agents = [agent("t1", "s1", "tab1")];
  herdr.spaces = [space("s1", null, "tab1", true)];
  herdr.terminals = []; herdr.panes = []; herdr.props = {};
  herdr.shared = { "herdboard.lang": "en" };
  herdr.calls.length = 0; herdr.runs.length = 0; timers.length = 0;
});

test("machine labels appear only when a local-only board gains remote spaces", () => {
  const b = board(); render(b);
  assert.equal(elements.has("machine-t1"), false, "a known local-only card stays uncluttered");

  herdr.spaces.push(space("build-server/s1", "build-server", "build-server/tab1"));
  herdr.agents.push(agent("build-server/t1", "build-server/s1", "build-server/tab1"));
  render(b);
  assert.equal(text("machine-t1"), "Local");
  assert.equal(text("machine-build-server/t1"), "build-server");
  assert.equal(elements.get("machine-t1")?.props.tooltip?.[0], "Runs on this machine");
  assert.equal(elements.get("machine-build-server/t1")?.props.tooltip?.[0], "Runs on build-server");
});

test("missing or invalid space associations are unknown instead of local, and react to reassignment", () => {
  const b = board();
  herdr.agents.push(agent("t2", "missing", "tab2"));
  render(b);
  assert.equal(text("machine-t2"), "Unknown machine");
  assert.equal(elements.get("machine-t2")?.props.tooltip?.[0], "The agent's owning machine is unavailable");
  assert.equal(elements.has("machine-t1"), false, "an unrelated known local remains uncluttered");

  for (const machine of [undefined, "", "   ", 42]) {
    herdr.spaces.push(space("missing", machine, "tab2"));
    render(b);
    assert.equal(text("machine-t2"), "Unknown machine");
    herdr.spaces.pop();
  }
  herdr.spaces.push(space("build/s1", "build", "build/tab1"));
  herdr.agents[1] = agent("t2", "build/s1", "build/tab1"); render(b);
  assert.equal(text("machine-t2"), "build");
  herdr.agents[1] = agent("t2", "s1", "tab1"); render(b);
  assert.equal(text("machine-t2"), "Local");
  herdr.spaces.pop(); render(b);
  assert.equal(elements.has("machine-t2"), false);
  herdr.agents.pop(); render(b);
  assert.equal(elements.has("agent-t2"), false);
  assert.equal(elements.has("machine-t2"), false);
});

test("visible Idle rows show localized machine labels without creating entries while folded", () => {
  herdr.spaces.push(space("build/s1", "build", "build/tab1"));
  herdr.agents = [agent("t1", "s1", "tab1", { status: "idle" }),
    agent("build/t1", "build/s1", "build/tab1", { status: "idle" }),
    agent("t2", "missing", "tab2", { status: "idle" })];
  herdr.shared["herdboard.lang"] = "pt";
  const b = board(); render(b);
  assert.equal(text("machine-t1"), "Local");
  assert.equal(text("machine-build/t1"), "build");
  assert.equal(text("machine-t2"), "Máquina desconhecida");
  assert.equal(elements.get("machine-t1")?.props.tooltip?.[0], "Roda nesta máquina");
  assert.equal(elements.get("machine-build/t1")?.props.tooltip?.[0], "Roda em build");
  assert.equal(elements.get("machine-t2")?.props.tooltip?.[0], "A máquina do espaço do agente está indisponível");
  clicks.get("head-idle")({}, cx); render(b);
  assert.equal(elements.has("idle-t1"), false);
  assert.equal(elements.has("machine-t1"), false);
  assert.equal(elements.has("machine-build/t1"), false);
  clicks.get("head-idle")({}, cx); render(b);
  assert.equal(text("machine-build/t1"), "build");
});

test("blocked cards and the compact list identify each agent's own machine", () => {
  herdr.spaces[0].active = false;
  herdr.spaces.push(space("build/s1", "build", "build/tab1", true));
  herdr.agents = [agent("t1", "s1", "tab1", { status: "blocked" }),
    agent("build/t1", "build/s1", "build/tab1", { status: "blocked" })];
  const b = board(); render(b);
  assert.equal(text("machine-t1"), "Local");
  assert.equal(text("machine-build/t1"), "build");
  assert.ok(elements.has("answer-t1"));
  assert.ok(elements.has("peek-b-build/t1"));
  b.w = 716; render(b);
  assert.ok(elements.has("board-list"));
  assert.equal(text("machine-t1"), "Local");
  assert.equal(text("machine-build/t1"), "build");
  herdr.agents[0].status = "idle"; render(b);
  assert.equal(text("machine-t1"), "Local", "compact Idle uses the regular card presentation");
});

test("All and This space distinguish identically named local and remote spaces by full ID", () => {
  herdr.spaces.push(space("build/s1", "build", "build/tab1"));
  herdr.agents.push(agent("build/t1", "build/s1", "build/tab1"));
  const b = board(), header = board();
  const filter = value => {
    herdr.props = { role: "header" }; render(header); click(`filter-${value}`);
    herdr.props = {}; render(b);
  };
  filter("here");
  assert.ok(elements.has("agent-t1"));
  assert.equal(elements.has("agent-build/t1"), false);
  assert.equal(text("machine-t1"), "Local", "remote context survives filtering to a local space");
  herdr.spaces[0].active = false; herdr.spaces[1].active = true; render(b);
  assert.equal(elements.has("agent-t1"), false);
  assert.equal(text("machine-build/t1"), "build");
  filter("all");
  assert.equal(text("machine-t1"), "Local");
  assert.equal(text("machine-build/t1"), "build");
  herdr.props = { role: "header" }; render(header);
  click("space-s1"); click("space-build/s1");
  assert.deepEqual(herdr.runs.filter(r => r.command === "space.select"), [
    { command: "space.select", args: { id: "s1" } },
    { command: "space.select", args: { id: "build/s1" } },
  ]);
});

test("matching terminal suffixes retain full focus, Peek, Pin, Unpin and Put away targets", () => {
  herdr.spaces.push(space("build/s1", "build", "build/tab1"));
  herdr.agents.push(agent("build/t1", "build/s1", "build/tab1"));
  const b = board();
  for (const a of herdr.agents) {
    render(b); click(`agent-${a.address}`);
    elements.get(`agent-${a.address}`).props.on_hover[0](true, cx); render(b);
    click(`peek-${a.address}`); click(`pin-${a.address}`);
    a.pinned = true; render(b); click(`pin-${a.address}`);
  }
  assert.deepEqual(herdr.runs, [
    { command: "agent.focus", args: { terminal: "t1" } },
    { command: "terminal.peek", args: { terminal: "t1" } },
    { command: "terminal.pin", args: { terminal: "t1", pinned: true } },
    { command: "terminal.pin", args: { terminal: "t1", pinned: false } },
    { command: "agent.focus", args: { terminal: "build/t1" } },
    { command: "terminal.peek", args: { terminal: "build/t1" } },
    { command: "terminal.pin", args: { terminal: "build/t1", pinned: true } },
    { command: "terminal.pin", args: { terminal: "build/t1", pinned: false } },
  ]);
  click("settle-build/t1"); render(b);
  assert.equal(elements.has("agent-build/t1"), false);
  assert.ok(elements.has("agent-t1"), "settling the remote tab does not settle its matching local tab");
  elements.get("agent-t1").props.on_hover[0](true, cx); render(b); click("settle-t1"); render(b);
  assert.equal(elements.has("agent-t1"), false);
  assert.deepEqual(herdr.runs.slice(-2), [
    { command: "tab.settle", args: { id: "build/tab1" } },
    { command: "tab.settle", args: { id: "tab1" } },
  ]);
});

test("unavailable remote ownership updates independently and adds no machine polling", () => {
  herdr.spaces.push(space("build/s1", "build", "build/tab1"));
  herdr.agents.push(agent("build/t1", "build/s1", "build/tab1"));
  const b = board(); render(b);
  herdr.spaces.pop(); render(b);
  assert.equal(text("machine-build/t1"), "Unknown machine");
  assert.ok(elements.has("agent-t1"));
  for (const timer of timers) timer.f(cx);
  render(b);
  assert.deepEqual(herdr.calls.filter(c => c.args[0] === "machine"), [],
    "machine identification uses reactive spaces without an hc machine query");
});

test("a long remote machine name retains its full tooltip in both languages and compact entries", () => {
  const name = "remote-build-machine-with-a-very-long-original-name";
  herdr.spaces.push(space(`${name}/s1`, name, `${name}/tab1`));
  herdr.agents.push(agent(`${name}/t1`, `${name}/s1`, `${name}/tab1`));
  const b = board();
  for (const [language, width, tooltip] of [["en", 1236, `Runs on ${name}`],
    ["pt", 980, `Roda em ${name}`], ["en", 716, `Runs on ${name}`]]) {
    herdr.shared["herdboard.lang"] = language;
    b.w = width; render(b);
    assert.equal(text(`machine-${name}/t1`), name);
    assert.equal(elements.get(`machine-${name}/t1`)?.props.tooltip?.[0], tooltip);
  }
});

test("recognized startup cards retain qualified pane, space and terminal associations", async () => {
  const trust = readFileSync(new URL("./fixtures/workspace-trust.txt", import.meta.url), "utf8");
  herdr.agents = [];
  herdr.spaces.push(space("build/s1", "build", "build/tab1"));
  herdr.panes = [{ pane: "p1", terminal: "t1", tab: "tab1" },
    { pane: "build/p1", terminal: "build/t1", tab: "build/tab1" }];
  herdr.terminals = ["t1", "build/t1"].map(address => ({ address, state: "live", reported: false,
    status: null, report: null, screen: "exact", created_ms: 1000, pid: 41,
    foreground: { name: "claude", argv: ["claude"], pid: 41, cwd: "<folder>" },
    program: { name: "Claude Code", key: "claude" } }));
  for (const s of herdr.spaces) s.tabs[0].settled = true;
  const b = board(); render(b);
  for (const call of herdr.calls.filter(c => c.args[0] === "read")) call.resolve({ code: 0, stdout: trust });
  for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r));
  render(b);
  assert.equal(text("machine-t1"), "Local");
  assert.equal(text("machine-build/t1"), "build");
  click("answer-build/t1"); click("peek-b-build/t1");
  assert.deepEqual(herdr.runs, [
    { command: "tab.unsettle", args: { id: "tab1" } },
    { command: "tab.unsettle", args: { id: "build/tab1" } },
    { command: "agent.focus", args: { terminal: "build/t1" } },
    { command: "terminal.peek", args: { terminal: "build/t1" } },
  ]);
});
