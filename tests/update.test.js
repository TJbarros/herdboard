// Run with: node --test
// scripts/update.sh against throwaway clones of a local bare repo, all under os.tmpdir().
// Never GitHub, never this clone, never the real Herdr home: the install step is a stub
// that writes a marker into HERDR_APP_HOME, which every spawn points at a temp dir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { REPO, tmpdir, tempHome } from "./runtime/sandbox.mjs";

const UPDATE = path.join(REPO, "scripts", "update.sh");
const tempDir = () => tmpdir("herdboard-update-");

// The only way an env reaches a child process: HERDR_APP_HOME goes through the guard in
// tests/runtime/sandbox.mjs, which throws unless it is a path under the system temp folder.
function envFor(home) {
  return {
    ...process.env,
    HERDR_APP_HOME: tempHome(home),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_TERMINAL_PROMPT: "0",
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.invalid",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.invalid",
  };
}

function run(cmd, args, { cwd, home }) {
  return spawnSync(cmd, args, { cwd, env: envFor(home), encoding: "utf8" });
}

// Install stub: proves the install ran, which version of it ran and with which arguments.
const stub = (version) =>
  `#!/usr/bin/env sh\nset -eu\nprintf '%s %s|%s\\n' ${version} "$#" "$*" > "\${HERDR_APP_HOME:?}/installed"\n`;

