// Run with: node --test
// scripts/install.sh, spawned against temporary Herdr homes only. Never the real one: without
// HERDR_APP_HOME (or with it empty) the script resolves the real home and installs into it.
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
const TMP = fs.realpathSync(os.tmpdir());

const temps = [];
const tmpdir = () => { const d = fs.mkdtempSync(path.join(TMP, "herdboard-test-")); temps.push(d); return d; };
after(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });

// The only way tests run the scripts: HERDR_APP_HOME is always set, non-empty and under the
// system temp folder, or the test throws before spawning anything. They run from a folder
// outside the repo: the scripts must work from any directory.
function sh(home, shArgs, { PATH = process.env.PATH } = {}) {
  if (typeof home !== "string" || home === "" || !path.resolve(home).startsWith(TMP + path.sep)) {
    throw new Error(`refusing to run a script with HERDR_APP_HOME=${JSON.stringify(home)}`);
  }
  const env = { PATH, HOME: tmpdir(), HERDR_APP_HOME: home };
  return spawnSync("/bin/sh", shArgs, { env, cwd: tmpdir(), encoding: "utf8" });
}

const run = (home, args = [], opts) => sh(home, [INSTALL, ...args], opts);

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

test("after a real install a dry run plans every file as unchanged and keeps the keys section", () => {
  const home = tmpdir();
  assert.equal(run(home).status, 0);
  const before = snapshot(home);
  const r = run(home, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(plan(r.stdout), every("unchanged"));
  assert.match(r.stdout, /^keys\.json: 'layout:herdboard' already there, left as it is$/m);
  assert.deepEqual(snapshot(home), before);
});

test("a dry run plans an installed file that was edited as overwrite", () => {
  const home = tmpdir();
  assert.equal(run(home).status, 0);
  fs.appendFileSync(path.join(home, "mods/herdboard/main.js"), "// mine\n");
  const before = snapshot(home);
  const r = run(home, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(plan(r.stdout), { ...every("unchanged"), "mods/herdboard/main.js": "overwrite" });
  assert.deepEqual(snapshot(home), before);
});

test("with a keys.json lacking the section, a dry run plans adding it with a backup, touching nothing", () => {
  const home = tmpdir();
  fs.writeFileSync(path.join(home, "keys.json"), '{ "global": {} }\n');
  const before = snapshot(home);
  const r = run(home, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^keys\.json: would add layout:herdboard \(backup: keys\.json\.before-herdboard\)$/m);
  assert.deepEqual(snapshot(home), before);
});

test("a missing home gives the same error and exit code with and without --dry-run", () => {
  const home = path.join(tmpdir(), "missing");
  const real = run(home);
  const dry = run(home, ["--dry-run"]);
  assert.equal(real.status, 1);
  assert.equal(real.stderr, `Herdr home not found: ${home} (open Herdr once, or set HERDR_APP_HOME)\n`);
  assert.deepEqual([dry.status, dry.stdout, dry.stderr], [real.status, real.stdout, real.stderr]);
  assert.equal(fs.existsSync(home), false);
});

const sha = file => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

test("a plain install copies every file, merges the keys section with a backup and prints as before", () => {
  const home = tmpdir();
  const mine = '{ "global": {} }\n';
  fs.writeFileSync(path.join(home, "keys.json"), mine);
  const r = run(home);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, [
    `Installing Herdboard into ${home}`,
    "keys.json: added layout:herdboard (backup: keys.json.before-herdboard)",
    "Done. In Herdr: Settings > Look > Layout > herdboard (or: herdr-app do layout.switch --name herdboard).",
    "",
  ].join("\n"));
  assert.equal(r.stderr, "");
  const files = Object.keys(snapshot(home)).filter(f => !f.endsWith("/")).sort();
  assert.deepEqual(files, [...INSTALLED, "keys.json", "keys.json.before-herdboard"].sort());
  for (const f of INSTALLED) assert.equal(sha(path.join(home, f)), sha(path.join(REPO, f)), f);
  assert.equal(fs.readFileSync(path.join(home, "keys.json.before-herdboard"), "utf8"), mine);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, "keys.json"), "utf8")),
    { global: {}, ...JSON.parse(fs.readFileSync(path.join(REPO, "keys.json"), "utf8")) });
});

// A PATH with every tool the script uses except python3.
function pathWithoutPython() {
  const bin = tmpdir();
  for (const tool of ["dirname", "basename", "cp", "mkdir", "cmp", "grep", "tr", "cat"]) {
    const found = spawnSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim();
    if (found) fs.symlinkSync(found, path.join(bin, tool));
  }
  return bin;
}

test("without python3 a dry run says to add the keys section by hand, as a real install does", () => {
  const home = tmpdir();
  const PATH = pathWithoutPython();
  const byHand = `python3 not found: add the section in keys.json from ${REPO}/keys.json by hand`;
  const dry = run(home, ["--dry-run"], { PATH });
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, new RegExp(`^${byHand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
  assert.deepEqual(snapshot(home), {});
  const real = run(home, [], { PATH });
  assert.equal(real.status, 0, real.stderr);
  assert.ok(real.stdout.split("\n").includes(byHand));
});

// scripts/common.sh, sourced the way install.sh (and later uninstall.sh) does.
const COMMON = path.join(REPO, "scripts", "common.sh");
const sourced = (home, body) => sh(home, ["-c", `set -eu; . "$1"; ${body}`, "sh", COMMON]);

test("sourcing common.sh prints nothing and names the layout and the mods", () => {
  const r = sourced(tmpdir(), 'printf "%s|%s" "$HERDBOARD_LAYOUT" "$HERDBOARD_MODS"');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, "");
  assert.equal(r.stdout, `herdboard|${MODS.join(" ")}`);
});

test("herdr_home prints HERDR_APP_HOME when that folder exists", () => {
  const home = tmpdir();
  const r = sourced(home, 'printf "[%s]" "$(herdr_home)"');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, `[${home}]`);
});

test("herdr_home fails with the install's error when the home doesn't exist", () => {
  const home = path.join(tmpdir(), "missing");
  const r = sourced(home, 'if home=$(herdr_home); then echo "found $home"; else echo "status $?"; fi');
  assert.equal(r.stdout, "status 1\n");
  assert.equal(r.stderr, `Herdr home not found: ${home} (open Herdr once, or set HERDR_APP_HOME)\n`);
});

test("install.sh takes the home and the names of what it installs from common.sh only", () => {
  const install = fs.readFileSync(INSTALL, "utf8");
  const owned = ["HERDR_APP_HOME:-", "cmd.exe", "/proc/version", ".config/herdr-app",
    "'layout:herdboard'", "layouts/herdboard.json", ...MODS.slice(1)];
  for (const s of owned) {
    assert.ok(!install.includes(s), `install.sh still has ${s}`);
  }
  assert.match(install, /^\. "\$SRC\/scripts\/common\.sh"$/m);
});
