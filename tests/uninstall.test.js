// Run with: node --test
// scripts/uninstall.sh, spawned against temporary Herdr homes only. Never the real one: without
// HERDR_APP_HOME (or with it empty) the script resolves the real home and removes Herdboard from it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { REPO, MODS, tmpdir, sh, snapshot, pathWithoutPython } from "./runtime/sandbox.mjs";

const INSTALL = path.join(REPO, "scripts", "install.sh");
const UNINSTALL = path.join(REPO, "scripts", "uninstall.sh");

// Every spawn goes through sh() from tests/runtime/sandbox.mjs, which refuses a HERDR_APP_HOME
// that isn't under the system temp folder.
const run = (home, args = [], opts) => sh(home, [UNINSTALL, ...args], opts);
const install = home => {
  const r = sh(home, [INSTALL]);
  assert.equal(r.status, 0, r.stderr);
};

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

// What install.sh puts in a home, as paths relative to it: the layout and the mods' folders.
const ours = f => f === "layouts/herdboard.json" || MODS.some(m => f.startsWith(`mods/${m}/`));
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
  const kept = Object.fromEntries(Object.entries(before).filter(([f]) => !ours(f) && f !== "keys.json"));
  const { "keys.json": keys, "keys.json.before-herdboard-uninstall": backup, ...rest } = after;
  assert.deepEqual(rest, kept);
  assert.ok(keys && backup);
  assert.deepEqual(fs.readFileSync(path.join(home, "keys.json.before-herdboard-uninstall")), keysBefore);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(home, "keys.json"), "utf8")), THEIR_KEYS);
});

test("when the keys section was all keys.json had, keys.json is deleted and the backup kept", () => {
  const home = tmpdir();
  install(home);
  const keysBefore = fs.readFileSync(path.join(home, "keys.json"));
  const r = run(home);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout,
    /^keys\.json: deleted, 'layout:herdboard' was all it had \(backup: keys\.json\.before-herdboard-uninstall\)$/m);
  assert.deepEqual(snapshot(home), { "layouts/": "dir", "mods/": "dir",
    "keys.json.before-herdboard-uninstall": createHash("sha256").update(keysBefore).digest("hex") });
});

test("without the keys section, keys.json is left byte for byte and no backup is made", () => {
  const home = tmpdir();
  install(home);
  const mine = '{"global":{},\n  "layout:other" : {}}';
  fs.writeFileSync(path.join(home, "keys.json"), mine);
  const r = run(home);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^keys\.json: no 'layout:herdboard' section, left as it is$/m);
  assert.equal(fs.readFileSync(path.join(home, "keys.json"), "utf8"), mine);
  assert.equal(fs.existsSync(path.join(home, "keys.json.before-herdboard-uninstall")), false);
});

test("a second run reports every part as missing, changes nothing and exits 0", () => {
  const home = homeWithTheirs();
  install(home);
  assert.equal(run(home).status, 0);
  const before = snapshot(home);
  const r = run(home);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, lines(
    `Uninstalling Herdboard from ${home}`,
    "  missing    layouts/herdboard.json (skipped)",
    "  missing    mods/herdboard/ (skipped)",
    "  missing    mods/herdboard-picker/ (skipped)",
    "  missing    mods/herdboard-new-menu/ (skipped)",
    "keys.json: no 'layout:herdboard' section, left as it is",
    REMINDER,
  ));
  assert.deepEqual(snapshot(home), before);
});

test("a part removed by hand is reported missing while the rest is removed", () => {
  const home = tmpdir();
  install(home);
  fs.rmSync(path.join(home, "mods/herdboard-picker"), { recursive: true });
  const r = run(home);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^ {2}missing {4}mods\/herdboard-picker\/ \(skipped\)$/m);
  assert.match(r.stdout, /^ {2}removed {4}mods\/herdboard-new-menu\/$/m);
  assert.deepEqual(Object.keys(snapshot(home)).filter(ours), []);
});

test("a keys.json that isn't a JSON object stops it before anything is removed, with or without --dry-run", () => {
  for (const broken of ['{ "global": {', "[]"]) {
    const home = tmpdir();
    install(home);
    fs.writeFileSync(path.join(home, "keys.json"), broken);
    const before = snapshot(home);
    for (const args of [[], ["--dry-run"]]) {
      const r = run(home, args);
      assert.notEqual(r.status, 0, `${broken} ${args}`);
      assert.match(r.stderr, new RegExp(`^keys\\.json is not a JSON object .*: fix or remove ${home}/keys\\.json, then run this again; nothing was removed\\n$`));
      assert.equal(r.stdout, "");
      assert.deepEqual(snapshot(home), before);
    }
  }
});

