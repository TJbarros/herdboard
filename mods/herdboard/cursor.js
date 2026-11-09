// Installed Cursor launcher metadata, paired with the versioned native fixture.
// Generic `agent`, MainThread, program descriptors and screen text are insufficient.
/** @param {{ address: string, state?: string, screen?: string, created_ms?: number, pid?: number,
 * foreground?: { pid?: number, cwd?: string, argv?: string[] } }} t */
function cursorKey(t) {
  const f = t?.foreground, argv = f?.argv;
  if (t?.state !== "live" || t.screen !== "exact" || !(t.created_ms > 0) || !(t.pid > 0)
    || !(f?.pid > 0) || !f.cwd || !Array.isArray(argv)
    || !["agent", "cursor-agent"].includes(argv[0]?.split("/").at(-1))) return null;
  const entry = argv[1] === "--use-system-ca" ? 2 : 1;
  if (!/^\/.*\/cursor-agent\/versions\/[^/]+\/index\.js$/.test(argv[entry] ?? "")) return null;
  // Only the captured interactive launcher forms. Print, subcommands and unknown
  // flags are deliberately excluded rather than treating every Cursor process as a session.
  if (argv.slice(entry + 1).some(arg => arg !== "--yolo")) return null;
  return JSON.stringify([t.address, t.created_ms, t.pid, f.pid, f.cwd, argv]);
}

// Synchronous live facts: no cached discovery or late completion can revive a process.
// Reports retain their authoritative status. Fallbacks never manufacture OSC reports.
/** @param {import("herdr").AgentInfo[]} reported
 * @param {import("./types.js").CoreTerminal[]} terminals
 * @param {import("herdr").PaneInfo[]} panes
 * @param {import("herdr").SpaceInfo[]} spaces
 * @returns {import("./types.js").BoardAgent[]} */
export function cursorSessions(reported, terminals, panes, spaces) {
  /** @type {import("./types.js").BoardAgent[]} */
  const result = [];
  for (const t of terminals) {
    const key = cursorKey(t);
    if (!key || reported.some(a => a.address === t.address)) continue;
    const ps = panes.filter(p => p.terminal === t.address);
    if (ps.length !== 1) continue;
    const p = ps[0], owners = spaces.filter(s => s.tabs.some(tab => tab.id === p.tab));
    if (owners.length !== 1) continue;
    const space = owners[0], tab = space.tabs.find(tab => tab.id === p.tab);
    result.push({ address: t.address, pane: p.pane, tab: tab.id, tab_name: tab.name,
      space: space.id, space_name: space.name, focused: p.focused,
      pinned: typeof t.labels?.["herdr.pinned"] === "string" && t.labels["herdr.pinned"].length > 0,
      program: { name: "Cursor CLI" }, title: "", status: "unknown",
      source: { kind: "cursor-process", key } });
  }
  return result;
}
