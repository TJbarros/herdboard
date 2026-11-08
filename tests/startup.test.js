// Startup dialog discovery and card clicks through the real mod, at the Herdr boundary.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
register("./runtime/hooks.mjs", import.meta.url);
const { herdr } = await import("./runtime/herdr.mjs");
const { clicks, elements } = await import("./runtime/gpui.mjs");
const { default: Herdboard } = await import("../mods/herdboard/main.js");
const TRUST = readFileSync(new URL("./fixtures/workspace-trust.txt", import.meta.url), "utf8");
// Native Claude Code 2.1.319 capture at 48 terminal columns.
const TRUST_NARROW = readFileSync(new URL("./fixtures/workspace-trust-narrow.txt", import.meta.url), "utf8");
const TRUST_WRAPPED_FOLDER = readFileSync(new URL("./fixtures/workspace-trust-wrapped-folder.txt", import.meta.url), "utf8");
const WRAPPED_FOLDER = "/tmp/herdboard-p2-path-fixture1/workspace-with-a-long-name/project";
const TRUST_WRAPPED_WORDS = readFileSync(new URL("./fixtures/workspace-trust-wrapped-words.txt", import.meta.url), "utf8");
const WORDS_FOLDER = "/tmp/herdboard-p2-words-fixture1/long workspace name for wrapping/project";
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)); };
const waits = [], timers = [];
const cx = { spawn: f => f(cx), notify() {}, stop_propagation() {},
  timer: { every: (ms, f) => timers.push({ ms, f }) },
  sleep: ms => new Promise(resolve => waits.push({ ms, resolve })) };
const terminal = () => ({ address: "t1", state: "live", reported: false, status: null, report: null,
  screen: "exact", created_ms: 1000, pid: 41,
  foreground: { name: "claude", argv: ["claude"], pid: 41, cwd: "<folder>" },
  program: { key: "claude", name: "Claude Code" } });
