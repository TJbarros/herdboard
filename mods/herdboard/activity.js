// Captured live progress formats only; transcript messages and tool output are not activity.
// Evidence and configuration: docs/issue-25-verification.md.
/** @param {unknown} screen @param {string} app */
export function extractActivity(screen, app) {
  if (typeof screen !== "string") return null;
  const lines = screen.replace(/\r/g, "").split("\n").map(s => s.trim());
  const last = lines.findLast(s => s.length);
  if (app === "claude-code") {
    if (!last?.startsWith("⏵⏵ bypass permissions on")) return null;
    const prompt = lines.findLastIndex(s => /^❯[\s\u00a0]*$/.test(s));
    if (prompt < 2 || !/^─{8,}$/.test(lines[prompt - 1]) || !/^─{8,}$/.test(lines[prompt + 1] ?? "")) return null;
    let i = prompt - 2;
    while (i >= 0 && (!lines[i] || /^⎿\s+Tip:/.test(lines[i]))) i--;
    const phase = /^[·✻✶] (\p{L}[^()]*…) \((?=[^\n]*\b\d+s\b)[^\n]+\)$/u.exec(lines[i] ?? "");
    if (phase) {
      let tool = i - 1;
      while (tool >= 0 && (!lines[tool] || lines[tool] === "(ctrl+b to run in background)")) tool--;
      if (/^⎿\s+\$ .+/.test(lines[tool] ?? "")) {
        tool--;
        const label = /^(.+) · \d+s$/.exec(lines[tool] ?? "");
        if (label) return label[1];
      }
    }
    return phase?.[1] ?? null;
  }
  if (app === "codex") {
    const prompt = lines.findLastIndex(s => s === "› Ask Codex to do anything");
    if (prompt < 1 || !/^GPT-6\.1-Sol xhigh · /.test(last ?? "") || lines.slice(prompt + 1).filter(Boolean).length !== 1) return null;
    let i = prompt - 1;
    while (i >= 0 && !lines[i]) i--;
    const phase = /^[•◦] (Working) \((?:\d+m )?\d+s • esc to interrupt\)(?: · .*)?$/.exec(lines[i] ?? "");
    return phase?.[1] ?? null;
  }
  return null;
}
