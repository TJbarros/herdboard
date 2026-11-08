// Run with: node --test
// The permission answer path of the real main.js (card button/menu -> answer() -> hc keys), with the
// Herdr runtime and gpui-kit replaced by stand-ins (tests/runtime). Each hc call waits until
// the test settles it, so a test decides in which order screen reads come back.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";

register("./runtime/hooks.mjs", import.meta.url);
const { herdr } = await import("./runtime/herdr.mjs");
const { clicks, elements, popovers } = await import("./runtime/gpui.mjs");
const { default: Herdboard } = await import("../mods/herdboard/main.js");
const { parseAsk } = await import("../mods/herdboard/ask.js");

// A Claude Code v2.1.319 permission dialog as `hc read --lines 0` shows it (issue #1), for a
// command of one or more lines. The transcript above it blinks: "●" on one read, " " on the next.
const screen = (cmd, mark = "●") => {
  const lines = [].concat(cmd);
  return [
    " ▐▛███▛█   Claude Code v2.1.319", "", `❯ Run ${lines[0]}`, "",
    `${mark} Running it`, `  ⎿  $ ${lines[0]}`, "",
    "─".repeat(60),
    " Bash command",
    " Tip: auto mode handles these prompts for you",
    "╌".repeat(60),
    ...lines.map(l => ` ${l}`),
    "╌".repeat(60),
    " Do you want to proceed?",
    " ❯ 1. Yes",
    "   2. Yes, and always allow access to /repo from this project",
    "   3. No",
    "",
    " Esc to cancel · Tab to amend",
  ].join("\n");
};
const MORE_TEXT = [
  "Yes, and always allow access to /repo from this project",
  "Yes, and switch to auto mode · auto mode handles these prompts for you",
];
const moreScreen = (cmd) => screen(cmd).replace("   3. No", [
  "   3. Yes, and switch to auto mode · auto mode handles",
  "      these prompts for you",
  "   4. No",
].join("\n"));

// cx.sleep waits until the test wakes it, so a test can end a spell between a miss and its retry.
const waits = [];
const cx = { spawn: (f) => f(cx), notify() {}, timer: { every() {} }, stop_propagation() {},
  sleep: (ms) => new Promise((resolve) => waits.push({ ms, resolve })) };
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r)); };
const blocked = (seq) => ({ address: "t1", status: "blocked", seq, app: "claude-code" });
const reads = () => herdr.calls.filter(c => c.args[0] === "read");
const keys = () => herdr.calls.filter(c => c.args[0] === "keys").map(c => c.args.slice(1));
// Settle an hc call the way the app would: reads return the screen, keys succeed.
async function settle(call, stdout) {
  call.resolve(call.args[0] === "read" ? { code: 0, stdout } : { code: 0 });
  await flush();
}
async function settleKeys() {
  for (const c of herdr.calls) if (c.args[0] === "keys" && !c.settled) { c.settled = true; c.resolve({ code: 0 }); }
  await flush();
}

function board() {
  const b = new Herdboard();
  b.init(null, cx);
  return b;
}
// Draw the card and expose its controls. Trigger and item clicks use the real on_click;
// native Escape/outside dismissal reports through on_open_change.
function draw(b, a) {
  clicks.clear();
  elements.clear();
  popovers.clear();
  b.card(a, { color: "#000000" }, { tabs: new Map(), paneInfo: new Map() });
  const handler = (id) => clicks.get(`${id}-${a.address}`) ?? null;
  const click = (h) => h && (async () => { h({}, cx); await flush(); });
  const menu = popovers.get(`more-${a.address}`);
  const options = new Map(Array.from({ length: 9 }, (_, i) => [i + 1, handler(`option-${i + 1}`)]));
  return { yes: click(handler("yes")), no: click(handler("no")),
    more: menu && click(handler("more-trigger")),
    dismiss: menu && (async () => { menu.props.on_open_change[0](false, cx); await flush(); }),
    open: menu?.props.open[0] ?? false,
    labels: menu?.props.open[0] ? menu.props.content[0].data.children.map(el => el.data.children[0].data.children[0]) : [],
    option: n => menu?.props.open[0] ? click(options.get(n) ?? null) : null };
}
// Wake every pending cx.sleep.
async function wake() {
  for (const w of waits) if (!w.woken) { w.woken = true; w.resolve(); }
  await flush();
}
// The board reads the screen of agent `a` and gets back `stdout`.
async function readFor(b, a, stdout) {
  b.fetchAsks([a], cx);
  await settle(reads().at(-1), stdout);
}