const reads = () => herdr.calls.filter(c => c.args[0] === "read");
const keys = () => herdr.calls.filter(c => c.args[0] === "keys").map(c => c.args.slice(1));
const unsettles = () => herdr.runs.filter(c => c.command === "tab.unsettle");
function render(b) { clicks.clear(); elements.clear(); b.render(cx); }
const strings = values => values.flatMap(v => typeof v === "string" ? [v] : strings(v?.data?.children ?? []));
async function settle(call, stdout = TRUST, code = 0) {
  assert.ok(call, "expected an hc call");
  call.settled = true;
  call.resolve({ code, stdout }); await flush();
}
async function click(id) { assert.ok(clicks.has(id), `missing ${id}`); clicks.get(id)({}, cx); await flush(); }
function board() { const b = new Herdboard(); b.init(null, cx); return b; }
beforeEach(() => {
  herdr.agents = []; herdr.terminals = [terminal()]; herdr.props = {}; herdr.shared = {};
  herdr.spaces = [{ id: "s1", name: "Test", active: true, tabs: [{ id: "tab1", name: "1", active: true }] }];
  herdr.panes = [{ pane: "p1", terminal: "t1", tab: "tab1", program: terminal().program, focused: true }];
  herdr.calls.length = 0; herdr.runs.length = 0; waits.length = 0; timers.length = 0;
});
test("a complete trust dialog reaches an answerable card without a reported agent", async () => {
  const b = board(); render(b);
  assert.ok(reads().length, "discover eligible startup terminals even though agents() is empty");
  assert.equal(elements.has("agent-t1"), false, "no card before recognising the complete dialog");
  await settle(reads().at(-1)); render(b);
  assert.ok(elements.has("agent-t1"));
  assert.ok(elements.has("yes-t1")); assert.ok(elements.has("no-t1"));
  assert.ok(elements.has("answer-t1")); assert.ok(elements.has("peek-b-t1"));
  assert.deepEqual(herdr.agents, []); assert.equal(herdr.terminals[0].report, null);
  assert.deepEqual(unsettles(), [], "an active tab needs no reactivation");
});
test("a 48-column trust dialog reaches an answerable card and header count", async () => {
  const b = board(); render(b);
  await settle(reads().at(-1), TRUST_NARROW); render(b);
  assert.ok(elements.has("agent-t1"), "the wrapped trust explanation must not hide the startup card");
  assert.ok(elements.has("yes-t1")); assert.ok(elements.has("no-t1"));
  herdr.props = { role: "header" }; const header = board(); render(header);
  assert.ok(strings(elements.get("space-s1").children).includes("1"), "the recognised startup is counted");
  assert.deepEqual(keys(), [], "discovery never answers the dialog");
});
test("a wrapped workspace path reaches an answerable startup card and header count", async () => {
  herdr.terminals[0].foreground.cwd = WRAPPED_FOLDER;
  const b = board(); render(b);
  await settle(reads().at(-1), TRUST_WRAPPED_FOLDER); render(b);
  assert.ok(elements.has("agent-t1"), "a wrapped cwd must still expose the startup card");
  assert.ok(elements.has("yes-t1")); assert.ok(elements.has("no-t1"));
  herdr.props = { role: "header" }; const header = board(); render(header);
  assert.ok(strings(elements.get("space-s1").children).includes("1"), "the startup is counted");
  assert.deepEqual(keys(), [], "discovery never answers the dialog");
});
for (const [label, folder, wrapped] of [
  ["original", "/tmp/long workspace name for wrapping/project", "/tmp/long workspace name\n for wrapping/project"],
  ["minimal", "/a b", "/a\n b"],
  ["native capture", WORDS_FOLDER, null],
]) test(`a workspace path wrapped between words preserves spaces in its card and header count (${label})`, async () => {
  const screen = wrapped === null ? TRUST_WRAPPED_WORDS : TRUST_NARROW.replace("<folder>", wrapped);
  herdr.terminals[0].foreground.cwd = folder;
  const b = board(); render(b);
  await settle(reads().at(-1), screen); render(b);
  assert.ok(elements.has("agent-t1"), "the valid cwd with a space at the wrap must expose its card");
  assert.ok(strings(elements.get("agent-t1").children).some(text => text.includes(folder)));
  assert.ok(elements.has("yes-t1")); assert.ok(elements.has("no-t1"));
  herdr.props = { role: "header" }; const header = board(); render(header);
  assert.ok(strings(elements.get("space-s1").children).includes("1"), "the startup is counted");
  assert.deepEqual(keys(), [], "discovery never answers the dialog");
});
for (const [screen, cwd] of [
  [TRUST_WRAPPED_FOLDER, WRAPPED_FOLDER.replace("/project", "/other")],
  [TRUST_WRAPPED_WORDS, WORDS_FOLDER.replace("workspace name", "workspacename")],
]) test(`a wrapped workspace path with a different cwd stays hidden and uncounted (${cwd})`, async () => {
  herdr.terminals[0].foreground.cwd = cwd;
  const b = board(); render(b);
  await settle(reads().at(-1), screen);
  for (let i = 0; i < 2; i++) { waits[i].resolve(); await flush(); await settle(reads().at(-1), screen); }
  render(b);
  assert.equal(b.asks.t1.visible, false);
  assert.equal(elements.has("agent-t1"), false);
  herdr.props = { role: "header" }; const header = board(); render(header);
  assert.equal(strings(elements.get("space-s1").children).includes("1"), false);
  assert.deepEqual(keys(), []);
});
test("a new trust dialog in a put-away tab returns an answerable card", async () => {
  herdr.spaces[0].tabs[0].settled = true;
  const b = board(); render(b);
  await settle(reads().at(-1)); render(b);
  assert.ok(b.asks.t1.visible, "the complete startup dialog was recognised");
  assert.ok(b.asks.t1.choices, "the recognised dialog has answer choices");
  assert.ok(elements.has("agent-t1"), "a new request must bring its put-away tab back to the board");
  assert.ok(elements.has("yes-t1")); assert.ok(elements.has("no-t1"));
  assert.deepEqual(unsettles(), [{ command: "tab.unsettle", args: { id: "tab1" } }]);
  assert.deepEqual(keys(), [], "discovery never answers the dialog");
});
test("putting away a split tab through another agent returns it when trust appears later", async () => {
  herdr.agents = [{ address: "t2", pane: "p2", tab: "tab1", space: "s1", status: "working", seq: 1 }];
  herdr.panes.push({ pane: "p2", terminal: "t2", tab: "tab1" });
  herdr.spaces[0].tabs.push({ id: "other", name: "Other", settled: true });
  const b = board(); render(b);
  await settle(reads().at(-1), "Starting Claude…");
  elements.get("agent-t2").props.on_hover[0](true, cx); render(b);
  await click("settle-t2"); render(b);
  assert.equal(herdr.spaces[0].tabs[0].settled, true);
  assert.equal(elements.has("agent-t2"), false);
  assert.deepEqual(unsettles(), [], "startup alone does not bring the tab back");
  waits[0].resolve(); await flush(); await settle(reads().at(-1)); render(b);
  assert.ok(elements.has("yes-t1"), "the late trust dialog brings back the split tab");
  assert.ok(elements.has("agent-t2"));
  assert.equal(herdr.spaces[0].tabs[1].settled, true, "other put-away tabs stay put away");
  herdr.props = { role: "header" }; const header = board(); render(header);
  assert.ok(strings(elements.get("space-s1").children).includes("2"));
  assert.deepEqual(herdr.runs, [{ command: "tab.settle", args: { id: "tab1" } },
    { command: "tab.unsettle", args: { id: "tab1" } }], "reactivation never changes focus");
});
for (const [label, screen] of [["loading", "Starting Claude…"],
  ["incomplete dialog", TRUST.replace("Enter to confirm · Esc to cancel", "")],
  ["another folder", TRUST.replace("<folder>", "<other>")]]) {
  test(`an unrecognised ${label} screen does not reactivate a put-away tab`, async () => {
    herdr.spaces[0].tabs[0].settled = true;
    const b = board(); render(b); await settle(reads().at(-1), screen);
    for (let i = 0; i < 2; i++) { waits[i].resolve(); await flush(); await settle(reads().at(-1), screen); }
    render(b);
    assert.deepEqual(unsettles(), []); assert.equal(herdr.spaces[0].tabs[0].settled, true);
    assert.equal(elements.has("agent-t1"), false);
  });
}
const moved = TRUST.replace(" ❯ No, exit", "   No, exit").replace("   Yes, I trust this folder", " ❯ Yes, I trust this folder");
async function showTrust(screen = TRUST) {
  const b = board(); render(b); await settle(reads().at(-1), screen); render(b); return b;
}
async function finishAnswer(screen = TRUST) {
  for (let i = 0; i < 10; i++) {
    const call = herdr.calls.find(c => !c.settled);
    if (!call) return;
    await settle(call, call.args[0] === "get" ? JSON.stringify(herdr.terminals[0]) : screen);
  }
  assert.fail("answer flow did not finish");
}
for (const [label, folder, screen, rewrapped] of [
  ["a wrapped workspace path", WRAPPED_FOLDER, TRUST_WRAPPED_FOLDER,
    TRUST_WRAPPED_FOLDER.replace("workspace-with\n -a-long-name", "workspace-\n with-a-long-name")],
  ["a workspace path wrapped between words", WORDS_FOLDER, TRUST_WRAPPED_WORDS,
    TRUST_WRAPPED_WORDS.replace("/long\n workspace name", "/long workspace\n name")],
]) {
  for (const [target, expected] of [["yes", ["t1", "down", "enter"]], ["no", ["t1", "enter"]]]) {
    test(`${label} validates its complete cwd before answering ${target}`, async () => {
      herdr.terminals[0].foreground.cwd = folder;
      await showTrust(screen); await click(`${target}-t1`);
      await finishAnswer(screen);
      assert.deepEqual(keys(), [expected]);
    });
  }
  test(`${label} sends no keys when only its wrapping changes`, async () => {
    herdr.terminals[0].foreground.cwd = folder;
    await showTrust(screen); await click("yes-t1");
    await finishAnswer(rewrapped);
    assert.deepEqual(keys(), [], "the full cwd still matches, but the guarded raw identity changed");
  });
}
for (const answered of [false, true]) {
  test(`polling the same ${answered ? "answered" : "unanswered"} startup does not undo putting its tab away again`, async t => {
    t.mock.timers.enable({ apis: ["Date"], now: 10000 });
    const b = await showTrust();
    if (answered) { await click("no-t1"); await finishAnswer(); }
    herdr.spaces[0].tabs[0].settled = true;
    t.mock.timers.tick(1000); render(b); await settle(reads().at(-1)); render(b);
    assert.deepEqual(unsettles(), []);
    // Losing the screen briefly must not turn this lifecycle into a new request.
    t.mock.timers.tick(1000); render(b); await settle(reads().at(-1), "Starting Claude…");
    for (let i = 0; i < 2; i++) { waits[i].resolve(); await flush(); await settle(reads().at(-1), "Starting Claude…"); }
    t.mock.timers.tick(1000); render(b); await settle(reads().at(-1)); render(b);
    assert.deepEqual(unsettles(), []);
    assert.equal(herdr.spaces[0].tabs[0].settled, true);
    assert.equal(elements.has("agent-t1"), false);
    // A new foreground process is a new startup lifecycle, even with the same text.
    herdr.terminals[0].foreground.pid = 99;
    render(b); await settle(reads().at(-1)); render(b);
    assert.ok(elements.has("yes-t1"));
    assert.deepEqual(unsettles(), [{ command: "tab.unsettle", args: { id: "tab1" } }]);
  });
}
for (const failAt of ["initial metadata", "screen", "final metadata"])
test(`a failed answer validation preserves Put away for the same startup lifecycle (${failAt})`, async t => {
  t.mock.timers.enable({ apis: ["Date"], now: 10000 });
  herdr.agents = [{ address: "t2", pane: "p2", tab: "tab1", space: "s1", status: "working", seq: 1 }];
  herdr.panes.push({ pane: "p2", terminal: "t2", tab: "tab1" });
  const b = await showTrust();
  await click("yes-t1");
  if (failAt !== "initial metadata") await settle(herdr.calls.at(-1), JSON.stringify(terminal()));
  if (failAt === "final metadata") await settle(reads().at(-1));
  const validation = herdr.calls.at(-1);
  assert.deepEqual(validation.args, failAt === "screen" ? ["read", "t1", "--lines", "0"] : ["get", "t1", "--json"]);
  elements.get("agent-t2").props.on_hover[0](true, cx); render(b);
  await click("settle-t2"); render(b);
  assert.equal(herdr.spaces[0].tabs[0].settled, true);
  assert.equal(elements.has("agent-t1"), false);
  await settle(validation, "unavailable", 1);
  assert.deepEqual(keys(), [], "failed validation cannot send an answer");
  t.mock.timers.tick(1000); render(b);
  await settle(reads().at(-1)); render(b);
  assert.deepEqual(unsettles(), [], "rereading the same request must not undo Put away after a validation failure");
  assert.equal(herdr.spaces[0].tabs[0].settled, true);
  assert.equal(elements.has("agent-t1"), false);
  herdr.terminals[0].foreground.pid = 99;
  render(b); await settle(reads().at(-1)); render(b);
  assert.ok(elements.has("yes-t1"), "a new process still brings its own trust request back");
  assert.deepEqual(unsettles(), [{ command: "tab.unsettle", args: { id: "tab1" } }]);
});
test("a stale discovery read cannot reactivate a put-away tab", async () => {
  herdr.spaces[0].tabs[0].settled = true;
  const b = board(); render(b);
  herdr.terminals[0].foreground.pid = 99;
  await settle(reads().at(-1));
  assert.deepEqual(unsettles(), []);
  assert.equal(herdr.spaces[0].tabs[0].settled, true);
});
test("discovery reactivates the current tab if the pane moves during its read", async () => {
  herdr.spaces[0].tabs[0].settled = true;
  herdr.spaces[0].tabs.push({ id: "moved", settled: true });
  const b = board(); render(b);
  herdr.panes[0].tab = "moved";
  await settle(reads().at(-1)); render(b);
  assert.ok(elements.has("yes-t1"));
  assert.deepEqual(unsettles(), [{ command: "tab.unsettle", args: { id: "moved" } }]);
  assert.equal(herdr.spaces[0].tabs[0].settled, true);
});
for (const [screen, target, expected] of [
  [TRUST, "yes", ["t1", "down", "enter"]], [TRUST, "no", ["t1", "enter"]],
  [TRUST_NARROW, "yes", ["t1", "down", "enter"]], [TRUST_NARROW, "no", ["t1", "enter"]],
  [moved, "yes", ["t1", "enter"]], [moved, "no", ["t1", "up", "enter"]],
]) test(`cursor ${screen === moved ? "Yes" : "No"} (${screen === TRUST_NARROW ? 48 : 200} columns): ${target} sends ${expected.slice(1).join(" ")} once`, async () => {
  const b = await showTrust(screen);
  await click(`${target}-t1`); await finishAnswer(screen); render(b);
  assert.deepEqual(keys(), [expected]);
  await click("yes-t1"); await click("no-t1"); await finishAnswer(screen);
  assert.deepEqual(keys(), [expected], "all answers stay disabled after the first click");
});
test("startup eligibility is read from the core before and after the screen, even when the app snapshot lags", async () => {
  await showTrust(); await click("yes-t1");
  const before = herdr.calls.at(-1);
  assert.deepEqual(before.args, ["get", "t1", "--json"]);
  await settle(before, JSON.stringify(terminal()));
  await settle(reads().at(-1));
  const after = herdr.calls.at(-1);
  assert.deepEqual(after.args, ["get", "t1", "--json"]);
  const changed = terminal(); changed.foreground.pid = 99;
  await settle(after, JSON.stringify(changed)); await finishAnswer();
  assert.deepEqual(keys(), [], "a replaced foreground process receives no keys, including Enter");
});
test("discovery finds trust even when it appears after the initial retries", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: 10000 });
  const b = await showTrust("Starting Claude…");
  for (let i = 0; i < 2; i++) { waits[i].resolve(); await flush(); await settle(reads().at(-1), "Starting Claude…"); }
  render(b); assert.equal(elements.has("agent-t1"), false);
  const poll = timers.find(t => t.ms === 1000);
  assert.ok(poll, "startup discovery has its own refresh while there are eligible terminals");
  t.mock.timers.tick(1000); poll.f(cx); render(b);
  await settle(reads().at(-1)); render(b);
  assert.ok(elements.has("yes-t1"));
});
for (const [language, yes, tip] of [["pt", "Sim", 'Confirma no terminal: "Yes, I trust this folder"'],
  ["en", "Yes", 'Confirms in the terminal: "Yes, I trust this folder"']]) {
  for (const screen of [TRUST, TRUST_NARROW])
  test(`${language} cursor controls describe the actual choice at narrow and wide sizes (${screen === TRUST ? 200 : 48} columns)`, async () => {
    herdr.shared["herdboard.lang"] = language;
    const b = await showTrust(screen);
    for (const width of [760, 1280]) {
      b.w = width; render(b);
      assert.deepEqual(elements.get("yes-t1").children, [yes]);
      assert.deepEqual(elements.get("yes-t1").props.tooltip, [tip]);
      assert.ok(elements.has("answer-t1")); assert.ok(elements.has("peek-b-t1"));
      assert.equal(elements.has("more-trigger-t1"), false);
    }
    await click("answer-t1"); await click("peek-b-t1");
    assert.deepEqual(herdr.runs, [{ command: "agent.focus", args: { terminal: "t1" } },
      { command: "terminal.peek", args: { terminal: "t1" } }]);
  });
}
for (const [label, screen] of [
  ["folder", TRUST.replace("<folder>", "<other>")], ["cursor", moved],
  ["label", TRUST.replace("No, exit", "No, return")],
  ["order", TRUST.replace(" ❯ No, exit\n   Yes, I trust this folder", "   Yes, I trust this folder\n ❯ No, exit")],
  ["context", TRUST.replace("Security guide", " Security guide")],
  ["wrapping", TRUST_NARROW],
  ["incomplete screen", TRUST.replace("Enter to confirm · Esc to cancel", "")],
]) test(`a changed ${label} on the fresh screen sends zero keys`, async () => {
  await showTrust(); await click("yes-t1"); await finishAnswer(screen);
  assert.deepEqual(keys(), []);
});

