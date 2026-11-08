// Run with: node --test
// scripts/install.sh, spawned against temporary Herdr homes only. Never the real one: without
// HERDR_APP_HOME (or with it empty) the script resolves the real home and installs into it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { shellPwd } from "./runtime/which.mjs";
import { REPO, COMMON, MODS, tmpdir, sh, snapshot, pathWithoutPython, escapeRegExp } from "./runtime/sandbox.mjs";

const INSTALL = path.join(REPO, "scripts", "install.sh");

// Every spawn goes through sh() from tests/runtime/sandbox.mjs, which refuses a HERDR_APP_HOME
// that isn't under the system temp folder.
const run = (home, args = [], opts) => sh(home, [INSTALL, ...args], opts);

test("an unknown option prints a usage line, exits non-zero and leaves the home unchanged", () => {
  const home = tmpdir();
  const r = run(home, ["--dryrun"]);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /^usage: .*install\.sh \[--dry-run\]\n$/);
  assert.deepEqual(snapshot(home), {});
});

// What a real install copies, relative to the Herdr home: the layout and every file of the
// mods common.sh names (the script's `*` glob skips dotfiles).
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
  assert.match(r.stdout, new RegExp(`^Herdr home: ${escapeRegExp(home)}$`, "m"));
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

test("without python3 a dry run says to add the keys section by hand, as a real install does", () => {
  const home = tmpdir();
  const PATH = pathWithoutPython();
  // The script prints its ROOT as its shell sees it (/tmp/... under Git Bash), not as Node does.
  const byHand = `python3 not found: add the section in keys.json from ${shellPwd(REPO)}/keys.json by hand`;
  const dry = run(home, ["--dry-run"], { PATH });
  assert.equal(dry.status, 0, dry.stderr);
  assert.match(dry.stdout, new RegExp(`^${escapeRegExp(byHand)}$`, "m"));
  assert.deepEqual(snapshot(home), {});
  const real = run(home, [], { PATH });
  assert.equal(real.status, 0, real.stderr);
  assert.ok(real.stdout.split("\n").includes(byHand));
});

// scripts/common.sh, sourced the way install.sh and uninstall.sh do.
const sourced = (home, body) => sh(home, ["-c", `set -eu; . "$1"; ${body}`, "sh", COMMON]);

test("sourcing common.sh prints nothing and names the layout and the mods", () => {
  const r = sourced(tmpdir(), 'printf "%s|%s" "$HERDBOARD_LAYOUT" "$HERDBOARD_MODS"');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, "");
  assert.equal(r.stdout, "herdboard|herdboard herdboard-picker herdboard-new-menu");
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
    "'layout:herdboard'", "layouts/herdboard.json", ...MODS.filter(m => m !== "herdboard")];
  for (const s of owned) {
    assert.ok(!install.includes(s), `install.sh still has ${s}`);
  }
  assert.match(install, /^\. "\$ROOT\/scripts\/common\.sh"$/m);
});