beforeEach(() => {
  herdr.agents = [];
  herdr.calls.length = 0;
  herdr.runs.length = 0;
  herdr.shared = {};
  waits.length = 0;
  herdr.terminals = [{ address: "t1", report: { kind: "permission" } }];
});

test("More stays open across a full board render while startup discovery runs", async () => {
  const b = board(); herdr.agents = [blocked(1)];
  b.render(cx); await settle(reads().at(-1), screen("touch /tmp/a")); b.render(cx);
  clicks.get("more-trigger-t1")({}, cx); await flush(); b.render(cx);
  assert.equal(popovers.get("more-t1").props.open[0], true);
});

test("a reported permission cannot answer a trust screen without the startup source", async () => {
  const b = board(); herdr.agents = [blocked(1)];
  herdr.terminals[0].foreground = { name: "bash", pid: 41, cwd: "/other" };
  const trust = readFileSync(new URL("./fixtures/workspace-trust.txt", import.meta.url), "utf8");
  await readFor(b, blocked(1), trust);
  for (let i = 0; i < 2 && waits.some(w => !w.woken); i++) { await wake(); await settle(reads().at(-1), trust); }
  assert.equal(draw(b, blocked(1)).yes, null);
  assert.equal(draw(b, blocked(1)).no, null);
  assert.ok(elements.has("answer-t1")); assert.ok(elements.has("peek-b-t1"));
  assert.deepEqual(keys(), []);
});

test("Yes types the Yes digit once the fresh read shows the same dialog", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen("touch /tmp/a"));
  await draw(b, blocked(1)).yes();
  await settle(reads().at(-1), screen("touch /tmp/a", " "));  // the transcript blinked: same dialog
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "1"]]);
});

test("No types the No digit", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen("touch /tmp/a"));
  await draw(b, blocked(1)).no();
  await settle(reads().at(-1), screen("touch /tmp/a"));
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "3"]]);
});

test("More opens the remaining option and choosing it sends only its digit through a fresh read", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen("touch /tmp/a"));
  const closed = draw(b, blocked(1));
  assert.ok(closed.more);
  assert.equal(closed.open, false);
  await closed.more();
  const opened = draw(b, blocked(1));
  assert.equal(opened.open, true);
  assert.equal(opened.option(1), null);
  assert.equal(opened.option(3), null);
  await opened.option(2)();
  assert.equal(draw(b, blocked(1)).open, false);
  assert.deepEqual(keys(), [], "the screen must be checked first");
  await settle(reads().at(-1), screen("touch /tmp/a", " "));
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "2"]]);
});

test("a menu closed when its card is hidden stays closed when the card returns", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen("touch /tmp/a"));
  await draw(b, blocked(1)).more();
  assert.equal(draw(b, blocked(1)).open, true);
  b.fetchAsks([], cx);
  b.fetchAsks([blocked(1)], cx);
  assert.equal(draw(b, blocked(1)).open, false);
});

test("More lists options 2 and 3 in screen order with full wrapped text and tooltips", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), moreScreen("touch /tmp/a"));
  await draw(b, blocked(1)).more();
  assert.deepEqual(draw(b, blocked(1)).labels, MORE_TEXT);
  assert.deepEqual(elements.get("option-2-t1").props.tooltip, [MORE_TEXT[0]]);
  assert.deepEqual(elements.get("option-3-t1").props.tooltip, [MORE_TEXT[1]]);
  await draw(b, blocked(1)).option(3)();
  await settle(reads().at(-1), moreScreen("touch /tmp/a"));
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "3"]]);
});