// A clone (subject) of a bare repo (upstream), and a second clone (seed) that pushes to it.
function fixture() {
  const root = tempDir();
  const home = path.join(root, "herdr-home");
  fs.mkdirSync(home);
  const elsewhere = path.join(root, "elsewhere");
  fs.mkdirSync(elsewhere);
  const seed = path.join(root, "seed");
  const upstream = path.join(root, "upstream.git");
  const clone = path.join(root, "herdboard");
  const git = (cwd, ...args) => {
    const r = run("git", args, { cwd, home });
    if (r.status !== 0) throw new Error(`git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
  };
  fs.mkdirSync(path.join(seed, "scripts"), { recursive: true });
  fs.copyFileSync(UPDATE, path.join(seed, "scripts", "update.sh"));
  fs.writeFileSync(path.join(seed, "scripts", "install.sh"), stub("v1"), { mode: 0o755 });
  fs.chmodSync(path.join(seed, "scripts", "update.sh"), 0o755);
  fs.writeFileSync(path.join(seed, "README.md"), "herdboard\n");
  fs.writeFileSync(path.join(seed, "keys.json"), "{}\n");
  git(root, "init", "-q", "-b", "main", seed);
  git(seed, "add", ".");
  git(seed, "commit", "-q", "-m", "v1");
  git(root, "init", "-q", "--bare", "-b", "main", upstream);
  git(seed, "remote", "add", "origin", upstream);
  git(seed, "push", "-q", "-u", "origin", "main");
  git(root, "clone", "-q", upstream, clone);

  const f = {
    root, home, elsewhere, seed, clone, git,
    head: () => git(clone, "rev-parse", "HEAD"),
    installed: () => {
      const p = path.join(home, "installed");
      return fs.existsSync(p) ? fs.readFileSync(p, "utf8").trim() : null;
    },
    // Pushes a new upstream commit; the clone is then one behind.
    pushUpstream(files = { "README.md": "herdboard v2\n", "scripts/install.sh": stub("v2") }) {
      for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(seed, name), text);
      git(seed, "add", ".");
      git(seed, "commit", "-q", "-m", "upstream change");
      git(seed, "push", "-q");
    },
    update: (cwd = elsewhere) => run("sh", [path.join(clone, "scripts", "update.sh")], { cwd, home }),
  };
  return f;
}

test("already up to date: installs anyway, with no arguments, and exits 0", () => {
  const f = fixture();
  const r = f.update();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(f.installed(), "v1 0|");
});

test("any argument: prints the usage line, exits 2, and fetches, pulls and installs nothing", () => {
  const f = fixture();
  f.pushUpstream();
  const before = f.head();
  const fetched = f.git(f.clone, "rev-parse", "origin/main");
  for (const args of [["--dry-run"], ["x"], ["--dry-run", "x"]]) {
    const r = run("sh", [path.join(f.clone, "scripts", "update.sh"), ...args], { cwd: f.elsewhere, home: f.home });
    assert.equal(r.status, 2, args.join(" "));
    assert.match(r.stderr, /^usage: .*update\.sh\n$/);
    assert.equal(r.stdout, "");
  }
  assert.equal(f.head(), before);
  assert.equal(f.git(f.clone, "rev-parse", "origin/main"), fetched);
  assert.equal(f.installed(), null);
});

test("behind its upstream, run from another directory: pulls, runs the pulled install, exits 0", () => {
  const f = fixture();
  f.pushUpstream();
  const r = f.update(f.elsewhere);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(f.head(), f.git(f.seed, "rev-parse", "HEAD"));
  assert.equal(fs.readFileSync(path.join(f.clone, "README.md"), "utf8"), "herdboard v2\n");
  assert.equal(f.installed(), "v2 0|");
});

for (const staged of [false, true]) {
  test(`a ${staged ? "staged" : "unstaged"} edit to a tracked file: lists it, suggests stash or commit, pulls and installs nothing`, () => {
    const f = fixture();
    f.pushUpstream();
    const before = f.head();
    const fetched = f.git(f.clone, "rev-parse", "origin/main");
    // A file the upstream change doesn't touch, so git itself would let the pull through.
    fs.writeFileSync(path.join(f.clone, "keys.json"), '{"mine": 1}\n');
    if (staged) f.git(f.clone, "add", "keys.json");
    const r = f.update();
    assert.notEqual(r.status, 0);
    const out = r.stdout + r.stderr;
    assert.match(out, /keys\.json/);
    // Popped edits are only in the clone until installed again.
    assert.match(out, /git stash && scripts\/update\.sh && git stash pop && scripts\/install\.sh/);
    // A local commit can't fast-forward: the hint says how to bring it along.
    assert.match(out, /commit/);
    assert.match(out, /git pull --rebase/);
    assert.equal(f.head(), before);
    assert.equal(f.git(f.clone, "rev-parse", "origin/main"), fetched, "fetched before refusing");
    assert.equal(fs.readFileSync(path.join(f.clone, "keys.json"), "utf8"), '{"mine": 1}\n');
    assert.equal(f.installed(), null);
  });
}

test("only an untracked file in the clone: the update goes ahead and keeps it", () => {
  const f = fixture();
  f.pushUpstream();
  fs.writeFileSync(path.join(f.clone, "scratch.txt"), "mine\n");
  const r = f.update();
  assert.equal(r.status, 0, r.stderr);
  assert.equal(f.installed(), "v2 0|");
  assert.equal(fs.readFileSync(path.join(f.clone, "scratch.txt"), "utf8"), "mine\n");
});

test("an untracked file the pull would overwrite: git refuses, nothing is installed", () => {
  const f = fixture();
  f.pushUpstream({ "new.txt": "theirs\n" });
  const before = f.head();
  fs.writeFileSync(path.join(f.clone, "new.txt"), "mine\n");
  const r = f.update();
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /not applied/i);
  assert.equal(f.head(), before);
  assert.equal(fs.readFileSync(path.join(f.clone, "new.txt"), "utf8"), "mine\n");
  assert.equal(f.installed(), null);
});

const localCommit = (f) => {
  fs.writeFileSync(path.join(f.clone, "local.txt"), "local\n");
  f.git(f.clone, "add", "local.txt");
  f.git(f.clone, "commit", "-q", "-m", "local");
};
const cannotFastForward = {
  "a diverged branch": (f) => localCommit(f),
  "a diverged branch with pull.rebase=true": (f) => {
    localCommit(f);
    f.git(f.clone, "config", "pull.rebase", "true");
  },
  "a detached HEAD": (f) => f.git(f.clone, "checkout", "-q", "--detach"),
  "a branch with no upstream": (f) => f.git(f.clone, "branch", "--unset-upstream"),
};
for (const [name, setup] of Object.entries(cannotFastForward)) {
  test(`${name}: says the update was not applied, HEAD unchanged, nothing installed`, () => {
    const f = fixture();
    f.pushUpstream();
    setup(f);
    const before = f.head();
    const r = f.update();
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /not applied/i);
    assert.equal(f.head(), before);
    assert.equal(f.installed(), null);
  });
}

test("a pull that rewrites update.sh itself: completes and runs the pulled install", () => {
  const f = fixture();
  const [shebang, ...rest] = fs.readFileSync(UPDATE, "utf8").split("\n");
  const padding = Array.from({ length: 200 }, (_, i) => `# moved down ${i}: echo stale-read >&2; exit 99`);
  const rewritten = [shebang, ...padding, ...rest].join("\n");
  f.pushUpstream({ "scripts/update.sh": rewritten, "scripts/install.sh": stub("v2") });
  const r = f.update();
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /stale-read/);
  assert.equal(fs.readFileSync(path.join(f.clone, "scripts", "update.sh"), "utf8"), rewritten);
  assert.equal(f.installed(), "v2 0|");
});

// A copy of Herdboard without its own .git (a zip download), optionally inside another repo.
for (const inOtherRepo of [false, true]) {
  test(`a copy without .git${inOtherRepo ? ", inside another git repo" : ""}: says it is not a git clone, installs nothing`, () => {
    const f = fixture();
    const parent = path.join(f.root, "parent");
    fs.mkdirSync(parent);
    if (inOtherRepo) {
      f.git(parent, "init", "-q", "-b", "main");
      fs.writeFileSync(path.join(parent, "dotfile"), "x\n");
      f.git(parent, "add", "dotfile");
      f.git(parent, "commit", "-q", "-m", "other");
    }
    const copy = path.join(parent, "herdboard");
    fs.cpSync(f.clone, copy, { recursive: true, filter: (src) => path.basename(src) !== ".git" });
    const r = run("sh", [path.join(copy, "scripts", "update.sh")], { cwd: f.elsewhere, home: f.home });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /not a git clone/i);
    assert.equal(f.installed(), null);
    if (inOtherRepo) assert.equal(f.git(parent, "status", "--porcelain"), "?? herdboard/");
  });
}
