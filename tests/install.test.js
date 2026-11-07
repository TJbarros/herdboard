// Run with: node --test
// scripts/install.sh, spawned against temporary Herdr homes only. Never the real one: without
// HERDR_APP_HOME (or with it empty) the script resolves the real home and installs into it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INSTALL = path.join(REPO, "scripts", "install.sh");
const TMP = fs.realpathSync(os.tmpdir());

const tmpdir = () => fs.mkdtempSync(path.join(TMP, "herdboard-test-"));

// The only way tests run the script: HERDR_APP_HOME is always set, non-empty and under the
// system temp folder, or the test throws before spawning anything.
function run(home, args = [], { PATH = process.env.PATH } = {}) {
  if (typeof home !== "string" || home === "" || !path.resolve(home).startsWith(TMP + path.sep)) {
    throw new Error(`refusing to run install.sh with HERDR_APP_HOME=${JSON.stringify(home)}`);
  }
  const env = { PATH, HOME: tmpdir(), HERDR_APP_HOME: home };
  // Run from a folder outside the repo: the script must work from any directory.
  return spawnSync("sh", [INSTALL, ...args], { env, cwd: tmpdir(), encoding: "utf8" });
}

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
  const r = run(home, ["--dryrun"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /^usage: .*install\.sh \[--dry-run\]\n$/);
  assert.deepEqual(snapshot(home), {});
});

// What a real install copies, relative to the Herdr home: the layout and every file of the
// three mods (the script's `*` glob skips dotfiles).
const MODS = ["herdboard", "herdboard-picker", "herdboard-new-menu"];
const INSTALLED = [
  "layouts/herdboard.json",
  ...MODS.flatMap(m => fs.readdirSync(path.join(REPO, "mods", m))
    .filter(f => !f.startsWith(".")).map(f => `mods/${m}/${f}`)),
].sort();

// The planned copies a dry run prints, as { "mods/herdboard/main.js": "new", ... }.
const plan = stdout => Object.fromEntries(
  [...stdout.matchAll(/^ +(new|overwrite|unchanged) +(\S+)$/gm)].map(([, state, file]) => [file, state]));

const every = state => Object.fromEntries(INSTALLED.map(f => [f, state]));

test("a dry run on an empty home plans every file as new and keys.json as created, touching nothing", () => {
  const home = tmpdir();
  const r = run(home, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, new RegExp(`^Herdr home: ${home}$`, "m"));
  assert.deepEqual(plan(r.stdout), every("new"));
  assert.match(r.stdout, /^keys\.json: would be created with layout:herdboard$/m);
  assert.deepEqual(snapshot(home), {});
});
