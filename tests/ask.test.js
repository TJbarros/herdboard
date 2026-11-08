// Run with: node --test
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseAsk, pickAnswers } from "../mods/herdboard/ask.js";

// Complete hc read --lines 0 capture, Claude Code 2.1.319 at 200 columns (issue #3).
const TRUST = readFileSync(new URL("./fixtures/workspace-trust.txt", import.meta.url), "utf8");
const TRUST_NARROW = readFileSync(new URL("./fixtures/workspace-trust-narrow.txt", import.meta.url), "utf8");
test("workspace trust keeps its folder, ordered cursor options and complete raw identity", () => {
  const ask = parseAsk(TRUST);
  assert.equal(ask.mode, "cursor");
  assert.equal(ask.dialog, "workspace-trust");
  assert.equal(ask.folder, "<folder>");
  assert.equal(ask.selectedIndex, 0);
  assert.deepEqual(ask.options, [{ index: 0, text: "No, exit" }, { index: 1, text: "Yes, I trust this folder" }]);
  assert.equal(ask.id, TRUST.slice(1).trimEnd());
  assert.equal(ask.text, "Accessing workspace:\n<folder>");
  assert.deepEqual(pickAnswers(ask), { yes: ask.options[1], no: ask.options[0] });
  assert.equal(pickAnswers(ask.options), null, "trust labels alone are not a recognised dialog");
});
test("workspace trust joins its wrapped explanation while keeping the raw identity", () => {
  const wide = parseAsk(TRUST);
  const wrapped = TRUST.replace("Claude Code'll be able to read, edit, and execute files here.",
    "Claude Code'll be able to read, edit, and\n execute files here.");
  for (const screen of [TRUST_NARROW, wrapped]) {
    const ask = parseAsk(screen);
    assert.equal(ask.mode, "cursor");
    assert.equal(ask.question, wide.question);
    assert.deepEqual(ask.options, wide.options);
    assert.equal(ask.id, screen.slice(1).trimEnd());
    assert.notEqual(ask.id, wide.id, "wrapping must remain part of the guarded raw identity");
    assert.notEqual(parseAsk(screen.replace(" execute files here.", "  execute files here.")).id, ask.id);
    for (const changed of [screen.replace(" execute files here.", ""),
      screen.replace(" execute files here.", " execute other files here."),
      screen.replace(" Security guide", " extra context\n Security guide")]) {
      assert.equal(pickAnswers(parseAsk(changed)), null, "only the complete known explanation is recognised");
    }
  }
});
test("trust recognition rejects incomplete, ambiguous and unrelated cursor menus", () => {
  for (const screen of [TRUST.replace(" ❯ No, exit", "   No, exit"),
    TRUST.replace("   Yes, I trust this folder", " ❯ Yes, I trust this folder"),
    TRUST.replace("   Yes, I trust this folder\n", ""),
    TRUST.replace("Enter to confirm · Esc to cancel", ""),
    TRUST.replace("─".repeat(200), ""),
    TRUST.replace("Accessing workspace:", "Something else:"),
    TRUST.replace("Yes, I trust this folder", "Yes, allow everything"),
    TRUST + "More unrelated content\n", "❯ No, exit\n  Yes, I trust this folder\n"]) {
    const ask = parseAsk(screen);
    assert.equal(pickAnswers(ask), null);
    assert.notEqual(ask.mode, "cursor");
  }
});
test("trust identity includes raw folder context, whitespace, options, footer and cursor", () => {
  const id = parseAsk(TRUST).id;
  for (const screen of [TRUST.replace("<folder>", "<other folder>"),
    TRUST.replace("<folder>", "<folder> "),
    TRUST.replace(" ❯ No, exit\n   Yes, I trust this folder", "   No, exit\n ❯ Yes, I trust this folder"),
    TRUST.replace(" ❯ No, exit\n   Yes, I trust this folder", "   Yes, I trust this folder\n ❯ No, exit"),
    TRUST.replace("Security guide", " Security guide")]) assert.notEqual(parseAsk(screen).id, id);
});

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

