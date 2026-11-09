// Run with: node --test
// scripts/check.sh, spawned under the PATH's sh against a throwaway copy of the repository in a
// temp directory: its own mods, its own tests, and a PATH holding only stand-ins (a herdr-app
// that fails a mod with a FAIL file in it, the real node, dirname; on Windows, also the shell's
// folder). It never touches the real repo's tests (that would run this file again) and never
// installs anything.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, readFileSync,
  existsSync, rmSync, chmodSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SH, EXE, which, linkTool, standInPath, shellPwd } from "./runtime/which.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "check.sh");
const temps = [];
after(() => { for (const t of temps) rmSync(t, { recursive: true, force: true }); });

// A repository with mods (name -> { broken }), one folder under mods/ that isn't a mod, and one
// test file that passes or fails, leaving a file named `ran` at the root once it has run.
function makeRepo({ mods = { alpha: {}, beta: {}, gamma: {} }, testsPass = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), "herdboard-check-repo-"));
  temps.push(root);
  mkdirSync(join(root, "scripts"));
  copyFileSync(SCRIPT, join(root, "scripts", "check.sh"));
  copyFileSync(join(dirname(SCRIPT), "typecheck.sh"), join(root, "scripts", "typecheck.sh"));
  mkdirSync(join(root, "node_modules", ".bin"), { recursive: true });
  const compiler = join(root, "node_modules", ".bin", "tsc");
  writeFileSync(compiler, '#!/bin/sh\n' +
    `echo "$2" >> '${join(root, "typechecked.log")}'\n` +
    'mod=${2%/tsconfig.json}\n[ ! -f "$mod/FAIL_TYPE" ]\n');
  chmodSync(compiler, 0o755);
  for (const [name, { broken }] of Object.entries(mods)) {
    mkdirSync(join(root, "mods", name), { recursive: true });
    writeFileSync(join(root, "mods", name, "mod.json"), "{}\n");
    if (broken) writeFileSync(join(root, "mods", name, "FAIL"), "");
  }
  mkdirSync(join(root, "mods", "not-a-mod"), { recursive: true });
  mkdirSync(join(root, "tests"));
  writeFileSync(join(root, "tests", "sample.test.js"),
    `import { test } from "node:test";\nimport { writeFileSync } from "node:fs";\n` +
    `test("sample", () => {\n  writeFileSync(new URL("../ran", import.meta.url), "");\n` +
    `  ${testsPass ? "" : "throw new Error('sample failed');"}\n});\n`);
  return root;
}

// A PATH directory with only the given tools. herdr-app accepts only `check <path>` and logs
// each checked path to `log`.
function makeBin(tools = ["herdr-app", "node"]) {
  const bin = mkdtempSync(join(tmpdir(), "herdboard-check-bin-"));
  temps.push(bin);
  const log = join(bin, "herdr-app.log");
  if (tools.includes("herdr-app")) {
    writeFileSync(join(bin, "herdr-app"),
      `#!/bin/sh\n[ "$1" = check ] || { echo "unexpected: herdr-app $*" >&2; exit 2; }\n` +
      `echo "$2" >> '${log}'\n` +
      `if [ -e "$2/FAIL" ]; then echo "check failed: $2" >&2; exit 1; fi\n` +
      `echo "check passed: $2"\n`);
    chmodSync(join(bin, "herdr-app"), 0o755);
  }
  if (tools.includes("node")) linkTool(process.execPath, join(bin, `node${EXE}`));
  linkTool(which("dirname"), join(bin, `dirname${EXE}`));
  linkTool(SH, join(bin, `sh${EXE}`));
  return { bin: standInPath(bin), log };
}