for (const change of [
  "seq", "status", "report", "seq during read", "report during read", "gone",
  "last continuation", "last numbered continuation", "last cursor-like continuation", "replaced cache",
]) {
  test(`a More item types nothing and refreshes when ${change} changed`, async () => {
    const b = board();
    herdr.agents = [blocked(1)];
    const tail = change === "last numbered continuation" ? "1. archive" : change === "last cursor-like continuation" ? "> 1. archive" : "action";
    const dialog = moreScreen("touch /tmp/a").replace("   4. No", "   4. No\n   5. Other\n      " + tail);
    await readFor(b, blocked(1), dialog);
    await draw(b, blocked(1)).more();
    const choose = draw(b, blocked(1)).option(2);
    let fresh = dialog;
    if (change === "seq") herdr.agents = [blocked(2)];
    if (change === "status") herdr.agents = [{ ...blocked(2), status: "working" }];
    if (change === "report") herdr.terminals[0].report.kind = "question";
    if (change === "gone") fresh = "Running…";
    if (change === "last continuation") fresh = dialog.replace("      action", "      changed");
    if (change === "last numbered continuation") fresh = dialog.replace("1. archive", "2. archive");
    if (change === "last cursor-like continuation") fresh = dialog.replace("> 1. archive", "❯ 1. archive");
    let kept;
    if (change === "replaced cache") {
      herdr.agents = [blocked(2)];
      await readFor(b, blocked(2), moreScreen("touch /tmp/b"));
      kept = b.asks.t1;
    }
    await choose();
    if (change === "seq during read") herdr.agents = [blocked(2)];
    if (change === "report during read") herdr.terminals[0].report.kind = "question";
    for (const r of reads()) await settle(r, fresh);
    await settleKeys();
    assert.deepEqual(keys(), []);
    if (kept) assert.equal(b.asks.t1, kept, "the newer card stays answerable");
    else assert.equal(b.asks.t1, undefined, "discarded so the next render reads again");
  });
}

for (const answer of ["yes", "no", "more"]) {
  test(`after ${answer}, all answer controls stay disabled until a new spell`, async () => {
    const b = board();
    herdr.agents = [blocked(1)];
    await readFor(b, blocked(1), screen("touch /tmp/a"));
    await draw(b, blocked(1)).more();
    const old = draw(b, blocked(1));
    await (answer === "more" ? old.option(2)() : old[answer]());
    await old.yes();
    await old.no();
    await old.option(2)();
    await old.more();
    const disabled = draw(b, blocked(1));
    assert.equal(disabled.open, false);
    await disabled.yes();
    await disabled.no();
    await disabled.more();
    assert.equal(draw(b, blocked(1)).open, false);
    assert.equal(reads().length, 2, "a second click starts no extra read or send");
    await settle(reads().at(-1), screen("touch /tmp/a"));
    await settleKeys();
    assert.deepEqual(keys(), [["t1", answer === "yes" ? "1" : answer === "no" ? "3" : "2"]]);
    await draw(b, blocked(1)).more();
    assert.equal(draw(b, blocked(1)).open, false, "still disabled after sending");
    herdr.agents = [blocked(2)];
    await readFor(b, blocked(2), screen("touch /tmp/b"));
    await draw(b, blocked(2)).more();
    assert.equal(draw(b, blocked(2)).open, true);
  });
}

test("More is absent without both Yes / No or without remaining one-key options", async () => {
  for (const [a, kind, dialog] of [
    [blocked(1), "permission", "───\nProceed?\n 1. Yes\n 2. No"],
    [blocked(1), "permission", "───\nProceed?\n 1. Yes, always\n 2. No"],
    [{ ...blocked(1), app: "codex" }, "permission", screen("touch /tmp/a")],
    [blocked(1), "question", screen("touch /tmp/a")],
    [blocked(1), "permission", screen("touch /tmp/a").replace("─".repeat(60) + "\n", "")],
  ]) {
    const b = board();
    herdr.agents = [a];
    herdr.terminals[0].report.kind = kind;
    await readFor(b, a, dialog);
    assert.equal(draw(b, a).more, undefined);
  }
});

