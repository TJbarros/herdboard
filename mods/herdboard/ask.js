// What a blocked agent is asking, read from its screen. Pure: no herdr or gpui-kit imports,
// so it runs under `node --test` too (tests/ask.test.js).

const FRAME = /[│┃║╭╮╰╯┌┐└┘]/g;
const clean = (l) => l.replace(FRAME, " ").replace(/\s+/g, " ").trim();
// Horizontal glyphs only, listed one by one: a range of the Box Drawing block would also take
// vertical glyphs and corners (╎ ┆ ├ ┼ …) that FRAME keeps.
const isRule = (l) => /^[─━┄┅┈┉╌╍═╴╶╸╺╼╾\-_▔▁\s]+$/.test(l);
const isQuestion = (l) => /\?\s*$/.test(l) || /\?\s+\(/.test(l);
const OPTION = /^(?:[❯>]\s*)?(\d+)\.\s+(.+)$/;

// From the visible screen (hc read --lines 0: no scrolling):
// - text: the question and up to two lines before it, for the card. Box-drawing frames, the
//   input prompt and empty lines are dropped. No "?" on screen: no snippet (the card then says
//   to open the terminal) rather than a wrong guess.
// - question and options: the last question and the numbered options after it.
// - id: the whole request, untruncated, to tell two requests apart; "" when the dialog's shape
//   is in doubt (see requestId).
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
// the screen has them (nothing collapsed, trimmed or dropped: two commands that differ only in
// spacing, or by a no-break space at the end of a line, are two requests), through the last
// option. Only the option cursor ("❯", after the box's "│" in a boxed dialog) is blanked, and
// only on the lines after the question, since moving it changes nothing a digit answers: the
// request above the question stays byte for byte (a heredoc's "> 1. x" line is not a cursor).
// The screen above the dialog is left out: Claude Code blinks its tool line there ("●" on one
// read, a space on the next).
// The dialog opens with a rule at column 0: Claude Code's full-width "───", or a box's "╭───╮".
// Command lines can't start one: Claude Code indents them, and a box's start with "│".
// Claude Code frames the command between two dashed lines ("╌"), so a forged rule inside the
// command would have a dashed line above it. Any doubt (no rule, a dashed line above the rule,
// other than 0 or 2 dashed lines below it): no id, and the card offers no Yes / No.
function requestId(raw, all, q, end) {
  const dashed = (l) => /^╌{3,}$/.test(l);
  const rule = raw.findLastIndex((l, i) => i < q && /^(?:[─━═]{3,}|╭─+╮)\s*$/.test(l));
  if (rule < 0 || all.slice(0, rule).some(dashed)) return "";
  const frame = all.slice(rule + 1, q).filter(dashed).length;
  if (frame !== 0 && frame !== 2) return "";
  return raw.slice(rule + 1, end + 1)
    .map((l, j) => (rule + 1 + j > q ? l.replace(/^(\s*(?:│\s*)?)[❯>](?=\s+\d+\.\s)/, "$1 ") : l))
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
