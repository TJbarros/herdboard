import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { GIT_STATUS_ARGS, countGitChanges } from "../mods/herdboard/git-changes.js";

function repository(t) {
  const dir = mkdtempSync(join(tmpdir(), "herdboard-git-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd: dir, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr);
    return r.stdout;
  };
  git("init", "-q");
  git("config", "user.name", "Herdboard tests");
  git("config", "user.email", "tests@example.invalid");
  const status = (cwd = dir) => {
    const r = spawnSync("git", GIT_STATUS_ARGS, { cwd, encoding: "utf8" });
    return countGitChanges({ code: r.status, stdout: r.stdout, stderr: r.stderr });
  };
  return { dir, git, status, file: (name, text = name) => writeFileSync(join(dir, name), text) };
}

test("worktree total includes individual untracked files from a subdirectory in an unborn repository", t => {
  const r = repository(t);
  assert.equal(r.status(), 0);
  mkdirSync(join(r.dir, "child"));
  r.file("one"); r.file("child/two\twith\nlines"); r.file(".gitignore", "ignored\n"); r.file("ignored");
  assert.equal(r.status(join(r.dir, "child")), 3);
});

test("index/worktree changes and Git-recognized renames count once while an unstaged move counts twice", t => {
  const r = repository(t);
  for (const name of ["both", "deleted", "renamed", "moved"]) r.file(name, name.repeat(100));
  r.git("add", "."); r.git("commit", "-qm", "Initial files");
  r.file("both", "staged"); r.git("add", "both"); r.file("both", "unstaged");
  r.git("rm", "-q", "deleted"); r.git("mv", "renamed", "new-name");
  r.file("moved-to", "moved".repeat(100)); rmSync(join(r.dir, "moved"));
  r.file("added"); r.git("add", "added");
  r.git("config", "status.showUntrackedFiles", "no"); r.git("config", "status.renames", "false");
  assert.equal(r.status(), 6);
  r.git("add", "moved", "moved-to");
  assert.equal(r.status(), 5);
});

test("unmerged conflicts are one file and failed/non-Git queries never become clean", t => {
  const r = repository(t);
  r.file("conflict", "base\n"); r.git("add", "."); r.git("commit", "-qm", "Base");
  r.git("checkout", "-qb", "other"); r.file("conflict", "other\n"); r.git("commit", "-qam", "Other");
  r.git("checkout", "-q", "-"); r.file("conflict", "main\n"); r.git("commit", "-qam", "Main");
  assert.equal(spawnSync("git", ["merge", "other"], { cwd: r.dir }).status, 1);
  assert.equal(r.status(), 1);
  assert.equal(r.status(tmpdir()), null);
  assert.equal(r.status(join(r.dir, "missing")), null);
  for (const result of [{ code: 1, stdout: "" }, { code: 0, stdout: " M incomplete" }, { code: 0, stdout: "R  renamed\0" }]) {
    assert.equal(countGitChanges(result), null);
  }
});

test("a silently truncated native execution cannot claim a complete worktree total", () => {
  const record = "?? " + "é".repeat(1022) + "\0";
  assert.equal(countGitChanges({ code: 0, stdout: record.repeat(4096), stderr: "" }), null);
  assert.equal(countGitChanges({ code: 0, stdout: "?? x\0", stderr: "x".repeat(8 * 1024 * 1024) }), null);
});

test("a Git type change is a changed file", t => {
  const r = repository(t);
  r.file("type", "target"); r.git("add", "."); r.git("commit", "-qm", "Plain file");
  const hash = r.git("hash-object", "-w", "type").trim();
  r.git("update-index", "--cacheinfo", "120000", hash, "type");
  assert.equal(r.status(), 1);
});