test("a dry run lists every removal and the keys change, and leaves the home byte for byte", () => {
  const home = homeWithTheirs();
  install(home);
  const before = snapshot(home);
  const r = run(home, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stdout, lines(
    "Dry run: nothing is removed or changed.",
    `Herdr home: ${home}`,
    "Files:",
    "  remove     layouts/herdboard.json",
    "  remove     mods/herdboard/",
    "  remove     mods/herdboard-picker/",
    "  remove     mods/herdboard-new-menu/",
    "keys.json: would remove 'layout:herdboard' (backup: keys.json.before-herdboard-uninstall)",
    "Dry run done: run scripts/uninstall.sh without --dry-run to uninstall.",
  ));
  assert.deepEqual(snapshot(home), before);
});

test("a dry run says keys.json would be deleted when the section is all it has", () => {
  const home = tmpdir();
  install(home);
  const before = snapshot(home);
  const r = run(home, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout,
    /^keys\.json: would be deleted, 'layout:herdboard' is all it has \(backup: keys\.json\.before-herdboard-uninstall\)$/m);
  assert.deepEqual(snapshot(home), before);
});

test("a dry run after an uninstall reports every part as missing", () => {
  const home = tmpdir();
  install(home);
  assert.equal(run(home).status, 0);
  const before = snapshot(home);
  const r = run(home, ["--dry-run"]);
  assert.equal(r.status, 0, r.stderr);
  assert.equal((r.stdout.match(/^ {2}missing {4}\S+ \(skipped\)$/gm) || []).length, 4);
  assert.match(r.stdout, /^keys\.json: not there, skipped$/m);
  assert.deepEqual(snapshot(home), before);
});

test("without python3 it removes the files and says to remove the keys section by hand", () => {
  const home = homeWithTheirs();
  install(home);
  const keysBefore = fs.readFileSync(path.join(home, "keys.json"));
  const byHand = `python3 not found: remove the 'layout:herdboard' section from ${home}/keys.json by hand`;
  const PATH = pathWithoutPython();
  const dry = run(home, ["--dry-run"], { PATH });
  assert.equal(dry.status, 0, dry.stderr);
  assert.ok(dry.stdout.split("\n").includes(byHand), dry.stdout);
  const r = run(home, [], { PATH });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.split("\n").includes(byHand), r.stdout);
  assert.ok(r.stdout.endsWith(`${REMINDER}\n`));
  assert.deepEqual(Object.keys(snapshot(home)).filter(ours), []);
  assert.deepEqual(fs.readFileSync(path.join(home, "keys.json")), keysBefore);
  assert.equal(fs.existsSync(path.join(home, "keys.json.before-herdboard-uninstall")), false);
});

test("a mod folder that is a symlink is unlinked, not emptied", () => {
  const home = tmpdir();
  install(home);
  const elsewhere = tmpdir();
  fs.writeFileSync(path.join(elsewhere, "keep.js"), "// keep\n");
  fs.rmSync(path.join(home, "mods/herdboard"), { recursive: true });
  fs.symlinkSync(elsewhere, path.join(home, "mods/herdboard"));
  const r = run(home);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /^ {2}removed {4}mods\/herdboard\/$/m);
  assert.equal(fs.existsSync(path.join(home, "mods/herdboard")), false);
  assert.equal(fs.readFileSync(path.join(elsewhere, "keep.js"), "utf8"), "// keep\n");
});

test("uninstall.sh takes the home and the names of what it removes from common.sh only", () => {
  const uninstall = fs.readFileSync(UNINSTALL, "utf8");
  const owned = ["HERDR_APP_HOME:-", "cmd.exe", "/proc/version", ".config/herdr-app",
    "'layout:herdboard'", "layouts/herdboard.json", ...MODS.filter(m => m !== "herdboard")];
  for (const s of owned) {
    assert.ok(!uninstall.includes(s), `uninstall.sh has ${s}`);
  }
  assert.match(uninstall, /^\. "\$SRC\/scripts\/common\.sh"$/m);
});
