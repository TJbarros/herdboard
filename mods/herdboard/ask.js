// What a blocked agent is asking, read from its screen. Pure: no herdr or gpui-kit imports,
// so it runs under `node --test` too (tests/ask.test.js).

// From the visible screen (hc read --lines 0: no scrolling), the question and up to two lines
// before it. Box-drawing frames, the input prompt and empty lines are dropped. No "?" on
// screen: no snippet (the card then says to open the terminal) rather than a wrong guess.
export function parseAsk(screen) {
  const lines = String(screen ?? "").split(/\r?\n/)
    .map(l => l.replace(/[│┃║╭╮╰╯┌┐└┘]/g, " ").replace(/\s+/g, " ").trim())
    .filter(l => l && !/^[─━═\-_▔▁\s]+$/.test(l) && !/^[❯>]\s*$/.test(l));
  let q = -1;
  for (let i = lines.length - 1; i >= 0; i--) if (/\?\s*$/.test(lines[i]) || /\?\s+\(/.test(lines[i])) { q = i; break; }
  if (q < 0) return { text: "", question: "", options: [] };
  // Keep the end: the question itself matters more than the lines leading to it.
  const text = lines.slice(Math.max(0, q - 2), q + 1).join("\n");
  return { text: text.length > 180 ? "…" + text.slice(-179) : text, question: lines[q], options: optionsAfter(lines, q) };
}

// The numbered options after the question ("❯ 1. Yes", "4. No"), in order 1, 2, 3…
// Other lines (a long option's wrapped tail, the "Esc to cancel" footer) are skipped.
function optionsAfter(lines, q) {
  const options = [];
  for (const l of lines.slice(q + 1)) {
    const m = /^(?:[❯>]\s*)?(\d+)\.\s+(.+)$/.exec(l);
    if (m && Number(m[1]) === options.length + 1) options.push({ n: options.length + 1, text: m[2].trim() });
  }
  return options;
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
