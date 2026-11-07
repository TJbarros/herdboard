import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex } from "gpui-base";
import { theme, spaces, panes, knownAgents, run, openOverlay, closeOverlay, props, window, keys, shared, setShared } from "herdr";

// The last agents each machine reported, shown at once while knownAgents() checks again.
const KNOWN = "new-menu.agents";

function shortcut(name) {
  const k = keys().find(b => b.section === "global" && b.action === name);
  if (!k?.keys.trim()) return "";
  const mac = window()?.platform === "macos";
  const names = mac ? { ctrl: "⌃", alt: "⌥", shift: "⇧", cmd: "⌘", fn: "fn" } : { ctrl: "Ctrl", alt: "Alt", shift: "Shift", cmd: "Super", fn: "Fn" };
  const alias = { secondary: mac ? "cmd" : "ctrl", super: "cmd", win: "cmd" };
  return k.keys.trim().split(/\s+/).map(stroke => {
    const parts = stroke.split("-");
    let key = parts.pop();
    if (key === "") { key = "-"; parts.pop(); }
    const held = new Set(parts.map(m => alias[m.toLowerCase()] ?? m.toLowerCase()));
    if (/^[A-Z]$/.test(key)) held.add("shift");
    const label = key.length === 1 ? key.toUpperCase() : key[0].toUpperCase() + key.slice(1).toLowerCase();
    return [...Object.keys(names).filter(m => held.has(m)).map(m => names[m]), label].join(mac ? "" : "+");
  }).join(" ");
}

// Herdboard's copy of Herdr's new-tab menu: in the Board's language (shared "herdboard.lang"), and every
// new tab starts in the folder of the terminal the active tab shows.
const NEW_TEXT = {
  pt: { terminal: "Terminal", start: "Iniciar um agente", newSpace: "Novo espaço", newWorktree: "Novo worktree…",
    openWorktree: "Abrir worktree…", notInstalled: "não instalado", failed: "Não foi possível listar os agentes",
    checking: "Procurando agentes instalados…", openIn: "Abrir em", folderTip: "A nova aba começa nesta pasta" },
  en: { terminal: "Terminal", start: "Start an agent", newSpace: "New space", newWorktree: "New worktree…",
    openWorktree: "Open worktree…", notInstalled: "not installed", failed: "Could not load agents",
    checking: "Checking installed agents…", openIn: "Open in", folderTip: "The new tab starts in this folder" },
};
function currentFolder(space) {
  const tab = space?.tabs.find(t => t.active);
  const ps = panes().filter(p => p.tab === tab?.id && p.cwd);
  return (ps.find(p => p.focused) ?? ps[0])?.cwd ?? undefined;
}

// Folders to offer: the active tab's (first, the default), then the other live terminal folders,
// so a project an agent works in elsewhere is one click away. Home folders are left out.
function folderChoices(space) {
  const first = currentFolder(space);
  const seen = new Set();
  const out = [];
  for (const f of [first, ...panes().map(p => p.cwd)]) {
    if (!f || seen.has(f) || homeDepth(f) === 0) continue;
    seen.add(f);
    out.push(f);
  }
  return out.slice(0, 5);
}
// How deep a folder sits below the user's home (/home/<user> or C:\Users\<user>): 0 = the home
// itself, -1 = not under a home. Plain string work, no regex, so it reads the same on any OS.
function homeParts(f) {
  const parts = String(f).split("/").join("\\").split("\\").filter(Boolean);
  if (parts[0] === "home" && parts.length >= 2) return { parts, base: 2 };
  if (parts[0]?.length === 2 && parts[0][1] === ":" && parts[1] === "Users" && parts.length >= 3) return { parts, base: 3 };
  return null;
}
function homeDepth(f) {
  const h = homeParts(f);
  return h ? h.parts.length - h.base : -1;
}
const shortPath = (f) => {
  const h = homeParts(f);
  return h ? ["~", ...h.parts.slice(h.base)].join("/") : f;
};

