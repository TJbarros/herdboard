// The sandbox for the tests that spawn scripts/install.sh, update.sh and uninstall.sh: temp
// folders removed after the file's tests, and the one guard every spawn's HERDR_APP_HOME goes
// through. Never the real Herdr home: without HERDR_APP_HOME (or with it empty) the scripts
// resolve the real one and install into it, update it or remove Herdboard from it.
import { after } from "node:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const TMP = fs.realpathSync(os.tmpdir());

const temps = [];
after(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });

// A new empty folder under TMP, removed after the file's tests.
export function tmpdir(prefix = "herdboard-test-") {
  const d = fs.mkdtempSync(path.join(TMP, prefix));
  temps.push(d);
  return d;
}

// The guard: returns `home` resolved, or throws unless it is a non-empty string naming a path
// under TMP (TMP itself isn't). Call it for every HERDR_APP_HOME a script is spawned with.
export function tempHome(home) {
  if (typeof home !== "string" || home === "" || !path.resolve(home).startsWith(TMP + path.sep)) {
    throw new Error(`refusing to run a script with HERDR_APP_HOME=${JSON.stringify(home)}`);
  }
  return path.resolve(home);
}

// Runs /bin/sh with `shArgs` and nothing from this process's environment but PATH: HOME and the
// working folder are fresh temp folders (the scripts must work from any directory), and
// HERDR_APP_HOME is `home`, guarded.
export function sh(home, shArgs, { PATH = process.env.PATH } = {}) {
  const env = { PATH, HOME: tmpdir(), HERDR_APP_HOME: tempHome(home) };
  return spawnSync("/bin/sh", shArgs, { env, cwd: tmpdir(), encoding: "utf8" });
}

// HERDBOARD_MODS from scripts/common.sh, sourced the way the scripts do.
export const COMMON = path.join(REPO, "scripts", "common.sh");
export const MODS = (() => {
  const r = sh(tmpdir(), ["-c", '. "$1"; printf %s "$HERDBOARD_MODS"', "sh", COMMON]);
  if (r.status !== 0 || r.stdout === "") throw new Error(`sourcing common.sh failed: ${r.stderr}`);
  return r.stdout.split(" ");
})();

// Every folder and every file's sha256 under `dir`, to tell whether anything changed.
export function snapshot(dir) {
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

// A PATH folder with every tool the scripts use except python3.
export function pathWithoutPython() {
  const bin = tmpdir();
  for (const tool of ["dirname", "basename", "cp", "mkdir", "cmp", "grep", "tr", "cat", "rm"]) {
    const found = spawnSync("sh", ["-c", `command -v ${tool}`], { encoding: "utf8" }).stdout.trim();
    if (found) fs.symlinkSync(found, path.join(bin, tool));
  }
  return bin;
}
