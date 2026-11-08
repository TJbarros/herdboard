// Finding the tools the tests spawn or put on a stand-in PATH. Resolved here in Node, never by
// asking a shell: under Git Bash with a native Windows node, `command -v sh` answers with an MSYS
// path (/usr/bin/sh) and /bin/sh is MSYS-only too, so spawn fails with ENOENT. This process's
// PATH holds the Windows form (C:\Program Files\Git\usr\bin), which spawn can run.
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
