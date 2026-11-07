// Run with: node --test
// scripts/uninstall.sh, spawned against temporary Herdr homes only. Never the real one: without
// HERDR_APP_HOME (or with it empty) the script resolves the real home and removes Herdboard from it.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL = path.join(REPO, "scripts", "install.sh");
const UNINSTALL = path.join(REPO, "scripts", "uninstall.sh");
const TMP = fs.realpathSync(os.tmpdir());

const temps = [];
const tmpdir = () => { const d = fs.mkdtempSync(path.join(TMP, "herdboard-test-")); temps.push(d); return d; };
after(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });

// The only way tests run the scripts (same guard as tests/install.test.js): HERDR_APP_HOME is
// always set, non-empty and under the system temp folder, or the test throws before spawning
// anything. They run from a folder outside the repo: the scripts must work from any directory.
function sh(home, shArgs, { PATH = process.env.PATH } = {}) {
  if (typeof home !== "string" || home === "" || !path.resolve(home).startsWith(TMP + path.sep)) {
    throw new Error(`refusing to run a script with HERDR_APP_HOME=${JSON.stringify(home)}`);
  }
  const env = { PATH, HOME: tmpdir(), HERDR_APP_HOME: home };
  return spawnSync("/bin/sh", shArgs, { env, cwd: tmpdir(), encoding: "utf8" });
}

const run = (home, args = [], opts) => sh(home, [UNINSTALL, ...args], opts);
const install = home => {
  const r = sh(home, [INSTALL]);
  assert.equal(r.status, 0, r.stderr);
};

// Every folder and every file's sha256 under `dir`, to tell whether anything changed.
function snapshot(dir) {
  const out = {};
  const walk = rel => {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) { out[r + "/"] = "dir"; walk(r); }
      else out[r] = createHash("sha256").update(fs.readFileSync(path.join(dir, r))).digest("hex");
    }
  };
  walk("");
  return out;
}

test("an unknown option prints a usage line, exits non-zero and leaves the home unchanged", () => {
  const home = tmpdir();
  install(home);
  const before = snapshot(home);
  for (const args of [["--dryrun"], ["--dry-run", "x"], ["x"]]) {
    const r = run(home, args);
    assert.notEqual(r.status, 0, args.join(" "));
    assert.match(r.stderr, /^usage: .*uninstall\.sh \[--dry-run\]\n$/);
    assert.equal(r.stdout, "");
  }
  assert.deepEqual(snapshot(home), before);
});

test("a missing home gives the install's error and exit code, with and without --dry-run", () => {
  const home = path.join(tmpdir(), "missing");
  const installed = sh(home, [INSTALL]);
  assert.equal(installed.status, 1);
  for (const args of [[], ["--dry-run"]]) {
    const r = run(home, args);
    assert.deepEqual([r.status, r.stdout, r.stderr], [installed.status, installed.stdout, installed.stderr]);
  }
  assert.equal(fs.existsSync(home), false);
});

// A home with things of the person's own around Herdboard: another layout, another mod, other
// key sections and Herdr's bookkeeping. Returns the keys of their own.
const THEIR_KEYS = {
  global: { "ctrl-q": { command: "app.quit" } },
  "layout:other": { "ctrl-shift-o": { command: "mod.open", args: { name: "other-mod" } } },
};
const THEIRS = ["layouts/other.json", "mods/other-mod/main.js", "mods/other-mod/mod.json",
  "shared.json", "seen.json", "installed.json"];
function homeWithTheirs() {
  const home = tmpdir();
  for (const f of THEIRS) {
    fs.mkdirSync(path.dirname(path.join(home, f)), { recursive: true });
    fs.writeFileSync(path.join(home, f), `{ "file": ${JSON.stringify(f)} }\n`);
  }
  fs.writeFileSync(path.join(home, "keys.json"), JSON.stringify(THEIR_KEYS));
  return home;
}

const OURS = /^(layouts\/herdboard\.json|mods\/herdboard(-picker|-new-menu)?\/)/;
const lines = (...l) => [...l, ""].join("\n");
const REMINDER = "Done. If Herdboard was your active layout, switch to another one in Herdr: Settings > Look > Layout.";

test("after an install, uninstall removes the layout, the three mods and the keys section, and nothing else", () => {
  const home = homeWithTheirs();
  install(home);
  const before = snapshot(home);
  const keysBefore = fs.readFileSync(path.join(home, "keys.json"));
  const r = run(home);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, "");
  assert.equal(r.stdout, lines(
    `Uninstalling Herdboard from ${home}`,
    "  removed    layouts/herdboard.json",
    "  removed    mods/herdboard/",
    "  removed    mods/herdboard-picker/",
    "  removed    mods/herdboard-new-menu/",
    "keys.json: removed 'layout:herdboard' (backup: keys.json.before-herdboard-uninstall)",
    REMINDER,
  ));
  const after = snapshot(home);
  const kept = Object.fromEntries(Object.entries(before).filter(([f]) => !OURS.test(f) && f !== "keys.json"));
  const { "keys.json": keys, "keys.json.before-herdboard-uninstall": backup, ...rest } = after;
  assert.deepEqual(rest, kept);
  assert.ok(keys && backup);
  assert.deepEqual(fs.readFileSync(path.join(home, "keys.json.before-herdboard-uninstall")), keysBefore);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, "keys.json"), "utf8")), THEIR_KEYS);
});
