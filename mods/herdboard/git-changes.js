// Explicit flags override user settings that hide untracked files or disable renames.
export const GIT_STATUS_ARGS = ["--no-optional-locks", "status", "--porcelain=v1", "-z", "--untracked-files=all", "--ignored=no", "--renames"];

// Native exec silently caps output at 8 MiB. Check bytes, including stderr, even if the
// truncated prefix happens to end at a valid record boundary. No TextEncoder is needed.
function outputBytes(text) {
  let bytes = 0;
  for (const char of text) {
    const cp = char.codePointAt(0);
    bytes += cp > 0xffff ? 4 : cp > 0x7ff ? 3 : cp > 0x7f ? 2 : 1;
  }
  return bytes;
}
function completeOutput(result) {
  return result?.code === 0 && typeof result.stdout === "string"
    && outputBytes(result.stdout) + outputBytes(result.stderr ?? "") < 8 * 1024 * 1024;
}

// A porcelain record is one pending file, including a file changed in both index and worktree.
// NUL separators preserve tabs/newlines in filenames; rename/copy records have a second path.
export function countGitChanges(result) {
  if (!completeOutput(result)) return null;
  if (!result.stdout) return 0;
  if (!result.stdout.endsWith("\0")) return null;
  const records = result.stdout.split("\0");
  records.pop();
  let count = 0;
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!/^[ MTADRCU?!]{2} .+/s.test(record) || record.startsWith("!!")) return null;
    if (/[RC]/.test(record.slice(0, 2)) && !records[++i]) return null;
    count++;
  }
  return count;
}

export const GIT_POLL_MS = 10000;
export const GIT_CONCURRENCY = 2;
const RECENT_LIMIT = 128;

// Only visible consumers are retained. Pending physical commands live separately until
// settlement, so hiding/re-showing a card never releases capacity or duplicates that work.
// There is no retry queue: each sync chooses the oldest eligible command from current demand.
export class WorktreeChanges {
  constructor(execute) {
    this.execute = execute;
    this.directories = new Map();
    this.worktrees = new Map();
    this.consumers = new Map();
    this.pending = new Set();
    this.revision = 0;
    this.recent = new Map(); // bounded cooldowns survive temporary hiding, for at most one interval
  }

  sync(contexts, launch, notify) {
    const now = Date.now();
    for (const [key, at] of this.recent) if (now - at >= GIT_POLL_MS) this.recent.delete(key);
    const next = new Map();
    for (const context of contexts) {
      const old = this.consumers.get(context.address);
      next.set(context.address, old?.key === context.key ? old : { ...context, revision: ++this.revision });
    }
    this.consumers = next;
    const wantedDirs = new Set(contexts.map(c => c.directory));
    for (const key of this.directories.keys()) if (!wantedDirs.has(key)) this.directories.delete(key);
    for (const context of contexts) if (!this.directories.has(context.directory)) {
      this.directories.set(context.directory, { cwd: context.cwd, on: context.on, last: -Infinity, root: null });
    }
    const wantedRoots = new Set([...this.directories.values()].map(d => d.root).filter(Boolean));
    for (const key of this.worktrees.keys()) if (!wantedRoots.has(key)) this.worktrees.delete(key);
    for (const directory of this.directories.values()) {
      const root = this.worktrees.get(directory.root);
      if (root) root.cwd = directory.cwd;
    }

    const due = [];
    for (const [key, root] of this.worktrees) {
      if (now - root.last >= GIT_POLL_MS && !this.pending.has(`status:${key}`)) due.push({ key, entry: root, kind: "status" });
    }
    for (const [key, directory] of this.directories) {
      if (!directory.root && now - directory.last >= GIT_POLL_MS && !this.pending.has(`discover:${key}`)) due.push({ key, entry: directory, kind: "discover" });
    }
    due.sort((a, b) => a.entry.last - b.entry.last);
    for (const job of due) {
      if (this.pending.size >= GIT_CONCURRENCY) break;
      const { key, entry, kind } = job;
      const pendingKey = `${kind}:${key}`;
      if (this.recent.has(pendingKey) || this.recent.size >= RECENT_LIMIT) continue;
      this.pending.add(pendingKey);
      this.recent.set(pendingKey, now);
      entry.last = now;
      const revision = this.revision;
      launch(async () => {
        let result = null;
        try {
          result = await this.execute("git", kind === "status" ? GIT_STATUS_ARGS : ["rev-parse", "--absolute-git-dir"], { cwd: entry.cwd, on: entry.on });
        } catch (_error) { /* Missing Git, directories and disconnected machines are unavailable. */ }
        finally { this.pending.delete(pendingKey); }
        const cache = kind === "status" ? this.worktrees : this.directories;
        if (cache.get(key) === entry) {
          if (kind === "status") {
            entry.count = countGitChanges(result);
            entry.revision = revision;
          } else if (completeOutput(result) && result.stdout.endsWith("\n") && result.stdout.length > 1) {
            const root = JSON.stringify([entry.on, result.stdout.slice(0, -1)]);
            entry.root = root;
            if (!this.worktrees.has(root)) this.worktrees.set(root, { cwd: entry.cwd, on: entry.on, last: -Infinity, count: null, revision: -Infinity });
          }
        }
        notify();
      });
    }
  }

  value(context) {
    if (!context) return null;
    const consumer = this.consumers.get(context.address);
    if (consumer?.key !== context.key) return null;
    const directory = this.directories.get(context.directory);
    const root = directory && this.worktrees.get(directory.root);
    return root && root.revision >= consumer.revision ? root.count : null;
  }
}
