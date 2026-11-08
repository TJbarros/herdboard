// Finding the tools the tests spawn or put on a stand-in PATH. Resolved here in Node, never by
// asking a shell: under Git Bash with a native Windows node, `command -v sh` answers with an MSYS
// path (/usr/bin/sh) and /bin/sh is MSYS-only too, so spawn fails with ENOENT. This process's
// PATH holds the Windows form (C:\Program Files\Git\usr\bin), which spawn can run.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// The executable suffix a tool's file has here: ".exe" on Windows, nothing elsewhere. A link
// on a stand-in PATH keeps it, or the shell won't find the tool by its bare name.
export const EXE = process.platform === "win32" ? ".exe" : "";

// The absolute path of the first executable named `tool` (plus EXE) on this process's PATH, or
// null, like `command -v`.
export function which(tool) {
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (dir === "") continue;
    const file = path.join(dir, tool + EXE);
    try {
      if (fs.statSync(file).isFile()) {
        fs.accessSync(file, fs.constants.X_OK);
        return file;
      }
    } catch {}
  }
  return null;
}

// The shell the tests run the scripts with: the `sh` on PATH, the one the scripts'
// `#!/usr/bin/env sh` finds. Absolute, because the spawns pass a PATH without it.
export const SH = which("sh") ?? (() => { throw new Error("sh not found on PATH"); })();

// Puts `tool` (an absolute path) at `dest` on a stand-in PATH folder: a symlink, else a hardlink,
// else a copy. Windows without Developer Mode refuses symlinks (EPERM); a hardlink fails across
// volumes (EXDEV) and, on Linux, for files of root's under fs.protected_hardlinks (EPERM).
export function linkTool(tool, dest) {
  try { return fs.symlinkSync(tool, dest); } catch {}
  try { return fs.linkSync(tool, dest); } catch {}
  fs.copyFileSync(tool, dest);
}

// A stand-in PATH made of `dir`. On Windows it also holds the shell's own folder: the MSYS tools
// linked into `dir` (dirname.exe, ...) load msys-2.0.dll from there, and without it exit 127 with
// no message. That folder has no node, herdr-app or python3, so a test leaving one out still does.
export const standInPath = dir =>
  process.platform === "win32" ? [dir, path.dirname(SH)].join(path.delimiter) : dir;

// `dir` as the scripts see their own folders: `cd "$dir" && pwd` in SH. Under Git Bash that is
// /tmp/... or /c/Users/..., never Node's C:\Users\..., so paths a script prints from its ROOT are
// compared in the shell's form.
export function shellPwd(dir) {
  const r = spawnSync(SH, ["-c", 'cd "$1" && pwd', "sh", dir], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`pwd of ${dir} in ${SH} failed: ${r.stderr}`);
  return r.stdout.replace(/\n$/, "");
}