const sourceChanges = [
  ["reported status", () => { herdr.terminals[0].reported = true; }],
  ["status", () => { herdr.terminals[0].status = "working"; }],
  ["report", () => { herdr.terminals[0].report = { kind: "permission" }; }],
  ["foreground process", () => { herdr.terminals[0].foreground.pid = 99; }],
  ["terminal incarnation", () => { herdr.terminals[0].created_ms = 2000; }],
  ["working folder", () => { herdr.terminals[0].foreground.cwd = "<other>"; }],
  ["program", () => { herdr.terminals[0].foreground.name = "bash"; }],
  ["finished terminal", () => { herdr.terminals[0].state = "finished"; }],
  ["disappeared terminal", () => { herdr.terminals = []; }],
  ["disappeared pane", () => { herdr.panes = []; }],
];
for (const [label, change] of sourceChanges) {
  for (const when of ["before click", "during screen read"]) test(`${label} ${when} prevents all keys`, async () => {
    await showTrust();
    if (when === "before click") change();
    await click("yes-t1");
    if (when === "during screen read") {
      await settle(herdr.calls.at(-1), JSON.stringify(terminal()));
      change();
    }
    await finishAnswer(); assert.deepEqual(keys(), []);
  });
}
test("a cache replaced during the fresh screen read invalidates its pending answer", async () => {
  const b = await showTrust(); await click("yes-t1");
  await settle(herdr.calls.at(-1), JSON.stringify(terminal()));
  b.asks.t1 = { ...b.asks.t1 };
  await finishAnswer(); assert.deepEqual(keys(), []);
});
test("duplicate clicks while validation is pending still send only one plan", async () => {
  await showTrust(); await click("yes-t1"); await click("no-t1"); await click("yes-t1");
  await finishAnswer(); assert.deepEqual(keys(), [["t1", "down", "enter"]]);
});
test("a disappearing terminal during the last metadata read cannot receive Enter", async () => {
  await showTrust(); await click("yes-t1");
  await settle(herdr.calls.at(-1), JSON.stringify(terminal())); await settle(reads().at(-1));
  const final = herdr.calls.at(-1); assert.equal(final.args[0], "get");
  herdr.terminals = []; await settle(final, JSON.stringify(terminal()));
  await finishAnswer(); assert.deepEqual(keys(), []);
});
for (const failAt of ["get", "read"]) test(`a failed ${failAt} sends no keys`, async () => {
  await showTrust(); await click("yes-t1");
  if (failAt === "read") await settle(herdr.calls.at(-1), JSON.stringify(terminal()));
  await settle(herdr.calls.at(-1), "unavailable", 1);
  await finishAnswer(); assert.deepEqual(keys(), []);
});
test("a matching screen cannot promote an ineligible terminal or a terminal outside panes", () => {
  for (const change of [...sourceChanges.filter(([label]) => ["reported status", "status", "report", "program",
    "finished terminal", "disappeared terminal", "disappeared pane"].includes(label)).map(([, f]) => f),
    () => { herdr.terminals[0].screen = "inexact"; },
    () => { herdr.terminals[0].foreground = null; },
    () => { herdr.terminals[0].foreground.argv = ["echo", "claude"]; },
  ]) {
    herdr.terminals = [terminal()]; herdr.panes = [{ pane: "p1", terminal: "t1", tab: "tab1" }];
    change(); const b = board(); render(b);
    assert.equal(reads().length, 0); assert.equal(elements.has("agent-t1"), false);
  }
});
test("an answered startup stays disabled after polling and hiding it with a filter", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: 10000 });
  const b = await showTrust(); await click("yes-t1"); await finishAnswer();
  herdr.spaces[0].active = false;
  herdr.spaces.push({ id: "s2", active: true, tabs: [] }); herdr.shared["herdboard.filter"] = "here";
  render(b); assert.equal(elements.has("agent-t1"), false);
  t.mock.timers.tick(1000); render(b); await settle(reads().at(-1), moved);
  herdr.shared["herdboard.filter"] = "all"; render(b);
  await click("yes-t1"); await click("no-t1"); await finishAnswer(moved);
  assert.deepEqual(keys(), [["t1", "down", "enter"]]);
});
test("a stale rendered button cannot answer a new startup lifecycle", async () => {
  const b = await showTrust(); const stale = clicks.get("yes-t1");
  herdr.terminals[0].foreground.pid = 99; render(b); await settle(reads().at(-1)); render(b);
  stale({}, cx); await finishAnswer(); assert.deepEqual(keys(), []);
  await click("no-t1"); await finishAnswer(); assert.deepEqual(keys(), [["t1", "enter"]]);
});
test("the header counts recognised startup cards without fetching in its own mod copy", async () => {
  await showTrust(); const before = reads().length;
  herdr.props = { role: "header" }; const header = board(); render(header);
  assert.ok(strings(elements.get("space-s1").children).includes("1"));
  assert.equal(reads().length, before);
  herdr.terminals[0].reported = true; render(header);
  assert.equal(strings(elements.get("space-s1").children).includes("1"), false);
});
test("startup waiting time survives the normal age timer", async t => {
  t.mock.timers.enable({ apis: ["Date"], now: 10000 });
  const b = await showTrust(); t.mock.timers.tick(61000);
  timers.find(t => t.ms === 30000).f(cx); render(b);
  assert.ok(strings(elements.get("agent-t1").children).includes("esperando há 1 min"));
});