// Claude Code v2.1.319 at 202 columns, from `hc read <t> --lines 0` (issue #7): dashed rows
// (U+254C) frame the command. They are separators, not part of the question.
const WIDE = [
  "─".repeat(202),
  " Bash command",
  " Tip: auto mode handles these prompts for you — choose \"switch to auto mode\" below",
  " Create empty probe file",
  "╌".repeat(202),
  " touch herdboard-probe.txt",
  "╌".repeat(202),
  " Do you want to proceed?",
  " ❯ 1. Yes",
  "   2. Yes, and always allow access to <folder> from this project",
  "   3. Yes, and switch to auto mode · auto mode handles these prompts for you",
  "   4. No",
  " Esc to cancel · Tab to amend",
].join("\n");

test("card text shows the command, not the dashed rows around it", () => {
  const ask = parseAsk(WIDE);
  assert.equal(ask.text, "Create empty probe file\ntouch herdboard-probe.txt\nDo you want to proceed?");
  assert.deepEqual(ask.options, [
    { n: 1, text: "Yes" },
    { n: 2, text: "Yes, and always allow access to <folder> from this project" },
    { n: 3, text: "Yes, and switch to auto mode · auto mode handles these prompts for you" },
    { n: 4, text: "No" },
  ]);
});

test("lines made only of horizontal box-drawing glyphs are dropped from the card text", () => {
  for (const g of "─━┄┅┈┉╌╍═╴╶╸╺╼╾") {
    assert.equal(parseAsk(`Run it\n${g.repeat(40)}\nProceed?`).text, "Run it\nProceed?", g);
  }
});

