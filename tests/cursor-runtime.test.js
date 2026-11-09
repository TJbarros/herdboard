// Cursor discovery through the real board, at its native Herdr API boundary.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
register("./runtime/hooks.mjs", import.meta.url);
const { herdr } = await import("./runtime/herdr.mjs");
const { clicks, elements } = await import("./runtime/gpui.mjs");
const { default: Herdboard } = await import("../mods/herdboard/main.js");
const captured = JSON.parse(readFileSync(new URL("./fixtures/cursor-2026.11.05/agent.json", import.meta.url)));
const timers = [];
const cx = { spawn: f => f(cx), notify() {}, stop_propagation() {},
  timer: { every: (ms, f) => timers.push({ ms, f }) }, sleep: () => new Promise(() => {}) };
const strings = values => values.flatMap(v => typeof v === "string" ? [v] : strings(v?.data?.children ?? []));
const text = id => strings(elements.get(id)?.children ?? []).join("\n");
function render(b) { clicks.clear(); elements.clear(); b.render(cx); }
function board(role) { herdr.props = role ? { role } : {}; const b = new Herdboard(); b.init(null, cx); b.w = 1236; b.h = 200; return b; }
beforeEach(() => {
  herdr.agents = []; herdr.terminals = [structuredClone(captured)]; herdr.props = {}; herdr.shared = { "herdboard.lang": "en" };
  herdr.spaces = [{ id: "s1", name: "Cursor project", machine: null, active: true,
    tabs: [{ id: "tab1", name: "Cursor session", named: true, active: true }] }];
  herdr.panes = [{ pane: "p1", terminal: "t1", tab: "tab1", focused: true, cwd: "/workspace/cursor", branch: "main" }];
  herdr.layout = { id: "herdboard-cards" };
  herdr.calls.length = 0; herdr.execCalls.length = 0; herdr.runs.length = 0; timers.length = 0;
});
test("the captured interactive agent session has one identifiable card without a status report", () => {
  const b = board(); render(b);
  assert.ok(elements.has("agent-t1"), "the running Cursor session must reach the board");
  assert.match(text("agent-t1"), /Cursor CLI/);
  assert.match(text("head-unknown"), /Status unavailable[\s\S]*1/);
  assert.match(text("agent-t1"), /Cursor project · Cursor session · main/);
  assert.equal(elements.has("idle-t1"), false);
  assert.equal(elements.has("activity-t1"), false);
  assert.equal(elements.has("yes-t1"), false);
  assert.equal(herdr.calls.length, 0, "unknown status needs neither activity nor question screen reads");
  clicks.get("agent-t1")({}, cx);
  elements.get("agent-t1").props.on_hover[0](true, cx); render(b);
  clicks.get("peek-t1")({}, cx);
  assert.deepEqual(herdr.runs.filter(r => ["agent.focus", "terminal.peek"].includes(r.command)), [
    { command: "agent.focus", args: { terminal: "t1" } },
    { command: "terminal.peek", args: { terminal: "t1" } },
  ]);
});
test("the captured shell launch is discovered from its current foreground rather than the original shell", () => {
  const terminal = JSON.parse(readFileSync(new URL("./fixtures/cursor-2026.11.05/shell-agent.json", import.meta.url)));
  herdr.terminals = [terminal]; herdr.panes[0].terminal = terminal.address;
  const b = board(); render(b);
  assert.ok(elements.has(`agent-${terminal.address}`));
  assert.match(text(`agent-${terminal.address}`), /Cursor CLI/);
  assert.doesNotMatch(text(`agent-${terminal.address}`), /tester@host/);
});
test("the captured optional yolo launch also works when the launcher omits use-system-ca", () => {
  const terminal = JSON.parse(readFileSync(new URL("./fixtures/cursor-2026.11.05/agent-yolo.json", import.meta.url)));
  herdr.terminals = [terminal]; herdr.panes[0].terminal = terminal.address;
  const b = board(); render(b);
  assert.ok(elements.has(`agent-${terminal.address}`));
  assert.match(text(`agent-${terminal.address}`), /Cursor CLI/);
});
test("pinning a discovered Cursor session uses Herdr's terminal label and board ordering", () => {
  const second = structuredClone(captured);
  second.address = "t2"; second.labels = { "herdr.pinned": "1" };
  herdr.terminals.push(second);
  herdr.panes.push({ ...herdr.panes[0], pane: "p2", terminal: "t2", focused: false });
  const b = board(); render(b);
  assert.deepEqual(herdr.agentOrder, ["t2", "t1"]);
  elements.get("agent-t2").props.on_hover[0](true, cx); render(b);
  assert.equal(text("pin-t2"), "Unpin");
  clicks.get("pin-t2")({}, cx);
  assert.deepEqual(herdr.runs.at(-1), { command: "terminal.pin", args: { terminal: "t2", pinned: false } });
});
test("a replacement process never inherits the previous reported task at the same address", () => {
  const report = { address: "t1", pane: "p1", space: "s1", space_name: "Cursor project", tab: "tab1",
    tab_name: "Cursor session", status: "working", app: "cursor", program: { name: "Cursor CLI" }, seq: 1 };
  herdr.agents = [{ ...report, title: "Previous task" }];
  const b = board(); render(b);
  herdr.agents = [{ ...report, title: "" }]; render(b);
  assert.match(text("agent-t1"), /Previous task/, "the same process retains its last task");
  herdr.terminals[0].foreground.pid++;
  render(b);
  assert.doesNotMatch(text("agent-t1"), /Previous task/);
  herdr.agents = []; render(b);
  assert.match(text("agent-t1"), /Cursor CLI/);
  assert.doesNotMatch(text("agent-t1"), /Previous task|Last:|min|stuck/);
});
for (const [name, change] of [
  ["an unrelated agent executable", t => { t.foreground.argv = ["/usr/local/bin/agent"]; }],
  ["an unrelated MainThread process", t => { t.foreground.argv = ["/usr/bin/node", "/workspace/index.js"]; }],
  ["a shell with a Cursor title and program descriptor", t => { t.foreground.argv = ["/bin/bash"]; t.title = "Cursor CLI"; t.program = { key: "cursor", agent: true }; }],
  ["a Node process using the same file", t => { t.foreground.argv[0] = "/usr/bin/node"; }],
  ["an unrelated index.js", t => { t.foreground.argv[2] = "/workspace/versions/current/index.js"; }],
  ["a similar directory", t => { t.foreground.argv[2] = "/opt/not-cursor-agent/versions/current/index.js"; }],
  ["an absent foreground", t => { delete t.foreground; }],
  ["a finished terminal", t => { t.state = "finished"; }],
  ["an unavailable screen", t => { t.screen = "unavailable"; }],
  ["a missing terminal incarnation", t => { delete t.created_ms; }],
  ["a missing foreground PID", t => { delete t.foreground.pid; }],
  ["print mode", t => { t.foreground.argv.push("--print", "hello"); }],
  ["short print mode", t => { t.foreground.argv.push("-p", "hello"); }],
  ["a status command", t => { t.foreground.argv.push("status"); }],
  ["an unknown flag", t => { t.foreground.argv.push("--future-mode"); }],
]) test(`${name} does not create or retain a Cursor card`, () => {
  const b = board(); render(b);
  assert.ok(elements.has("agent-t1"));
  change(herdr.terminals[0]); render(b);
  assert.equal(elements.has("agent-t1"), false);
  assert.equal(elements.has("idle-t1"), false);
  assert.equal(elements.has("head-unknown"), false);
  render(board("header"));
  assert.doesNotMatch(text("space-s1"), /\n1$/);
});
for (const kind of ["reported", "never reported"]) test(`${kind} without current status follows the same explicit policy`, () => {
  herdr.terminals[0].reported = kind === "reported";
  const b = board(); b.w = 716; render(b);
  assert.match(text("count-unknown"), /Status unavailable\n1/);
  assert.doesNotMatch(text("agent-t1"), /min|stuck|Last:|Doing now/);
  herdr.shared["herdboard.lang"] = "pt"; render(b);
  assert.match(text("count-unknown"), /Status indisponível\n1/);
  assert.match(text("agent-t1"), /Status indisponível/);
});
test("header and cards independently resolve full remote ownership, filters and settled tabs", () => {
  const remote = structuredClone(captured); remote.address = "vps/t1";
  herdr.terminals.push(remote);
  herdr.spaces.push({ id: "vps/s1", name: "Remote project", machine: "vps", active: false,
    tabs: [{ id: "vps/tab1", name: "Remote session", named: true }] });
  herdr.panes.push({ pane: "vps/p1", terminal: "vps/t1", tab: "vps/tab1", cwd: "/workspace/remote" });
  const header = board("header"); render(header);
  assert.equal(text("space-s1"), "Cursor project\n1");
  assert.equal(text("space-vps/s1"), "Remote project\n1");
  const b = board(); render(b);
  assert.match(text("head-unknown"), /2$/);
  assert.match(text("machine-vps/t1"), /^vps$/);
  clicks.get("agent-vps/t1")({}, cx);
  elements.get("agent-vps/t1").props.on_hover[0](true, cx); render(b);
  clicks.get("peek-vps/t1")({}, cx);
  assert.deepEqual(herdr.runs.slice(-2), [
    { command: "agent.focus", args: { terminal: "vps/t1" } },
    { command: "terminal.peek", args: { terminal: "vps/t1" } },
  ]);
  clicks.get("settle-vps/t1")({}, cx); render(b);
  assert.equal(elements.has("agent-vps/t1"), false);
  herdr.spaces[1].tabs[0].settled = false;
  herdr.shared["herdboard.filter"] = "here"; render(b);
  assert.ok(elements.has("agent-t1")); assert.equal(elements.has("agent-vps/t1"), false);
  herdr.spaces[0].active = false; herdr.spaces[1].active = true; render(b);
  assert.ok(elements.has("agent-vps/t1")); assert.equal(elements.has("agent-t1"), false);
  herdr.terminals.pop(); herdr.props = { role: "header" }; render(header);
  assert.equal(text("space-vps/s1"), "Remote project");
});
test("a reported agent supersedes discovery once and loss of status restores the neutral card", () => {
  const b = board(); render(b);
  herdr.agents = [{ address: "t1", pane: "p1", space: "s1", space_name: "Cursor project", tab: "tab1",
    tab_name: "Cursor session", status: "working", app: "cursor", program: { name: "Cursor CLI" }, seq: 1, title: "Reported task" }];
  render(b);
  assert.match(text("agent-t1"), /Reported task/);
  assert.equal(elements.has("head-unknown"), false);
  assert.deepEqual(herdr.agentOrder, ["t1"]);
  herdr.agents = []; render(b);
  assert.match(text("head-unknown"), /1$/);
  assert.doesNotMatch(text("agent-t1"), /Reported task|Last:|for |min/);
  assert.deepEqual(herdr.agentOrder, ["t1"]);
});
for (const [name, change] of [
  ["removed terminal", () => { herdr.terminals = []; }],
  ["removed pane", () => { herdr.panes = []; }],
  ["missing tab", () => { herdr.spaces[0].tabs = []; }],
  ["missing space", () => { herdr.spaces = []; }],
  ["ambiguous panes", () => { herdr.panes.push({ ...herdr.panes[0], pane: "p2" }); }],
  ["ambiguous owning space", () => { herdr.spaces.push({ ...herdr.spaces[0], id: "s2" }); }],
]) test(`${name} removes the discovered session`, () => {
  const b = board(); render(b); assert.ok(elements.has("agent-t1"));
  change(); render(b); assert.equal(elements.has("agent-t1"), false);
});
test("reassociation and terminal address reuse show current ownership without a cached task or age", () => {
  const b = board(); render(b);
  herdr.panes[0].tab = "tab2";
  herdr.spaces.push({ id: "s2", name: "New owner", machine: null, tabs: [{ id: "tab2", name: "Moved", named: true }] });
  herdr.terminals[0] = { ...structuredClone(captured), created_ms: captured.created_ms + 1, pid: 50000 };
  herdr.terminals[0].title = "Stale shell title";
  render(b);
  assert.match(text("agent-t1"), /New owner · Moved/);
  assert.doesNotMatch(text("agent-t1"), /Stale shell title|Cursor project|Last:|min/);
});
test("unknown-status cards consume only their own visible worktree context and no screen polling", () => {
  const b = board(); render(b);
  assert.equal(herdr.execCalls.length, 1);
  assert.equal(herdr.execCalls[0].options.cwd, "/workspace/cursor");
  for (const timer of timers) timer.f(cx);
  render(b);
  assert.equal(herdr.calls.length, 0, "no activity, startup or question reads for unknown Cursor status");
  assert.equal(herdr.execCalls.length, 1, "the pending worktree discovery retains its bounded slot");
  herdr.spaces[0].tabs[0].settled = true; render(b);
  assert.equal(elements.has("agent-t1"), false);
  herdr.execCalls[0].resolve({ code: 0, stdout: "/workspace/cursor/.git\n", stderr: "" });
});
