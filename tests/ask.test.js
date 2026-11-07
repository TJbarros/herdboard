// Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAsk, pickAnswers } from "../mods/herdboard/ask.js";

// Claude Code v2.1.319 permission dialog, from `hc read <t> --lines 0` (issue #1).
const FIXTURE = [
  "╭──────────────────────────────────────────────────────────────╮",
  "│ Bash command                                                 │",
  "│   touch /tmp/x                                               │",
  "│ Do you want to proceed?                                      │",
  "│ ❯ 1. Yes                                                     │",
  "│   2. Yes, and always allow access to tmp/ from this project  │",
  "│   3. Yes, and switch to auto mode · auto mode handles these prompts for you │",
  "│   4. No                                                      │",
  "╰──────────────────────────────────────────────────────────────╯",
  " Esc to cancel · Tab to amend",
  "",
].join("\n");

test("card text keeps the question and up to two lines before it", () => {
  assert.equal(parseAsk(FIXTURE).text, "Bash command\ntouch /tmp/x\nDo you want to proceed?");
});

test("reads the question and the numbered options below it", () => {
  const ask = parseAsk(FIXTURE);
  assert.equal(ask.question, "Do you want to proceed?");
  assert.deepEqual(ask.options, [
    { n: 1, text: "Yes" },
    { n: 2, text: "Yes, and always allow access to tmp/ from this project" },
    { n: 3, text: "Yes, and switch to auto mode · auto mode handles these prompts for you" },
    { n: 4, text: "No" },
  ]);
});

test("a long option wrapped over two lines does not hide the ones after it", () => {
  const narrow = [
    " Do you want to proceed?",
    " ❯ 1. Yes",
    "   2. Yes, and switch to auto mode · auto mode handles",
    "   these prompts for you",
    "   3. No",
    " Esc to cancel · Tab to amend",
  ].join("\n");
  assert.deepEqual(parseAsk(narrow).options.map(o => o.n), [1, 2, 3]);
  assert.equal(parseAsk(narrow).options[2].text, "No");
});

test("Yes and No map to the options labelled exactly so, by text, not position", () => {
  assert.deepEqual(pickAnswers(parseAsk(FIXTURE).options), { yes: { n: 1, text: "Yes" }, no: { n: 4, text: "No" } });
});

test("no question on screen: no text and no options", () => {
  const ask = parseAsk("Running tests…\n ❯ 1. Yes\n   2. No\n");
  assert.equal(ask.text, "");
  assert.deepEqual(ask.options, []);
  assert.equal(pickAnswers(ask.options), null);
});

test("no Yes / No pair is recognised unless both are there exactly once, with one-key digits", () => {
  const pick = (...texts) => pickAnswers(texts.map((text, i) => ({ n: i + 1, text })));
  assert.equal(pick("Yes", "Yes, and don't ask again"), null);
  assert.equal(pick("Yes, allow", "No, and tell Claude what to do differently"), null);
  assert.equal(pick("Yes", "No", "Yes"), null);
  assert.equal(pick("Yes", "2", "3", "4", "5", "6", "7", "8", "9", "No"), null);
  assert.deepEqual(pick("No", "Yes"), { yes: { n: 2, text: "Yes" }, no: { n: 1, text: "No" } });
});

test("numbered lines out of order after the question are not options", () => {
  const ask = parseAsk("Proceed?\n 2. Yes\n 3. No\n");
  assert.deepEqual(ask.options, []);
});

// Claude Code v2.1.319, read live twice from the same dialog: the tool line above it blinks
// ("●" then a space). The dashed lines frame the command; the solid rule starts the dialog.
const LIVE = (mark, command = ["touch probe.txt"]) => [
  " ▐▛███▛█   Claude Code v2.1.319",
  "",
  "❯ Run the bash command: touch probe.txt",
  "",
  `${mark} Creating empty probe file`,
  "  ⎿  $ touch probe.txt",
  "",
  "─".repeat(80),
  " Bash command",
  " Tip: auto mode handles these prompts for you — choose \"switch to auto mode\" below",
  " Create empty probe file",
  "╌".repeat(80),
  ...command.map(l => ` ${l}`),
  "╌".repeat(80),
  " Do you want to proceed?",
  " ❯ 1. Yes",
  "   2. Yes, and always allow access to /tmp/live from this project",
  "   3. Yes, and switch to auto mode · auto mode handles these prompts for you",
  "   4. No",
  "",
  " Esc to cancel · Tab to amend",
].join("\n");

test("the request id is the whole dialog: the same on two reads although the screen above it blinks", () => {
  assert.notEqual(LIVE("●"), LIVE(" "));
  assert.equal(parseAsk(LIVE("●")).id, parseAsk(LIVE(" ")).id);
  assert.match(parseAsk(LIVE("●")).id, /^Bash command\n[\s\S]*touch probe\.txt[\s\S]*\n4\. No$/);
});

test("two requests that end the same have different ids although the card text matches", () => {
  const a = parseAsk(LIVE("●", ["touch /tmp/a &&", "make"]));
  const b = parseAsk(LIVE("●", ["rm -rf ~ &&", "make"]));
  assert.equal(a.text, b.text);
  assert.notEqual(a.id, b.id);
});

test("the request id ignores where the option cursor sits", () => {
  const moved = LIVE("●").replace(" ❯ 1. Yes", "   1. Yes").replace("   4. No", " ❯ 4. No");
  assert.equal(parseAsk(moved).id, parseAsk(LIVE("●")).id);
});

test("no question on screen: no request id", () => {
  assert.equal(parseAsk("Running tests…\n").id, "");
});