export default class NewMenu extends View {
  init(_props, cx) {
    const machine = spaces().find(s => s.active)?.machine;
    const where = machine ?? "";
    this.agents = shared(KNOWN)?.[where] ?? [];
    this.handle = cx.focus_handle();
    this.handle.focus();
    cx.spawn(async cx => {
      try {
        this.agents = await knownAgents({ on: machine });
        setShared(KNOWN, { ...shared(KNOWN), [where]: this.agents });
      }
      catch { this.failed = true; }
      cx.notify();
    });
  }
  row(id, icon, name, action, hint = "", enabled = true) {
    const t = theme();
    return h_flex().id(id).h(31).px(9).gap(10).rounded(7).items_center().flex_none()
      .text_color(enabled ? t.foreground : t.dim).when(enabled, el => el.hover(s => s.bg(t.selected)))
      .on_click(() => { if (enabled) { closeOverlay(props().overlay); action(); } })
      .child(icon).child(div().flex_1().child(name)).child(div().text_size(11).text_color(t.dim).child(hint));
  }
  render() {
    const t = theme();
    const T = NEW_TEXT[shared("herdboard.lang") === "en" ? "en" : "pt"];
    const space = spaces().find(s => s.active);
    // New tabs start where the active tab's terminal is now: the same project, even when the
    // keyboard is on the board (Herdr would otherwise use the space's first folder).
    const folders = folderChoices(space);
    const folder = (this.picked && folders.includes(this.picked) ? this.picked : folders[0]) ?? currentFolder(space);
    const installed = this.agents.filter(a => a.installed);
    const choices = [...installed, ...this.agents.filter(a => !a.installed).slice(0, 2)];
    return v_flex().min_h(0).w_full().h(Math.min(600, 167 + Math.max(1, choices.length) * 31 + (folders.length ? 30 + folders.length * 28 : 0))).bg(t.popover).p(5).text_size(12.8)
      .id("new-menu").track_focus(this.handle)
      .on_key_down((e) => {
        if (e.modifiers.control || e.modifiers.platform || e.modifiers.alt) return;
        const agent = /^[1-9]$/.test(e.key) ? installed[Number(e.key) - 1] : null;
        if (!agent) return;
        closeOverlay(props().overlay);
        run("tab.new", { name: agent.name, space: space?.id, folder, argv: agent.run });
      })
      // Where the new tab starts: the active tab's folder, or another project picked here.
      .when(folders.length > 0, el => el
        .child(div().px(9).pt(4).pb(4).text_size(11).text_color(t.dim).child(T.openIn))
        .children(folders.map((f, i) => h_flex().id(`folder-${i}`).h(28).px(9).gap(8).rounded(7).items_center().flex_none().cursor_pointer()
          .bg(f === folder ? t.selected : t.popover).text_color(f === folder ? t.foreground : t.muted)
          .hover(st => st.bg(t.hover)).tooltip(`${T.folderTip}: ${f}`)
          .on_click((_e, cx) => { this.picked = f; cx.notify(); })
          .child(div().size(12).flex_none().rounded(12).border(1).border_color(f === folder ? t.accent : t.dim)
            .flex().items_center().justify_center().when(f === folder, d => d.child(div().size(6).rounded(6).bg(t.accent))))
          .child(svg("mods/workspace-chrome/folder.svg").size(13).flex_none())
          .child(div().flex_1().min_w(0).truncate().text_size(12).child(shortPath(f)))))
        .child(div().h(1).mx(4).my(5).bg(t.border)))
      .child(this.row("terminal", svg("icons/shell.svg").size(14), T.terminal, () => run("tab.new", { space: space?.id, folder }), shortcut("tab.new")))
      .child(div().px(9).pt(8).pb(4).text_size(11).text_color(t.dim).child(T.start))
      .child(v_flex().flex_1().min_h(0).overflow_y_scrollbar()
        .children(choices.map((a, i) => this.row(a.key, a.tint ? svg(a.icon).size(14).text_color(t.foreground) : image(a.icon).size(14), a.name,
          () => run("tab.new", { name: a.name, space: space?.id, folder, argv: a.run }), a.installed ? (i < 9 ? String(i + 1) : "") : T.notInstalled, a.installed)))
        .when(this.agents.length === 0, el => el.child(div().px(9).py(6).text_color(t.dim).child(this.failed ? T.failed : T.checking))))
      .child(div().h(1).mx(4).my(5).bg(t.border))
      .child(this.row("space", div().w(14).child("+"), T.newSpace, () => run("space.new", { folder, machine: space?.machine ?? "" }), shortcut("space.new")))
      .child(this.row("worktree", svg("mods/workspace-chrome/branch.svg").size(14), T.newWorktree, () => openOverlay({ mod: "worktree", kind: "dialog", width: 460, height: 280, props: { space: space?.id, folder: folder ?? panes().find(p => p.focused)?.cwd, action: "new" } }), "", Boolean(space)))
      .child(this.row("worktree-open", svg("mods/workspace-chrome/branch.svg").size(14), T.openWorktree, () => openOverlay({ mod: "worktree", kind: "dialog", width: 560, height: 480, props: { space: space?.id, folder: folder ?? panes().find(p => p.focused)?.cwd, action: "open" } }), "", Boolean(space)));
  }
}
