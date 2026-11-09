// The real compiler must check application calls against Herdr's generated types.
// All mutations stay in a temporary copy; this also detects blanket file suppressions.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, cpSync, appendFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

test("the real compiler checks a clean board without local config and rejects an invalid native call", () => {
  const root = mkdtempSync(join(tmpdir(), "herdboard-typecheck-"));
  try {
    const source = fileURLToPath(new URL("../mods/herdboard/", import.meta.url));
    cpSync(source, join(root, "board"), { recursive: true,
      filter: path => basename(path) !== "jsconfig.json" });
    const compiler = fileURLToPath(new URL("../node_modules/typescript/lib/tsc.js", import.meta.url));
    const check = () => spawnSync(process.execPath, [compiler, "--pretty", "false", "--project", join(root, "board", "tsconfig.json")], { encoding: "utf8" });
    const valid = check();
    assert.equal(valid.status, 0, valid.stdout + valid.stderr);
    appendFileSync(join(root, "board", "main.js"), '\ndiv().text_color("red");\n');
    const invalid = check();
    assert.notEqual(invalid.status, 0, "an invalid native call must fail typechecking");
    assert.match(invalid.stdout, /error TS2345/);
    assert.match(invalid.stdout, /Argument of type '"red"'/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
