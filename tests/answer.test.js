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

const cx = { spawn: (f) => f(cx), notify() {}, timer: { every() {} }, stop_propagation() {} };
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
// The board reads the screen of agent `a` and gets back `stdout`.
async function readFor(b, a, stdout) {
  b.fetchAsks([a], cx);
  await settle(reads().at(-1), stdout);
}

beforeEach(() => {
  herdr.agents = [];
  herdr.calls.length = 0;
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
  await readFor(b, blocked(1), screen(["touch /tmp/a &&", "make"]));
  await draw(b, blocked(1)).yes();
  await settle(reads().at(-1), screen(["rm -rf ~ &&", "make"]));
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