test("More excludes option 10 while keeping every other remaining digit in screen order", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  const dialog = "───\nProceed?\n 1. No\n 2. Yes\n" + Array.from({ length: 8 }, (_, i) => ` ${i + 3}. Choice ${i + 3}`).join("\n");
  await readFor(b, blocked(1), dialog);
  await draw(b, blocked(1)).more();
  const menu = draw(b, blocked(1));
  assert.deepEqual(menu.labels, ["Choice 3", "Choice 4", "Choice 5", "Choice 6", "Choice 7", "Choice 8", "Choice 9"]);
  assert.equal(menu.option(10), null);
});

test("native dismissal and a new spell close the controlled menu", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen("touch /tmp/a"));
  await draw(b, blocked(1)).more();
  assert.equal(draw(b, blocked(1)).open, true);
  await draw(b, blocked(1)).dismiss(); // Native Escape and outside press both use this callback.
  assert.equal(draw(b, blocked(1)).open, false);
  await draw(b, blocked(1)).more();
  herdr.agents = [blocked(2)];
  await readFor(b, blocked(2), screen("touch /tmp/b"));
  assert.equal(draw(b, blocked(2)).open, false);
  herdr.agents = [{ ...blocked(3), status: "working" }];
  b.fetchAsks([], cx);
  assert.equal(draw(b, herdr.agents[0]).more, undefined);
});

test("the More trigger, menu and items stop both the press and click before the card can focus", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen("touch /tmp/a"));
  await draw(b, blocked(1)).more();
  draw(b, blocked(1));
  const menu = popovers.get("more-t1").props.content[0].data;
  for (const el of [elements.get("more-trigger-t1"), menu, elements.get("option-2-t1")]) {
    for (const [event, index] of [["on_mouse_down", 1], ["on_click", 0]]) {
      let stopped = false;
      el.props[event][index]({}, { ...cx, stop_propagation() { stopped = true; } });
      if (!stopped) clicks.get("agent-t1")({}, cx);
      assert.equal(stopped, true, event);
    }
  }
  assert.deepEqual(herdr.runs, []);
  await settle(reads().at(-1), screen("touch /tmp/a"));
  await settleKeys();
});

test("PT / EN changes the More label and leaves the agent's options untranslated", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), moreScreen("touch /tmp/a"));
  for (const [language, label] of [["pt", "Mais…"], ["en", "More…"]]) {
    herdr.shared["herdboard.lang"] = language;
    b.render(cx);
    await draw(b, blocked(1)).more();
    const menu = draw(b, blocked(1));
    assert.deepEqual(elements.get("more-trigger-t1").children, [label]);
    assert.deepEqual(menu.labels, MORE_TEXT);
    await menu.dismiss();
  }
});

// Review P1: the card text keeps only the end of the request (two lines, 180 characters).
test("a fresh read with another command that ends the same types nothing", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  const first = screen(["touch /tmp/a &&", "make &&", "make"]);
  const fresh = screen(["rm -rf ~ &&", "make &&", "make"]);
  assert.equal(parseAsk(first).text, parseAsk(fresh).text);  // the card cannot tell them apart
  await readFor(b, blocked(1), first);
  await draw(b, blocked(1)).yes();
  await settle(reads().at(-1), fresh);
  await settleKeys();
  assert.deepEqual(keys(), []);
});

// Review P1: the button answers the request its card showed, not whatever is cached now.
test("a button drawn for an earlier request does not answer the current one", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen("touch /tmp/a"));
  const old = draw(b, blocked(1));                 // the card on screen, drawn for seq 1
  herdr.agents = [blocked(2)];
  await readFor(b, blocked(2), screen("rm -rf ~"));  // a new request is read before the redraw
  await old.yes();
  for (const r of reads()) await settle(r, screen("rm -rf ~"));
  await settleKeys();
  assert.deepEqual(keys(), []);
  assert.ok(b.asks.t1.choices, "the current request keeps its buttons");
});

// Review P2: an older read finishing last must not replace the current, answered one.
test("a late read of an earlier request does not re-arm an answered card", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  b.fetchAsks([blocked(1)], cx);
  const late = reads().at(-1);                     // seq 1's read, still running
  herdr.agents = [blocked(2)];
  await readFor(b, blocked(2), screen("make b"));
  await draw(b, blocked(2)).yes();
  await settle(reads().at(-1), screen("make b"));
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "1"]]);

  await settle(late, screen("make a"));            // seq 1's read comes back last
  b.fetchAsks([blocked(2)], cx);                   // the next render (status and seq unchanged)
  for (const r of reads()) await settle(r, screen("make b"));
  const again = draw(b, blocked(2));
  if (again.yes) await again.yes();
  for (const r of reads()) await settle(r, screen("make b"));
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "1"]], "no second key until the status or seq changes");
});

