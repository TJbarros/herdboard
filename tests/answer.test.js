// Run with: node --test
// The Yes / No click path of the real main.js (card button -> answer() -> hc keys), with the
// Herdr runtime and gpui-kit replaced by stand-ins (tests/runtime). Each hc call waits until
// the test settles it, so a test decides in which order screen reads come back.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";

register("./runtime/hooks.mjs", import.meta.url);
const { herdr } = await import("./runtime/herdr.mjs");
const { clicks } = await import("./runtime/gpui.mjs");
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
// Draw the agent's card as the board would and return its Yes / No click handlers (null when
// the card has no such button). Clicking runs the button's own on_click, disabled check included.
function draw(b, a) {
  clicks.clear();
  b.card(a, { color: "#000000" }, { tabs: new Map(), paneInfo: new Map() });
  const handler = (id) => clicks.get(`${id}-${a.address}`) ?? null;
  const click = (h) => h && (async () => { h({}, cx); await flush(); });
  return { yes: click(handler("yes")), no: click(handler("no")) };
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
  waits.length = 0;
  herdr.terminals = [{ address: "t1", report: { kind: "permission" } }];
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
