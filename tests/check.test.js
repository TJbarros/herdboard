// Run with: node --test
// scripts/check.sh, spawned under /bin/sh against a throwaway copy of the repository in a temp
// directory: its own mods, its own tests, and a PATH holding only stand-ins (a herdr-app that
// fails a mod with a FAIL file in it, the real node, dirname). It never touches the real repo's
// tests (that would run this file again) and never installs anything.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, symlinkSync, readFileSync,
  existsSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "check.sh");
const temps = [];
after(() => { for (const t of temps) rmSync(t, { recursive: true, force: true }); });

// A repository with mods (name -> { broken }), one folder under mods/ that isn't a mod, and one
// test file that passes or fails.
function makeRepo({ mods = { alpha: {}, beta: {}, gamma: {} }, testsPass = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "herdboard-check-repo-"));
  temps.push(root);
  mkdirSync(join(root, "scripts"));
  copyFileSync(SCRIPT, join(root, "scripts", "check.sh"));
  for (const [name, { broken }] of Object.entries(mods)) {
    mkdirSync(join(root, "mods", name), { recursive: true });
    writeFileSync(join(root, "mods", name, "mod.json"), "{}\n");
    if (broken) writeFileSync(join(root, "mods", name, "FAIL"), "");
  }
  mkdirSync(join(root, "mods", "not-a-mod"), { recursive: true });
  mkdirSync(join(root, "tests"));
  writeFileSync(join(root, "tests", "sample.test.js"),
    `import { test } from "node:test";\n` +
    `test("sample", () => { ${testsPass ? "" : "throw new Error('sample failed');"} });\n`);
  return root;
}

// A PATH directory with only the given tools. herdr-app logs each checked path to `log`.
function makeBin(tools = ["herdr-app", "node"]) {
  const bin = mkdtempSync(join(tmpdir(), "herdboard-check-bin-"));
  temps.push(bin);
  const log = join(bin, "herdr-app.log");
  if (tools.includes("herdr-app")) {
    writeFileSync(join(bin, "herdr-app"),
      `#!/bin/sh\necho "$2" >> '${log}'\n` +
      `if [ -e "$2/FAIL" ]; then echo "check failed: $2" >&2; exit 1; fi\n` +
      `echo "check passed: $2"\n`);
    chmodSync(join(bin, "herdr-app"), 0o755);
  }
  if (tools.includes("node")) symlinkSync(process.execPath, join(bin, "node"));
  symlinkSync(execFileSync("/bin/sh", ["-c", "command -v dirname"]).toString().trim(),
    join(bin, "dirname"));
  return { bin, log };
}

// Runs the repo's check.sh from an unrelated working directory with an explicit environment.
function check(root, bin) {
  const cwd = mkdtempSync(join(tmpdir(), "herdboard-check-cwd-"));
  temps.push(cwd);
  const r = spawnSync("/bin/sh", [join(root, "scripts", "check.sh")],
    { cwd, env: { PATH: bin, HOME: cwd }, encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}

const checked = (log) => existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [];

test("checks every mod and runs the tests, exit 0 when all pass", () => {
  const root = makeRepo();
  const { bin, log } = makeBin();
  const { code, out } = check(root, bin);
  assert.equal(code, 0, out);
  assert.deepEqual(checked(log).sort(),
    ["alpha", "beta", "gamma"].map((m) => join(root, "mods", m)));
  assert.match(out, /node --test/);
  assert.match(out, /all checks passed/i);
});