// A dialog whose shape is in doubt (here a command forging the rule and the dashed frame) has
// no request id to check a click against: the card shows no Yes / No at all. It is a miss, so
// it is read again (issue #8), at most twice more, and still never gets buttons.
test("a dialog whose shape is in doubt gets no Yes / No buttons", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  const forged = screen("rm -rf ~").replace(" rm -rf ~\n", ["───", " rm -rf ~", "───", "╌╌╌", " echo ok", ""].join("\n"));
  await readFor(b, blocked(1), forged);
  for (let i = 0; i < 3; i++) { await wake(); await settle(reads().at(-1), forged); }
  assert.equal(reads().length, 3, "at most 2 extra reads");
  assert.equal(b.asks.t1.choices, null);
  assert.equal(draw(b, blocked(1)).yes, null);
});

// Review P1 (f0f3c07): only the options' cursor is blanked, never the request itself. A heredoc
// line "> 1. example" and the same line with a space for ">" are two requests.
test("a command line that only differs by a leading '>' is another request", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen(["cat <<EOF", "  1. example", "EOF"]));
  await draw(b, blocked(1)).yes();
  await settle(reads().at(-1), screen(["cat <<EOF", "> 1. example", "EOF"]));
  await settleKeys();
  assert.deepEqual(keys(), []);
});

// Review P1 (2eaed32): a no-break space at the end of a heredoc line is part of the command.
test("a command line that only loses a trailing no-break space is another request", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen(["cat <<EOF", "a ", "EOF"]));
  await draw(b, blocked(1)).yes();
  await settle(reads().at(-1), screen(["cat <<EOF", "a", "EOF"]));
  await settleKeys();
  assert.deepEqual(keys(), []);
});

// Review P2 (f0f3c07): hiding the card (filter "This space", agent in another space) and showing
// it again must not re-arm a request already answered while its spell lasts.
test("hiding and showing an answered card again does not re-arm it", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen("touch /tmp/a"));
  await draw(b, blocked(1)).yes();
  await settle(reads().at(-1), screen("touch /tmp/a"));
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "1"]]);

  const before = reads().length;
  b.fetchAsks([], cx);                               // filter "This space": the card is hidden
  b.fetchAsks([blocked(1)], cx);                     // back to "All": same status, same seq
  assert.equal(reads().length, before, "the kept read is reused, the screen is not read again");
  for (const r of reads()) if (!r.settled) { r.settled = true; await settle(r, screen("touch /tmp/a")); }
  const again = draw(b, blocked(1));
  if (again.yes) await again.yes();
  for (const r of reads()) if (!r.settled) { r.settled = true; await settle(r, screen("touch /tmp/a")); }
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "1"]], "no second key until the status or seq changes");
});

// The kept read lasts as long as its spell: a new request met while the card was hidden is read
// and answerable again.
test("a new request met while the card was hidden gets its own buttons", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), screen("touch /tmp/a"));
  await draw(b, blocked(1)).yes();
  await settle(reads().at(-1), screen("touch /tmp/a"));
  await settleKeys();

  b.fetchAsks([], cx);                               // hidden
  herdr.agents = [blocked(2)];                       // meanwhile the agent asks something else
  await readFor(b, blocked(2), screen("touch /tmp/b"));
  await draw(b, blocked(2)).yes();
  await settle(reads().at(-1), screen("touch /tmp/b"));
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "1"], ["t1", "1"]]);
});