test("a line with words next to dashes, or of vertical glyphs and corners, stays in the card text", () => {
  for (const line of ["── Bash ──", "┆┆┆", "├──"]) {
    assert.equal(parseAsk(`Run it\n${line}\nProceed?`).text, `Run it\n${line}\nProceed?`, line);
  }
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

test("a long option joins lines at its text column and keeps the options after it", () => {
  const narrow = [
    " Do you want to proceed?",
    " ❯ 1. Yes",
    "   2. Yes, and switch to auto mode · auto mode handles",
    "      these prompts for you",
    "   3. No",
    " Esc to cancel · Tab to amend",
  ].join("\n");
  assert.deepEqual(parseAsk(narrow).options, [
    { n: 1, text: "Yes" },
    { n: 2, text: "Yes, and switch to auto mode · auto mode handles these prompts for you" },
    { n: 3, text: "No" },
  ]);
});

test("the last option's continuations belong to its text and to the guarded dialog id", () => {
  for (const [prefix, suffix] of [["", ""], ["│", " │"]]) {
    const option = `${prefix}   4. No, and explain${suffix}`;
    const tail = `${prefix}      what to do${suffix}\n${prefix}      differently${suffix}`;
    const screen = FIXTURE.slice(0, FIXTURE.indexOf("│   4. No")) + [
      option, tail, `${prefix}      Esc to cancel · Tab to amend${suffix}`,
    ].join("\n");
    const ask = parseAsk(screen);
    assert.equal(ask.options[3].text, "No, and explain what to do differently");
    assert.ok(ask.id.endsWith(option + "\n" + tail));
    assert.notEqual(ask.id, parseAsk(screen.replace("differently", "instead")).id);
  }
});

test("a continuation beginning with a number is text, not another option, and changes the id", () => {
  const screen = "───\nProceed?\n   1. Yes\n   2. No\n   3. Yes, and always allow access to\n      1. archive from this project";
  const ask = parseAsk(screen);
  assert.deepEqual(ask.options, [
    { n: 1, text: "Yes" },
    { n: 2, text: "No" },
    { n: 3, text: "Yes, and always allow access to 1. archive from this project" },
  ]);
  assert.notEqual(ask.id, parseAsk(screen.replace("1. archive", "2. archive")).id);
  assert.deepEqual(parseAsk(screen.replace("1. archive", "4. archive")).options, [
    { n: 1, text: "Yes" },
    { n: 2, text: "No" },
    { n: 3, text: "Yes, and always allow access to 4. archive from this project" },
  ]);
});

test("a continuation that resembles an option cursor stays byte for byte in the guarded id", () => {
  const screen = "───\nProceed?\n   1. Yes\n   2. No\n   3. Other\n      > 1. archive";
  const ask = parseAsk(screen);
  assert.ok(ask.id.endsWith("\n      > 1. archive"));
  assert.notEqual(ask.id, parseAsk(screen.replace("> 1. archive", "❯ 1. archive")).id);
});

test("blank lines, the footer and lines outside the text column never continue an option", () => {
  for (const after of [
    "\n      unrelated text",
    "      Esc to cancel · Tab to amend\n      unrelated text",
    "   unaligned text\n      unrelated text",
    "       too far right\n      unrelated text",
  ]) {
    const ask = parseAsk("───\nProceed?\n   1. Yes\n   2. No\n" + after);
    assert.deepEqual(ask.options, [{ n: 1, text: "Yes" }, { n: 2, text: "No" }]);
    assert.equal(ask.id, "Proceed?\n   1. Yes\n   2. No");
  }
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
  assert.match(parseAsk(LIVE("●")).id, /^ Bash command\n[\s\S]*touch probe\.txt[\s\S]*\n {3}4\. No$/);
});

test("two requests that end the same have different ids although the card text matches", () => {
  const a = parseAsk(LIVE("●", ["touch /tmp/a &&", "make &&", "make"]));
  const b = parseAsk(LIVE("●", ["rm -rf ~ &&", "make &&", "make"]));
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

// A rule-like line inside the command must not cut the id short, and nothing in the command
// is collapsed: the id is the raw dialog lines.
test("a command line drawn like a rule does not hide the lines above it from the id", () => {
  const a = parseAsk(LIVE("●", ["rm -rf ~", "───", "echo ok"]));
  const b = parseAsk(LIVE("●", ["touch /tmp/a", "───", "echo ok"]));
  assert.notEqual(a.id, b.id);
  assert.match(a.id, /rm -rf ~/);
});

test("commands that differ only in spacing have different ids", () => {
  assert.notEqual(parseAsk(LIVE("●", ['rm "a  b"'])).id, parseAsk(LIVE("●", ['rm "a b"'])).id);
});

// Forged structure: a command whose own lines start at column 0 and look like the dialog's
// rule and dashed frame. The id must not start inside the command: an ambiguous dialog gets
// no id at all (the card then offers no Yes / No).
test("a command that forges the dialog's rule and frame gets no id", () => {
  const forged = LIVE("●", ["rm -rf ~"]).replace(" rm -rf ~", ["───", " rm -rf ~", "───", "╌╌╌", " echo ok"].join("\n"));
  assert.equal(parseAsk(forged).id, "");
});

test("a rule-like line inside a boxed dialog does not cut the id short", () => {
  const boxed = FIXTURE.replace("│   touch /tmp/x", "│   rm -rf ~      │\n│   ───           │\n│   touch /tmp/x");
  assert.match(parseAsk(boxed).id, /rm -rf ~/);
});

test("no rule above the question: no id", () => {
  assert.equal(parseAsk(" Bash command\n touch x\n Do you want to proceed?\n ❯ 1. Yes\n   2. No\n").id, "");
});

// Review P1: a line's last characters are part of the command (a no-break space at the end
// of a heredoc or quoted line changes what runs), so the id keeps every line as read.
test("commands that differ only at the end of a line have different ids", () => {
  const id = (line) => parseAsk(LIVE("●", ["cat <<EOF", line, "EOF"])).id;
  assert.notEqual(id("a "), id("a"));
  // hc read already drops trailing ASCII spaces (checked live); parseAsk trims nothing itself.
  assert.notEqual(id("a "), id("a"));
});

// Review P2: in a boxed dialog the option lines start with the box's "│", then the cursor.
test("the request id ignores where the option cursor sits in a boxed dialog", () => {
  const moved = FIXTURE.replace("│ ❯ 1. Yes", "│   1. Yes").replace("│   4. No  ", "│ ❯ 4. No  ");
  assert.notEqual(moved, FIXTURE);
  assert.equal(parseAsk(moved).id, parseAsk(FIXTURE).id);
});

test("a boxed command line that looks like an option keeps its cursor in the id", () => {
  const box = (l) => FIXTURE.replace("│   touch /tmp/x  ", `│ ${l} 1. x       `);
  assert.notEqual(parseAsk(box(">")).id, parseAsk(box(" ")).id);
});
