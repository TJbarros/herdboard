import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractActivity } from "../mods/herdboard/activity.js";
const fixture = name => readFileSync(new URL(`./fixtures/activity/${name}`, import.meta.url), "utf8");
const claude = fixture("claude-code-2.1.319/working-wide.txt");
const narrow = fixture("claude-code-2.1.319/working-narrow.txt");
const codex = fixture("codex-0.167.0/working-wide.txt");
test("native Working screens expose the original current activity, in wide and narrow terminals", () => {
  assert.equal(extractActivity(claude, "claude-code"), "Aguarda 40s e imprime marcador de captura");
  assert.equal(extractActivity(narrow, "claude-code"), "Sublimating…");
  assert.equal(extractActivity(codex, "codex"), "Working");
  assert.equal(extractActivity(fixture("codex-0.167.0/working-narrow.txt"), "codex"), "Working");
});
test("history, submitted prompts, inactive phases, incomplete footers and pi stay unavailable", () => {
  for (const [screen, app] of [
    ["", "claude-code"], ["─\n❯ list files\nkeyboard hints", "claude-code"],
    ["An old tool finished\n──────────\n› Ask Codex to do anything", "codex"],
    [claude.replace("Infusing… (16s · ↓ 316 tokens)", "Sautéed for 16s · done 2:46 AM"), "claude-code"],
    [claude.replace(/─{8,}/g, ""), "claude-code"],
    [claude + "\n❯ A new task has been submitted\n", "claude-code"],
    [codex + "\n› New task\nprevious conversation\n", "codex"],
    [codex.replace("esc to interrupt", "other hint"), "codex"],
    [claude, "unknown"],
    [fixture("pi-0.85.1/unavailable-wide.txt"), "pi"],
    [fixture("pi-0.85.1/unavailable-narrow.txt"), "pi"],
    [fixture("pi-0.85.1/error-wide.txt"), "pi"],
  ]) assert.equal(extractActivity(screen, app), null, `must not select historical text for ${app}`);
});
test("a running Claude tool label is preferred only while its timer and command remain next to the live phase", () => {
  assert.equal(extractActivity(claude, "claude-code"), "Aguarda 40s e imprime marcador de captura");
  assert.equal(extractActivity(fixture("claude-code-2.1.319/tool-narrow.txt"), "claude-code"), "Aguarda 45s em Python e imprime 123");
  const historical = claude.replace("✻ Infusing…", "● Previous tool completed\n\n✻ Infusing…");
  assert.equal(extractActivity(historical, "claude-code"), "Infusing…", "a completed transcript tool is not the current action");
});