// Issue #8: the first read can come back before the screen shows the question (a resize or a
// redraw while it runs). A miss is read again, after RETRY_MS, without a status change.
const NO_QUESTION_YET = " ▐▛███▛█   Claude Code v2.1.319\n\n❯ Run touch /tmp/a\n";
test("a first read before the question is on screen is read again and gets its buttons", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), NO_QUESTION_YET);
  assert.equal(draw(b, blocked(1)).yes, null, "no buttons yet");
  assert.deepEqual(waits.map(w => w.ms), [500]);
  await wake();
  await settle(reads().at(-1), screen("touch /tmp/a"));
  assert.equal(reads().length, 2);
  assert.equal(b.asks.t1.question, "Do you want to proceed?");
  await draw(b, blocked(1)).yes();
  await settle(reads().at(-1), screen("touch /tmp/a"));
  await settleKeys();
  assert.deepEqual(keys(), [["t1", "1"]]);
});

test("a first read with the question but no request id is read again and gets its buttons", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  const midRedraw = screen("touch /tmp/a").replace("─".repeat(60) + "\n", "");  // no opening rule yet
  await readFor(b, blocked(1), midRedraw);
  await wake();
  await settle(reads().at(-1), screen("touch /tmp/a"));
  assert.equal(reads().length, 2);
  assert.ok(draw(b, blocked(1)).yes, "the retry's buttons");
});

test("a first read with the question but no Yes / No pair yet is read again and gets its buttons", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  const half = screen("touch /tmp/a").split("\n");
  await readFor(b, blocked(1), half.slice(0, half.indexOf(" ❯ 1. Yes") + 1).join("\n"));
  await wake();
  await settle(reads().at(-1), screen("touch /tmp/a"));
  assert.equal(reads().length, 2);
  assert.ok(draw(b, blocked(1)).yes, "the retry's buttons");
});

test("a render during a wait starts no second read of the same spell", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), NO_QUESTION_YET);       // a miss: waiting 500 ms
  b.fetchAsks([blocked(1)], cx);                       // the board renders meanwhile
  b.fetchAsks([blocked(1)], cx);
  assert.equal(reads().length, 1);
  assert.equal(waits.length, 1);
});

test("no retry once the spell ended during the first read", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  b.fetchAsks([blocked(1)], cx);
  herdr.agents = [{ ...blocked(2), status: "working" }];
  await settle(reads().at(-1), NO_QUESTION_YET);
  assert.deepEqual(waits, []);
  assert.equal(b.asks.t1, undefined);
});

test("no retry once the agent leaves blocked during the wait", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), NO_QUESTION_YET);
  herdr.agents = [{ ...blocked(2), status: "working" }];
  await wake();
  assert.equal(reads().length, 1);
  assert.equal(b.asks.t1, undefined);
});

test("a wait from an earlier spell neither reads again nor replaces the current spell's card", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), NO_QUESTION_YET);       // seq 1 misses and waits
  herdr.agents = [blocked(2)];
  await readFor(b, blocked(2), screen("touch /tmp/b"));
  const kept = b.asks.t1;
  await wake();                                        // seq 1's wait ends
  assert.equal(reads().length, 2, "no read for seq 1 after its wait");
  assert.equal(b.asks.t1, kept);
  assert.ok(draw(b, blocked(2)).yes);
});

test("an agent that is not Claude Code gets no extra read once its question is on screen", async () => {
  const b = board();
  const codex = { ...blocked(1), app: "codex" };
  herdr.agents = [codex];
  await readFor(b, codex, screen("touch /tmp/a"));
  assert.equal(reads().length, 1);
  assert.deepEqual(waits, []);
  assert.equal(b.asks.t1.question, "Do you want to proceed?");
  assert.equal(draw(b, codex).yes, null);
});

test("a screen that never shows a question is read 3 times, then the card looks as before", async () => {
  const b = board();
  herdr.agents = [blocked(1)];
  await readFor(b, blocked(1), NO_QUESTION_YET);
  for (let i = 0; i < 3; i++) { await wake(); await settle(reads().at(-1), NO_QUESTION_YET); }
  assert.equal(reads().length, 3);
  assert.deepEqual(waits.map(w => w.ms), [500, 1500]);
  assert.equal(b.asks.t1.text, "");
  assert.equal(b.asks.t1.choices, null);
  assert.equal(draw(b, blocked(1)).yes, null);
  b.fetchAsks([blocked(1)], cx);                       // the next render: same spell, kept read
  assert.equal(reads().length, 3);
});
