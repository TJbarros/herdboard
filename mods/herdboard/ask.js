// What a blocked agent is asking, read from its screen. Pure: no herdr or gpui-kit imports,
// so it runs under `node --test` too (tests/ask.test.js).

const FRAME = /[│┃║╭╮╰╯┌┐└┘]/g;
const clean = (l) => l.replace(FRAME, " ").replace(/\s+/g, " ").trim();
const isRule = (l) => /^[─━═\-_▔▁\s]+$/.test(l);
const isQuestion = (l) => /\?\s*$/.test(l) || /\?\s+\(/.test(l);
const OPTION = /^(?:[❯>]\s*)?(\d+)\.\s+(.+)$/;

// From the visible screen (hc read --lines 0: no scrolling):
// - text: the question and up to two lines before it, for the card. Box-drawing frames, the
//   input prompt and empty lines are dropped. No "?" on screen: no snippet (the card then says
//   to open the terminal) rather than a wrong guess.
// - question and options: the last question and the numbered options after it.
// - id: the whole request, untruncated, to tell two requests apart (see requestId).
export function parseAsk(screen) {
  const raw = String(screen ?? "").split(/\r?\n/);
  const all = raw.map(clean);
  let q = -1;
  for (let i = all.length - 1; i >= 0; i--) if (isQuestion(all[i])) { q = i; break; }
  if (q < 0) return { text: "", question: "", options: [], id: "" };
  const before = all.slice(0, q).filter(l => l && !isRule(l) && !/^[❯>]\s*$/.test(l));
  // Keep the end: the question itself matters more than the lines leading to it.
  const text = [...before.slice(-2), all[q]].join("\n");
  const { options, end } = optionsAfter(all, q);
  return {
    text: text.length > 180 ? "…" + text.slice(-179) : text,
    question: all[q],
    options,
    id: requestId(raw, all, q, end),
  };
}

// The numbered options after the question ("❯ 1. Yes", "4. No"), in order 1, 2, 3…, and the
// line the last one is on. Other lines (a long option's wrapped tail, the "Esc to cancel"
// footer) are skipped.
function optionsAfter(lines, q) {
  const options = [];
  let end = q;
  for (let i = q + 1; i < lines.length; i++) {
    const m = OPTION.exec(lines[i]);
    if (m && Number(m[1]) === options.length + 1) { options.push({ n: options.length + 1, text: m[2].trim() }); end = i; }
  }
  return { options, end };
}

// The request as a whole, for the check before a key is pressed: the dialog's lines exactly as
// the screen has them (nothing collapsed or dropped: two commands that differ only in spacing
// are two requests), through the last option, with the option cursor ("❯") blanked, since
// moving it changes nothing a digit answers.
// Where the dialog starts: the solid rule that opens it (Claude Code draws one; a box's top edge
// counts too). Claude Code frames the command between two dashed lines ("╌"), so the rule is
// looked for above that frame: a command line drawn like a rule can't cut the command short.
// The screen above the dialog is left out: Claude Code blinks its tool line there ("●" on one
// read, a space on the next). No rule found: from the top of the screen (two reads may then
// differ, and the answer is refused: safe, not wrong).
function requestId(raw, all, q, end) {
  const dashed = (l) => /^╌{3,}$/.test(l);
  const solid = (l) => /^[─━═]{3,}$/.test(l);
  let from = q;
  const lower = all.findLastIndex((l, i) => i < q && dashed(l));
  if (lower >= 0) {
    const upper = all.findLastIndex((l, i) => i < lower && dashed(l));
    if (upper >= 0) from = upper;
  }
  const rule = all.findLastIndex((l, i) => i < from && solid(l));
  return raw.slice(rule + 1, end + 1)
    .map(l => l.replace(/^(\s*)[❯>](?=\s+\d+\.\s)/, "$1 ").trimEnd())
    .join("\n");
}

// The options a Yes / No button answers: the ones whose text is exactly "Yes" and "No".
// Null unless both are there, once each, with a one-key digit (hc keys presses one key).
export function pickAnswers(options) {
  const only = (label) => {
    const found = (options ?? []).filter(o => o.text === label);
    return found.length === 1 && found[0].n >= 1 && found[0].n <= 9 ? found[0] : null;
  };
  const yes = only("Yes"), no = only("No");
  return yes && no ? { yes, no } : null;
}