// Runs the repo's check.sh from an unrelated working directory with an explicit environment.
// That directory holds a failing test of its own, which check.sh must not pick up.
function check(root, bin) {
  const cwd = mkdtempSync(join(tmpdir(), "herdboard-check-cwd-"));
  temps.push(cwd);
  writeFileSync(join(cwd, "elsewhere.test.js"),
    `import { test } from "node:test";\ntest("elsewhere", () => { throw new Error("not ours"); });\n`);
  const r = spawnSync(SH, [join(root, "scripts", "check.sh")],
    { cwd, env: { PATH: bin, HOME: cwd }, encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}

const checked = (log) => existsSync(log) ? readFileSync(log, "utf8").trim().split("\n") : [];

// The mods' paths as check.sh hands them to herdr-app: "$ROOT/mods/<name>", ROOT from its pwd.
const modPaths = (root, names) => {
  const sroot = shellPwd(root);
  return names.map((m) => `${sroot}/mods/${m}`);
};

// The step names listed in the final summary after "Failed steps:" (none if it isn't there).
const failedSteps = (out) => {
  const at = out.lastIndexOf("Failed steps:");
  if (at < 0) return [];
  return out.slice(at).split("\n").slice(1)
    .filter((l) => l.startsWith("  - ")).map((l) => l.slice(4));
};

test("checks every mod and runs the tests, exit 0 when all pass", () => {
  const root = makeRepo();
  const { bin, log } = makeBin();
  const { code, out } = check(root, bin);
  assert.equal(code, 0, out);
  assert.deepEqual(checked(log).sort(),
    modPaths(root, ["alpha", "beta", "gamma"]));
  assert.match(out, /node --test/);
  assert.equal(readFileSync(join(root, "typechecked.log"), "utf8").trim().split("\n").length, 3);
  assert.match(out, /^PASS: TypeScript$/m);
  assert.match(out, /all checks passed/i);
});

test("a type error fails the complete gate while all mods and Node tests still run", () => {
  const root = makeRepo();
  writeFileSync(join(root, "mods", "beta", "FAIL_TYPE"), "");
  const { bin, log } = makeBin();
  const { code, out } = check(root, bin);
  assert.notEqual(code, 0, out);
  assert.equal(checked(log).length, 3);
  assert.equal(readFileSync(join(root, "typechecked.log"), "utf8").trim().split("\n").length, 3);
  assert.ok(existsSync(join(root, "ran")), "Node tests run after the failing typecheck");
  assert.deepEqual(failedSteps(out), ["TypeScript"]);
});

test("missing TypeScript fails the complete gate with the dependency setup command", () => {
  const root = makeRepo();
  rmSync(join(root, "node_modules", ".bin", "tsc"));
  const { bin } = makeBin();
  const { code, out } = check(root, bin);
  assert.notEqual(code, 0, out);
  assert.match(out, /TypeScript not installed: run npm ci/);
  assert.deepEqual(failedSteps(out), ["TypeScript"]);
});

test("a broken mod fails its step, the other mods and the tests still run", () => {
  const root = makeRepo({ mods: { alpha: {}, beta: { broken: true }, gamma: {} } });
  const { bin, log } = makeBin();
  const { code, out } = check(root, bin);
  assert.notEqual(code, 0, out);
  assert.deepEqual(checked(log).sort(),
    modPaths(root, ["alpha", "beta", "gamma"]));
  // The sample test's own trace and check.sh's verdict, not the node --test reporter's summary:
  // Node 22 prints it as TAP ("# pass 1") when stdout isn't a terminal, Node 24 as "ℹ pass 1".
  assert.ok(existsSync(join(root, "ran")), "node --test ran after the failing mod");
  assert.match(out, /^PASS: node --test$/m);
  assert.deepEqual(failedSteps(out), ["herdr-app check mods/beta"]);
  assert.doesNotMatch(out, /all checks passed/i);
});

test("a failing test fails the test step, after every mod was checked", () => {
  const root = makeRepo({ testsPass: false });
  const { bin, log } = makeBin();
  const { code, out } = check(root, bin);
  assert.notEqual(code, 0, out);
  assert.equal(checked(log).length, 3);
  assert.deepEqual(failedSteps(out), ["node --test"]);
});

for (const missing of ["herdr-app", "node"]) {
  test(`without ${missing} on PATH it names it and exits non-zero`, () => {
    const root = makeRepo();
    const { bin } = makeBin(["herdr-app", "node"].filter((t) => t !== missing));
    const { code, out } = check(root, bin);
    assert.notEqual(code, 0, out);
    assert.match(out, new RegExp(`^${missing} not found on PATH`, "m"));
    assert.doesNotMatch(out, /all checks passed/i);
  });
}
