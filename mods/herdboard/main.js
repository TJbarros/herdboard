import { View, div, svg, image } from "gpui-kit";
import { h_flex, v_flex, Popover } from "gpui-base";
import { agents, terminals, spaces, panes, props, run, setAgentOrder, theme, notify, layout, shared, setShared, hc, openOverlay, closeOverlay } from "herdr";
import { parseAsk, pickAnswers } from "./ask.js";

// ---- Layout state ---------------------------------------------------------------------------

// The terminal area is "expanded" while the board's header and cards are hidden.
const BOARD_PARTS = ["herdboard-header", "herdboard-cards"];
function findNode(node, id) {
  if (!node || typeof node !== "object") return null;
  if (node.id === id) return node;
  for (const c of node.children ?? []) { const f = findNode(c, id); if (f) return f; }
  return null;
}
const isExpanded = () => findNode(layout(), "herdboard-cards")?.hidden === true;
function toggleExpanded() {
  const cmd = isExpanded() ? "layout.show" : "layout.hide";
  for (const id of BOARD_PARTS) run(cmd, { id });
}

// The live folder of the terminal the active tab shows (focused pane first): where the work is.
function liveFolder() {
  const tab = spaces().find(s => s.active)?.tabs.find(t => t.active);
  const ps = panes().filter(p => p.tab === tab?.id && p.cwd);
  return (ps.find(p => p.focused) ?? ps[0])?.cwd ?? undefined;
}

// Herdboard preferences, kept in shared state (saved by Herdr, the same for every copy).
const LANG_KEY = "herdboard.lang";        // "pt" | "en"
const FILTER_KEY = "herdboard.filter";    // "all" | "here"
const IDLE_KEY = "herdboard.idleOpen";    // false: the Idle column is folded
const TITLES_KEY = "herdboard.titles";    // address -> { title, at }: the last task title seen
const STARTUP_KEY = "herdboard.startup";  // recognised lifecycle keys only, for the header copy
const IDLE_ROW = 44;                  // height of an Idle row (task + where)


// A working agent past this many minutes gets a "stuck?" hint on its card.
const STUCK_MIN = 30;

// ---- Text -----------------------------------------------------------------------------------

const TEXT = {
  pt: {
    blocked: "Precisa de você", working: "Trabalhando", done: "Concluído", idle: "Ocioso",
    verb: { blocked: "esperando há", working: "há", done: "concluiu há", idle: "há" },
    stuck: "travado?", stuckTip: `Trabalhando há mais de ${STUCK_MIN} min. Pode estar travado: vale conferir.`,
    noTitle: "Sem título da tarefa", tab: "aba", none: "Nenhum",
    current: (n) => `${n} (espaço atual)`, goTo: (n) => `Ir para ${n}`,
    all: "Todos", here: "Este espaço", filterTip: "Mostrar os agentes de todos os espaços ou só do espaço atual",
    search: "Buscar", searchTip: "Buscar espaço ou aba (Ctrl+Shift+K)",
    more: "Mais ações", newSpace: "Novo espaço", newTab: "Nova aba neste espaço", newTabTip: "Nova aba: terminal ou agente (Ctrl+Shift+T)", closeTabTip: "Fechar a aba e encerrar os terminais dela (Ctrl+Shift+W)",
    defaultLayout: "Voltar ao layout padrão", defaultLayoutTitle: "Layout padrão",
    defaultLayoutBody: "Espaços, abas e agentes continuam iguais. Para voltar ao Herdboard: Configurações › Look › Layout, ou Ctrl+Shift+L.",
    expand: "Expandir", restore: "Restaurar",
    expandTip: "Expandir os terminais para ocupar a área toda", restoreTip: "Voltar a mostrar o quadro de agentes",
    langTip: "Idioma do quadro",
    answer: "Abrir e responder", peek: "Espiar", pin: "Fixar", unpin: "Desafixar", settle: "Guardar",
    peekTip: "Ver o terminal por cima, sem trocar de aba", pinTip: "Manter no topo da coluna",
    settleTip: "Tirar a aba do quadro até um agente nela precisar de você",
    noAsk: "Abra o terminal para ver o que o agente pede.",
    yes: "Sim", no: "Não", moreOptions: "Mais…", answerTip: (n, text) => `Responde no terminal com a opção ${n}: "${text}"`,
    cursorAnswerTip: text => `Confirma no terminal: "${text}"`,
    fold: "recolher", unfold: "mostrar", lastTask: "Última:", hereShort: "Este",
  },
  en: {
    blocked: "Needs you", working: "Working", done: "Done", idle: "Idle",
    verb: { blocked: "waiting", working: "for", done: "finished", idle: "for" }, ago: { blocked: false, done: true },
    stuck: "stuck?", stuckTip: `Working for over ${STUCK_MIN} min. It may be stuck: worth a look.`,
    noTitle: "No task title", tab: "tab", none: "None",
    current: (n) => `${n} (current space)`, goTo: (n) => `Go to ${n}`,
    all: "All", here: "This space", filterTip: "Show agents from every space or only the current one",
    search: "Search", searchTip: "Find a space or tab (Ctrl+Shift+K)",
    more: "More actions", newSpace: "New space", newTab: "New tab in this space", newTabTip: "New tab: a terminal or an agent (Ctrl+Shift+T)", closeTabTip: "Close the tab and end its terminals (Ctrl+Shift+W)",
    defaultLayout: "Back to the default layout", defaultLayoutTitle: "Default layout",
    defaultLayoutBody: "Spaces, tabs and agents stay as they are. To come back to the Herdboard: Settings › Look › Layout, or Ctrl+Shift+L.",
    expand: "Expand", restore: "Restore",
    expandTip: "Expand the terminals to fill the whole area", restoreTip: "Show the agent board again",
    langTip: "Herdboard language",
    answer: "Open and answer", peek: "Peek", pin: "Pin", unpin: "Unpin", settle: "Put away",
    peekTip: "See the terminal on top, without switching tabs", pinTip: "Keep at the top of the column",
    settleTip: "Take the tab off the board until an agent in it needs you",
    noAsk: "Open the terminal to see what the agent is asking.",
    yes: "Yes", no: "No", moreOptions: "More…", answerTip: (n, text) => `Answers in the terminal with option ${n}: "${text}"`,
    cursorAnswerTip: text => `Confirms in the terminal: "${text}"`,
    fold: "fold", unfold: "show", lastTask: "Last:", hereShort: "Here",
  },
};
let L = TEXT.pt;
const lang = () => (shared(LANG_KEY) === "en" ? "en" : "pt");

// ---- Look -----------------------------------------------------------------------------------

// Every color comes from the active theme, so the board follows light and dark themes.
const wash = (hex, a = "24") => /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex ?? "") ? hex.slice(0, 7) + a : hex;
let C = {};
let STATES = [];
function palette() {
  const t = theme();
  L = TEXT[lang()];
  C = { ink: t.foreground, muted: t.muted, dim: t.dim, line: t.border, strong: t.input, bg: t.canvas, card: t.background,
    bar: t.chrome, head: t.surface, accent: t.accent, selected: t.selected, hover: t.hover, pop: t.popover, t };
  STATES = ["blocked", "working", "done", "idle"].map(key => ({ key, color: t[key], label: L[key], wash: wash(t[key]) }));
}
const stateColor = (status) => STATES.find(s => s.key === status)?.color ?? C.muted;
const dot = (color, size = 7) => div().size(size).rounded(size).bg(color).flex_none();
// A space or tab with no agents: a hollow ring.
const ring = (size = 7) => div().size(size).rounded(size).border(1).border_color(C.dim).flex_none();
const statusDot = (status, size = 8) => status ? dot(stateColor(status), size) : ring(size - 1);
const icon = (program, size = 18) => program?.icon
  ? (program.tint ? svg(program.icon).text_color(C.ink) : image(program.icon)).size(size).flex_none()
  : div().size(size).rounded(4).bg(C.accent);
// Controls in the header sit inside a window-drag block: stop the press so a click is a click.
const noDrag = (el) => el.on_mouse_down("left", (_e, cx) => cx.stop_propagation());
const duration = (mins) => mins < 1 ? "<1 min" : mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} h${mins % 60 ? ` ${mins % 60} min` : ""}`;
const tabLabel = (name, named) => named ? name : `${L.tab} ${name}`;
// "esperando há 5 min" / "finished 5 min ago"; idle and working read "há 5 min" / "for 5 min".
const statusAge = (status, age) => L.ago?.[status] ? `${L.verb[status]} ${age} ago` : `${L.verb[status] ?? ""} ${age}`.trim();
// A terminal address used as a title ("t2", "wsl/t2"): not a task.
const isAddress = (t) => /^([\w.-]+\/)?t\d+$/i.test(String(t).trim());
// The terminal title the agent set (Claude Code: its task), without spinner glyphs.
function taskTitle(a) {
  const t = (a.title ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();
  if (!t) return "";
  const low = t.toLowerCase();
  if ([a.program?.name, a.app, "claude", "claude code", "bash", "zsh", "pwsh"].some(n => n && low === String(n).toLowerCase())) return "";
  if (isAddress(t)) return "";
  return t;
}

// ---- What a blocked agent is asking (parsed in ./ask.js) ------------------------------------

// Numbered permissions require Claude Code's own permission report. Startup trust uses the
// separate foreground-process source below; screen text alone never makes a terminal eligible.
function mayAnswer(a) {
  if (a.source?.kind === "workspace-trust") return startupCandidates().some(x => spell(x) === spell(a));
  if (a.app !== "claude-code") return false;
  return terminals().find(t => t.address === a.address)?.report?.kind === "permission";
}
// Reported requests use address#seq; startup requests use their explicit process lifecycle.
const spell = (a) => a.source?.key ?? `${a.address}#${a.seq}`;

// A separate, explicitly identified startup source. These are terminal facts, never forged
// OSC reports. Only a live Claude foreground process, before its first report, is eligible.
function startupKey(t) {
  const f = t?.foreground;
  const executable = f?.argv?.[0]?.split(/[\\/]/).at(-1);
  if (t?.state !== "live" || t.reported !== false || t.status != null || t.report != null
    || t.screen !== "exact" || !(t.created_ms > 0) || !(t.pid > 0) || !(f?.pid > 0) || !f.cwd
    || !["claude", "claude.exe"].includes(f.name) || !["claude", "claude.exe"].includes(executable)) return null;
  return `${t.address}#startup:${JSON.stringify([t.created_ms, t.pid, f.pid, f.cwd])}`;
}
function startupCandidates() {
  const reported = new Set(agents().map(a => a.address));
  const result = [];
  for (const t of terminals()) {
    const key = startupKey(t);
    if (!key || reported.has(t.address)) continue;
    const p = panes().find(p => p.terminal === t.address);
    const space = spaces().find(s => s.tabs.some(tab => tab.id === p?.tab));
    const tab = space?.tabs.find(tab => tab.id === p.tab);
    if (!p || !space || !tab) continue;
    result.push({ address: t.address, pane: p.pane, tab: tab.id, tab_name: tab.name,
      space: space.id, space_name: space.name, program: t.program, title: t.title ?? "",
      focused: p.focused, status: "blocked", source: { kind: "workspace-trust", key, folder: t.foreground.cwd } });
  }
  return result;
}
// The agent at `address` now, if it is still blocked on `key`'s spell; else null.
const stillOn = (address, key) => {
  if (key.startsWith(`${address}#startup:`)) return startupCandidates().find(a => a.address === address && spell(a) === key) ?? null;
  const now = agents().find(x => x.address === address);
  return now?.status === "blocked" && spell(now) === key ? now : null;
};
function answersFor(a, ask) {
  if (!ask?.id || !mayAnswer(a)) return null;
  if (ask.mode === "cursor") {
    if (a.source?.kind !== "workspace-trust" || ask.dialog !== "workspace-trust" || ask.folder !== a.source.folder) return null;
  } else if (a.source) return null;
  return pickAnswers(ask);
}
// The visible screen (no scrolling), parsed; null when it can't be read.
async function readAsk(a) {
  const r = await hc(["read", a.address, "--lines", "0"]);
  return r?.code ? null : parseAsk(r?.stdout, a.source?.folder);
}
// A read misses when it shows no question, or, where the card offers Yes / No (mayAnswer), no
// buttons: no id (the dialog's shape is in doubt, as a read during a redraw gives) or no exact
// Yes / No pair. A miss is read again after each of these waits: at most 2 more reads per spell.
const RETRY_MS = [500, 1500];
// The read of one blocked spell (`key`): the last read with its `choices` (the Yes / No pair
// the card shows, else null), or null as soon as the spell has ended (checked after each read
// and after each wait), so no read follows a status or seq change.
async function readAskWithRetry(address, key, cx) {
  for (let i = 0; ; i++) {
    const source = stillOn(address, key);
    if (!source) return null;
    let ask = null;
    try { ask = await readAsk(source); } catch (_e) { ask = null; }
    ask ??= parseAsk("");  // a failed read: an empty screen, no question
    const now = stillOn(address, key);
    if (!now) return null;
    const answerable = mayAnswer(now);
    // No id (the dialog's shape is in doubt): nothing to check a click against, so no buttons.
    const choices = answersFor(now, ask);
    const miss = !ask.question || (answerable && !choices);
    if (!miss || i >= RETRY_MS.length) return { ...ask, choices };
    await cx.sleep(RETRY_MS[i]);
    if (!stillOn(address, key)) return null;
  }
}
// The Yes / No pair a card shows: live, or faded after one was sent.
const shownChoices = (ask) => ask?.choices ?? ask?.sent ?? null;
const answerTip = (ask, option) => ask.mode === "cursor" ? L.cursorAnswerTip(option.text) : L.answerTip(option.n, option.text);

// ---- The mod --------------------------------------------------------------------------------

export default class Herdboard extends View {
  init(_p, cx) {
    this.observed = {};
    this.asks = {};      // address -> { key, text, question, options, id, choices, sent } for blocked agents
    this.recognisedStartups = new Map(); // address -> lifecycle key, independent of invalidatable reads
    this.pending = new Set();
    this.moreOpen = null; // address#seq of the card whose permission options are open
    this.hovered = null; // address of the card under the pointer (shows its actions)
    this.w = 0;          // this copy's size, from on_size_change; 0 until the first layout (treated as wide)
    this.h = 0;
    // Ages tick every 30 s, only on the cards copy, when there's something to age and the board shows.
    if (!props()?.role) cx.timer.every(30000, (cx) => {
      const live = new Set([...agents(), ...startupCandidates()].map(a => a.address));
      for (const k of Object.keys(this.observed)) if (!live.has(k)) delete this.observed[k];
      if (live.size && !isExpanded()) cx.notify();
    });
    // Startup screens have no status events. Poll only eligible foreground terminals, from
    // the board copy, until the source ends; unknown screens never become cards.
    if (!props()?.role) cx.timer.every(1000, (cx) => {
      if (!isExpanded() && startupCandidates().length) cx.notify();
    });
  }

  // Every role's root reports its size, so each copy adapts to the room it has.
  sized(el) {
    return el.id("herdboard-root").on_size_change((size, cx) => {
      if (Math.round(size.width) === this.w && Math.round(size.height) === this.h) return;
      this.w = Math.round(size.width);
      this.h = Math.round(size.height);
      cx.notify();
    });
  }
  below(px) { return this.w > 0 && this.w < px; }

  // How long the agent has been in its status. Reported agents use Herdr's per-tab times;
  // otherwise observe locally, with startup waits belonging to their process lifecycle.
  since(a, tab) {
    const old = this.observed[a.address];
    const source = a.source?.key;
    if (!old || old.status !== a.status || old.source !== source) {
      this.observed[a.address] = { status: a.status, source, at: Date.now() };
    }
    // Startup has no reported status clock: its wait belongs to this lifecycle, not the tab.
    if (source) return this.observed[a.address].at;
    // Herdr keeps times per tab: trust them only when this agent is the tab's only one.
    if (tab && this.perTab?.get(a.tab) > 1) return this.observed[a.address].at;
    const herdr = a.status === "working" ? (tab?.working_since ?? tab?.changed_at) : tab?.changed_at;
    return herdr ?? this.observed[a.address].at;
  }

  // Read each blocked agent's screen, off the UI thread, in one read chain per blocked spell
  // (keyed by address + seq): readAskWithRetry reads it, reads it again after a miss (RETRY_MS:
  // at most 2 more reads, only while the spell lasts) and returns only its last read.
  // `choices` holds the Yes / No options when the screen shows a dialog with both.
  // The key stays pending until readAskWithRetry returns, so one spell never has two read chains.
  // Reads can overlap and finish in any order: a read is kept only if its spell is still the
  // agent's current one, and never over a read of that spell already kept (it may be answered).
  // `blocked` is only the cards shown (filter, put-away tabs): a kept read is dropped when its
  // spell ends, not when its card is hidden, so an answered request stays answered.
  fetchAsks(blocked, cx) {
    if (this.moreOpen && !blocked.some(a => spell(a) === this.moreOpen && stillOn(a.address, this.moreOpen) && mayAnswer(a))) this.moreOpen = null;
    this.fetchRequests(blocked, cx);
  }

  fetchRequests(blocked, cx) {
    for (const [k, ask] of Object.entries(this.asks)) if (!stillOn(k, ask.key)) delete this.asks[k];
    for (const [address, key] of this.recognisedStartups) if (!stillOn(address, key)) this.recognisedStartups.delete(address);
    for (const a of blocked) {
      const key = spell(a);
      const cached = this.asks[a.address];
      const startup = a.source?.kind === "workspace-trust";
      if (this.pending.has(key) || (cached?.key === key && (!startup || Date.now() - cached.checkedAt < 1000))) continue;
      this.pending.add(key);
      cx.spawn(async (cx) => {
        let ask = null;
        try { ask = await readAskWithRetry(a.address, key, cx); } finally { this.pending.delete(key); }
        const now = ask && stillOn(a.address, key);
        if (!now || this.asks[a.address] !== cached) return;
        const visible = startup && !!ask.choices;
        const firstStartup = visible && this.recognisedStartups.get(a.address) !== key;
        if (visible) this.recognisedStartups.set(a.address, key);
        // A poll begun before a click can finish after it. Preserve the sent latch, including
        // while hidden by filters or after the screen disappears, until this source ends.
        if (startup && cached?.sent) {
          cached.visible = visible;
          cached.checkedAt = Date.now();
        } else this.asks[a.address] = { key, ...ask, sent: null, visible, checkedAt: Date.now() };
        // Startup has no OSC report to bring a put-away tab back. Do it once per recognised
        // lifecycle, preserving that fact across polls where the screen temporarily disappears.
        if (firstStartup && spaces().some(s => s.tabs.some(t => t.id === now.tab && t.settled))) {
          run("tab.unsettle", { id: now.tab });
        }
        cx.notify();
      });
    }
  }

  // A small button inside a card: its click never reaches the card (which focuses the agent),
  // not even when it is disabled (drawn faded, the click does nothing).
  actionButton(id, label, tip, onClick, color = null, disabled = false) {
    const strong = !!color;
    return div().id(id).h(24).px(strong ? 12 : 8).flex().items_center().rounded(5).flex_none()
      .text_size(11).when(strong, el => el.font_semibold())
      .bg(strong ? color : C.pop).text_color(strong ? C.bg : C.muted)
      .when(!strong, el => el.border(1).border_color(C.strong))
      .when(disabled, el => el.opacity(0.45))
      .when(!disabled, el => el.cursor_pointer()
        .when(!strong, b => b.hover(st => st.bg(C.hover).text_color(C.ink)))
        .when(strong, b => b.hover(st => st.opacity(0.88))))
      .tooltip(tip)
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); if (!disabled) onClick(cx); })
      .child(label);
  }

  // Other permission options stay one click beyond Yes / No, in this board copy's render.
  moreOptions(a, ask, options) {
    const disabled = !ask.choices;
    const changeOpen = (open, cx) => {
      const now = stillOn(a.address, ask.key);
      if (open && ask.choices && this.asks[a.address] === ask && now && mayAnswer(now)) this.moreOpen = ask.key;
      else if (this.moreOpen === ask.key) this.moreOpen = null;
      cx.notify();
    };
    return Popover.new(`more-${a.address}`).anchor("bottom_left")
      .open(this.moreOpen === ask.key && !disabled)
      .on_open_change(changeOpen)
      // Stopping the card's press also stops the native trigger: toggle controlled state here.
      .trigger(this.actionButton(`more-trigger-${a.address}`, L.moreOptions, L.moreOptions, (cx) => changeOpen(this.moreOpen !== ask.key, cx), null, disabled))
      .content(v_flex().w(Math.min(360, this.w > 0 ? this.w - 32 : 360)).max_h(280).overflow_y_scrollbar()
        .p(4).gap(2).rounded(6).bg(C.pop).border(1).border_color(C.strong)
        .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
        .on_click((_e, cx) => cx.stop_propagation())
        .children(options.map(o => div().id(`option-${o.n}-${a.address}`).h(28).flex_none().px(8)
          .flex().items_center().rounded(4).text_size(11).text_color(C.ink).cursor_pointer()
          .hover(st => st.bg(C.hover)).tooltip(o.text)
          .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
          .on_click((_e, cx) => { cx.stop_propagation(); this.answer(a, ask, o, cx); })
          .child(div().flex_1().min_w(0).truncate().child(o.text)))));
  }

  // Answer the clicked choice with a digit shortcut or a cursor plan, in one hc keys call.
  // `a` and `ask` are what the clicked card was drawn from: the click answers that request and
  // nothing else, so it does nothing once the board holds a newer read for the agent.
  // hc keys presses keys blindly, so first confirm the agent is still blocked on the same
  // spell (address#seq) and that a fresh screen read shows the same whole dialog (its id, not
  // the card's shortened text); else type nothing and read the screen again. The cached options
  // are dropped at once, so the buttons stay disabled until the status or seq changes (a
  // second click types nothing).
  answer(a, ask, option, cx) {
    if (!ask || this.asks[a.address] !== ask || ask.key !== spell(a)) return;
    const pick = ask.choices && ask.options.includes(option) ? option : null;
    if (!pick || !ask.id) return;
    const cursor = ask.mode === "cursor";
    if (!cursor && !(pick.n >= 1 && pick.n <= 9)) return;
    const delta = cursor ? pick.index - ask.selectedIndex : 0;
    const plan = cursor ? [...Array(Math.abs(delta)).fill(delta > 0 ? "down" : "up"), "enter"] : [String(pick.n)];
    ask.sent = ask.choices;
    ask.choices = null;
    if (this.moreOpen === ask.key) this.moreOpen = null;
    cx.notify();
    const stillBlocked = () => { const now = stillOn(a.address, ask.key); return this.asks[a.address] === ask && !!now && !!answersFor(now, ask); };
    // App snapshots arrive asynchronously. For the pre-report source, re-read the core's
    // process/lifecycle facts on both sides of the screen read as well as checking the snapshot.
    const sameSource = async () => {
      if (!a.source) return true;
      const r = await hc(["get", a.address, "--json"]);
      return r?.code === 0 && startupKey(JSON.parse(r.stdout)) === ask.key && stillBlocked();
    };
    cx.spawn(async (cx) => {
      let typed = false;
      try {
        if (stillBlocked() && await sameSource() && stillBlocked()) {
          const again = await readAsk(a);
          if (again?.id === ask.id && again.mode === ask.mode && (!cursor || again.selectedIndex === ask.selectedIndex)
            && stillBlocked() && await sameSource() && stillBlocked()) {
            const k = await hc(["keys", a.address, ...plan]);
            typed = !k?.code;
          }
        }
      } catch (_e) { typed = false; }
      // Nothing typed: forget this read, so the card reads the screen again.
      if (!typed && this.asks[a.address] === ask) delete this.asks[a.address];
      cx.notify();
    });
  }

  // Card: two lines (task, then where · age). Blocked cards also show what the agent asks.
  card(a, state, ctx, showState = false) {
    const tab = ctx.tabs.get(a.tab);
    const mins = Math.max(0, Math.floor((Date.now() - this.since(a, tab)) / 60000));
    const ageText = statusAge(a.status, duration(mins));
    const stuck = a.status === "working" && mins >= STUCK_MIN;
    const shown = this.shownTitle(a);
    const title = shown.text;
    const where = [a.space_name, tabLabel(a.tab_name, ctx.tabs.get(a.tab)?.named), ctx.paneInfo.get(a.pane)?.branch].filter(Boolean).join(" · ");
    const blocked = a.status === "blocked";
    const hovered = this.hovered === a.address;
    const ask = blocked ? this.asks[a.address] : null;
    const choices = shownChoices(ask);
    const extras = choices && ask.mode === "numbered" ? ask.options.filter(o => o.n >= 1 && o.n <= 9 && o.n !== choices.yes.n && o.n !== choices.no.n) : [];
    return h_flex().id(`agent-${a.address}`).w_full().flex_none().rounded(7).overflow_hidden().relative()
      .when(!blocked, el => el.h(64))
      .bg(C.card).border(1).border_color(a.focused ? C.accent : hovered ? C.strong : C.line).cursor_pointer()
      .tooltip(`${title || L.noTitle}\n${where}\n${a.program?.name ?? ""} · ${a.address}`)
      .on_hover((h, cx) => {
        if (h) this.hovered = a.address; else if (this.hovered === a.address) this.hovered = null;
        cx.notify();
      })
      .on_click(() => run("agent.focus", { terminal: a.address }))
      .child(div().w(3).h_full().bg(state.color).flex_none())
      .child(v_flex().flex_1().min_w(0).px(12).py(10).gap(blocked ? 8 : 6)
        .child(h_flex().gap(8).items_center()
          .child(icon(a.program, 14))
          .when(shown.last, el => el.child(div().flex_none().text_size(10).text_color(C.dim).child(L.lastTask)))
          .child(div().flex_1().min_w(0).text_size(13).font_semibold().text_color(title ? C.ink : C.muted).truncate().child(title || L.noTitle))
          .when(a.pinned, el => el.child(svg("mods/workspace-chrome/pin.svg").size(11).text_color(C.dim).flex_none())))
        .when(blocked, el => el
          .child(div().w_full().px(10).py(7).rounded(6).bg(wash(state.color, "14")).border(1).border_color(wash(state.color, "40"))
            .text_size(11).text_color(ask?.text ? C.ink : C.muted).when(!!ask?.text, d => d.font_family("Geist Mono"))
            .child(ask?.text || L.noAsk))
          // Permission answers share one row and are disabled once one was sent (see answer()).
          .when(!!choices, el => el.child(h_flex().gap(6).items_center()
            .child(this.actionButton(`yes-${a.address}`, L.yes, answerTip(ask, choices.yes), (cx) => this.answer(a, ask, choices.yes, cx), null, !ask.choices))
            .child(this.actionButton(`no-${a.address}`, L.no, answerTip(ask, choices.no), (cx) => this.answer(a, ask, choices.no, cx), null, !ask.choices))
            .when(extras.length > 0, row => row.child(this.moreOptions(a, ask, extras)))))
          .child(h_flex().gap(6).items_center()
            .child(this.actionButton(`answer-${a.address}`, L.answer, L.answer, () => run("agent.focus", { terminal: a.address }), state.color))
            .child(this.actionButton(`peek-b-${a.address}`, L.peek, L.peekTip, () => run("terminal.peek", { terminal: a.address })))
            .child(div().flex_1().min_w(0).truncate().text_right().text_size(10).text_color(state.color)
              .tooltip(ageText).child(ageText))))
        .when(!blocked, el => el.child(h_flex().items_center().gap(8).text_size(11).text_color(C.muted)
          .when(showState, r => r.child(dot(state.color, 6)).child(div().flex_none().font_semibold().text_color(state.color).child(state.label)))
          .child(div().flex_1().min_w(0).truncate().child(where))
          .child(stuck
            ? h_flex().flex_none().gap(4).items_center().px(6).py(1).rounded(4).bg(wash(C.t.working, "26")).text_color(C.t.working)
                .tooltip(L.stuckTip)
                .child(svg("mods/workspace-chrome/clock.svg").size(10)).child(`${ageText} · ${L.stuck}`)
            : div().flex_none().child(ageText)))))
      // Actions show on hover, over the card's top right (blocked cards have theirs inline).
      .when(hovered && !blocked, el => el.child(h_flex().absolute().top(6).right(6).p(2).gap(2).rounded(6).bg(C.pop).border(1).border_color(C.strong)
        .child(this.actionButton(`peek-${a.address}`, L.peek, L.peekTip, () => run("terminal.peek", { terminal: a.address })))
        .child(this.actionButton(`pin-${a.address}`, a.pinned ? L.unpin : L.pin, L.pinTip, () => run("terminal.pin", { terminal: a.address, pinned: !a.pinned })))
        .child(this.actionButton(`settle-${a.address}`, L.settle, L.settleTip, () => run("tab.settle", { id: a.tab })))));
  }

  // The task to show: the title the agent sets now, else the last one this board saw for that
  // terminal (kept in shared state, so it survives restarts and /clear), marked as the last task.
  shownTitle(a) {
    const now = taskTitle(a);
    if (now) return { text: now, last: false, label: now };
    const stored = (shared(TITLES_KEY) ?? {})[a.address]?.title;
    const prev = stored && !isAddress(stored) ? stored : "";
    return prev ? { text: prev, last: true, label: `${L.lastTask}: ${prev}` } : { text: "", last: false, label: L.noTitle };
  }

  // Remember each terminal's latest task title (one shared write, only when something changed).
  rememberTitles(list) {
    const kept = /** @type {Record<string, {title: string, at: number}>} */ (shared(TITLES_KEY) ?? {});
    let changed = false;
    const next = { ...kept };
    for (const a of list) {
      const t = taskTitle(a);
      if (t && kept[a.address]?.title !== t) { next[a.address] = { title: t, at: Date.now() }; changed = true; }
    }
    const keys = Object.keys(next);
    if (keys.length > 60) {
      for (const k of keys.sort((x, y) => (next[x].at ?? 0) - (next[y].at ?? 0)).slice(0, keys.length - 60)) delete next[k];
      changed = true;
    }
    if (changed) setShared(TITLES_KEY, next);
  }

  // Idle agents: one compact row each.
  idleRow(a, ctx) {
    const tab = ctx.tabs.get(a.tab);
    const mins = Math.max(0, Math.floor((Date.now() - this.since(a, tab)) / 60000));
    const t = this.shownTitle(a);
    const where = [a.space_name, tabLabel(a.tab_name, ctx.tabs.get(a.tab)?.named), ctx.paneInfo.get(a.pane)?.branch].filter(Boolean).join(" · ");
    // Two short lines: what it was doing, then where it is.
    return h_flex().id(`idle-${a.address}`).w_full().h(IDLE_ROW).flex_none().px(8).gap(8).items_center().rounded(6).cursor_pointer()
      .bg(a.focused ? C.selected : C.bg).border(1).border_color(a.focused ? C.strong : C.bg)
      .hover(st => st.bg(C.hover))
      .tooltip(`${t.label}\n${where}\n${a.program?.name ?? ""} · ${a.address}`)
      .on_click(() => run("agent.focus", { terminal: a.address }))
      // The program's icon (the session's agent) stays on every item of the board.
      .child(icon(a.program, 14))
      .child(v_flex().flex_1().min_w(0).gap(2)
        .child(h_flex().gap(6).items_center().min_w(0)
          .when(t.last, el => el.child(div().flex_none().text_size(10).text_color(C.dim).child(L.lastTask)))
          .child(div().min_w(0).text_size(12).text_color(t.text ? C.ink : C.muted).truncate().child(t.text || L.noTitle)))
        .child(div().text_size(10).text_color(C.dim).truncate().child(where)))
      .when(a.pinned, el => el.child(svg("mods/workspace-chrome/pin.svg").size(10).text_color(C.dim).flex_none()))
      .child(div().flex_none().text_size(10).text_color(C.dim).child(duration(mins)));
  }

  // ---- Header: one line ----

  spacePill(s, count, compact) {
    const blocked = s.status === "blocked" && !s.active;
    return noDrag(v_flex().id(`space-${s.id}`).flex_none().h(34).justify_center().cursor_pointer()
      .tooltip(s.active ? L.current(s.name) : L.goTo(s.name))
      .on_click(() => run("space.select", { id: s.id }))
      .child(h_flex().h(28).px(10).gap(7).items_center().rounded(7)
        .bg(s.active ? C.selected : blocked ? wash(C.t.blocked, "1f") : C.bar)
        .border(1).border_color(s.active ? C.strong : blocked ? wash(C.t.blocked, "66") : C.bar)
        .hover(st => st.bg(s.active ? C.selected : C.hover))
        .child(statusDot(s.status, 7))
        .child(div().text_size(13).text_color(s.active ? C.ink : C.muted).child(s.name))
        .when(!compact && count > 0, el => el.child(div().text_size(11).text_color(blocked ? C.t.blocked : C.dim).child(String(count)))))
      .child(div().h(2).mx(8).rounded(2).bg(s.active ? C.accent : C.bar)));
  }

  segment(id, options, value, onPick, tip) {
    return noDrag(h_flex().id(id).flex_none().h(30).px(2).gap(2).items_center().rounded(7).border(1).border_color(C.line).tooltip(tip)
      .children(options.map(([code, label]) => div().id(`${id}-${code}`).h(24).px(8).flex().items_center().rounded(5).cursor_pointer()
        .text_size(12).when(id === "lang", el => el.text_size(11).font_semibold())
        .bg(value === code ? C.selected : C.bar).text_color(value === code ? C.ink : C.dim)
        .when(value !== code, el => el.hover(st => st.text_color(C.ink)))
        .on_click(() => { if (value !== code) onPick(code); })
        .child(label))));
  }

  iconButton(id, iconPath, tip, onClick, label = null) {
    return noDrag(h_flex().id(id).flex_none().h(30).px(label ? 10 : 7).gap(7).items_center().rounded(7).cursor_pointer()
      .border(1).border_color(C.line).bg(C.bar).text_size(12).text_color(C.muted)
      .hover(st => st.bg(C.hover).text_color(C.ink).border_color(C.strong))
      .tooltip(tip).on_click(onClick)
      .child(svg(iconPath).size(14).flex_none()).when(!!label, el => el.child(label)));
  }

  header(list) {
    const all = spaces();
    const narrow = this.below(1100);
    const tiny = this.below(760);
    const filter = shared(FILTER_KEY) === "here" ? "here" : "all";
    return this.sized(h_flex().size_full().bg(C.bar).px(narrow ? 12 : 18).gap(narrow ? 6 : 10).items_center()
      .child(image("mods/herdboard/logo.svg").size(22).flex_none())
      .when(!narrow, el => el.child(div().text_size(14).font_semibold().text_color(C.ink).flex_none().child("Herdboard")))
      .child(div().w(1).h(20).bg(C.line).mx(4).flex_none())
      .child(h_flex().id("space-strip").flex_1().min_w(0).gap(4).items_center().overflow_x_scrollbar()
        .children(all.map(s => {
          const shown = list.filter(a => a.space === s.id && !s.tabs.find(t => t.id === a.tab)?.settled);
          return this.spacePill(shown.some(a => a.source) ? { ...s, status: "blocked" } : s, shown.length, tiny);
        })))
      .child(this.segment("filter", [["all", L.all], ["here", tiny ? L.hereShort : L.here]], filter, (v) => setShared(FILTER_KEY, v), L.filterTip))
      .child(this.iconButton("space-find", "mods/workspace-chrome/search.svg", L.searchTip, () => run("mod.open", { name: "herdboard-picker" }), narrow ? null : L.search))
      .child(this.segment("lang", [["pt", "PT"], ["en", "EN"]], lang(), (v) => setShared(LANG_KEY, v), L.langTip))
      .child(noDrag(div().id("more").size(30).flex_none().flex().items_center().justify_center().rounded(7).cursor_pointer()
        .border(1).border_color(C.line).text_color(C.muted).text_size(16)
        .hover(st => st.bg(C.hover).text_color(C.ink))
        .tooltip(L.more)
        .on_click(() => openOverlay({ mod: "herdboard", kind: "popup", width: 240, height: 128, props: { role: "menu" } }))
        .child("⋯"))));
  }

  // The ⋯ menu (a popup copy of this mod).
  menu() {
    const close = () => closeOverlay(props().overlay);
    const item = (id, label, fn) => div().id(id).w_full().h(32).px(10).flex().items_center().rounded(6).cursor_pointer()
      .text_size(13).text_color(C.ink).hover(st => st.bg(C.hover))
      .on_click(() => { close(); fn(); }).child(label);
    return v_flex().size_full().p(6).gap(2).bg(C.pop)
      // New spaces and tabs start in the active tab's live folder (the real project), never in a
      // space's registered folder, which Herdr can't change afterwards and may be stale.
      .child(item("m-space", L.newSpace, () => run("space.new", { folder: liveFolder(), machine: spaces().find(s => s.active)?.machine ?? "" })))
      .child(item("m-tab", L.newTab, () => run("tab.new", { folder: liveFolder() })))
      .child(div().h(1).bg(C.line).my(4))
      .child(item("m-main", L.defaultLayout, () => {
        notify({ title: L.defaultLayoutTitle, body: L.defaultLayoutBody, timeout: 6000 });
        run("layout.switch", { name: "main" });
      }));
  }

  // ---- Workspace rail: the active space's tabs, the shown terminal, expand ----

  rail() {
    const active = spaces().find(s => s.active);
    const tabs = active?.tabs ?? [];
    const narrow = this.below(760);
    const shownTab = tabs.find(t => t.active);
    const tabPanes = panes().filter(p => p.tab === shownTab?.id);
    const pane = tabPanes.find(p => p.focused) ?? tabPanes[0];
    const on = isExpanded();
    return this.sized(h_flex().size_full().px(10).items_center().gap(6).bg(C.bar)
      .child(h_flex().id("tab-strip").flex_1().min_w(0).gap(4).items_center().overflow_x_scrollbar().children(tabs.map(tab =>
        h_flex().id(`tab-${tab.id}`).flex_none().h(26).px(10).gap(6).items_center().rounded(5).cursor_pointer()
          .bg(tab.active ? C.selected : C.bar).border(1).border_color(tab.active ? C.strong : C.bar)
          .text_size(12).text_color(tab.active ? C.ink : C.muted)
          .hover(st => st.bg(C.hover).text_color(C.ink))
          .on_hover((h, cx) => {
            if (h) this.hoverTab = tab.id; else if (this.hoverTab === tab.id) this.hoverTab = null;
            cx.notify();
          })
          .on_click(() => run("tab.select", { id: tab.id }))
          .child(statusDot(tab.status, 7))
          .child(tab.named ? tab.name : `${L.tab} ${tab.name}`)
          // Close (as Herdr's tab bar): on the active tab and the one under the pointer. Ends the
          // tab's terminals; closing a space's last tab closes the space, and Herdr asks first.
          .when(tab.active || this.hoverTab === tab.id, el => el.child(div().id(`close-${tab.id}`).size(16).ml(2).flex_none()
            .flex().items_center().justify_center().rounded(4).text_color(C.dim)
            .hover(st => st.bg(C.strong).text_color(C.ink))
            .tooltip(L.closeTabTip)
            .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
            .on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: tab.id }); })
            .child(svg("mods/workspace-chrome/x.svg").size(11))))))
        // Right after the tabs: a new tab, with Herdr's own menu (a terminal or any installed agent).
        .child(div().id("tab-new").flex_none().size(26).flex().items_center().justify_center().rounded(5).cursor_pointer()
          .text_size(16).text_color(C.muted).border(1).border_color(C.bar)
          .hover(st => st.bg(C.hover).text_color(C.ink).border_color(C.strong))
          .tooltip(L.newTabTip)
          .on_click(() => openOverlay({ mod: "herdboard-new-menu", kind: "popup", width: 300, height: 600 }))
          .child("+")))
      .when(!narrow && !!pane, el => el
        .child(icon(pane.program, 14))
        .child(div().flex_none().text_size(12).text_color(C.muted).child(pane.program?.name ?? "Terminal"))
        .child(statusDot(pane.status, 7))
        .child(div().w(1).h(16).bg(C.line).mx(4).flex_none()))
      .child(h_flex().id("expand-terminals").flex_none().h(26).px(narrow ? 7 : 10).gap(6).items_center().rounded(6).cursor_pointer()
        .border(1).border_color(on ? C.accent : C.line).bg(on ? C.selected : C.bar)
        .text_size(12).text_color(on ? C.ink : C.muted)
        .hover(st => st.bg(C.hover).text_color(C.ink).border_color(on ? C.accent : C.strong))
        .tooltip(on ? L.restoreTip : L.expandTip)
        .on_click(() => toggleExpanded())
        .child(svg(on ? "mods/herdboard/minimize.svg" : "mods/herdboard/maximize.svg").size(13).flex_none())
        .when(!narrow, el => el.child(on ? L.restore : L.expand))));
  }

  // ---- The board ----

  // Agents to show, grouped by status once: settled tabs left out, the filter applied, pinned first.
  groups(list) {
    const all = spaces();
    const tabs = new Map(all.flatMap(sp => sp.tabs.map(tb => [tb.id, tb])));
    const activeSpace = all.find(s => s.active)?.id;
    const here = shared(FILTER_KEY) === "here";
    const by = Object.fromEntries(STATES.map(s => [s.key, []]));
    for (const a of list) {
      if (tabs.get(a.tab)?.settled || (here && a.space !== activeSpace)) continue;
      (by[a.status] ?? by.idle).push(a);
    }
    this.perTab = new Map();
    for (const a of list) this.perTab.set(a.tab, (this.perTab.get(a.tab) ?? 0) + 1);
    for (const k in by) by[k].sort((x, y) => (y.pinned ? 1 : 0) - (x.pinned ? 1 : 0));
    return { by, tabs, paneInfo: new Map(panes().map(p => [p.pane, p])) };
  }

  blockedHeight(a) {
    const text = this.asks[a.address]?.text;
    // The snippet wraps: estimate its lines from the column width (11px mono ≈ 6.6px a character).
    const inner = Math.max(120, (this.colW || 300) - 3 - 24 - 20 - 14);
    const perLine = Math.max(16, Math.floor(inner / 6.6));
    const lines = (text || L.noAsk).split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
    // The Yes / No row, when the card shows one: 24px buttons and the 8px gap above them.
    const answers = shownChoices(this.asks[a.address]) ? 24 + 8 : 0;
    return 10 + 20 + 8 + (16 + lines * 16) + answers + 8 + 24 + 10 + 2;
  }

  // Size the board block to its tallest column (140–360px; past that, columns scroll).
  // Only when the size really changes, so it never loops; never while expanded (hidden).
  fitHeight(want) {
    if (isExpanded() || this.h === 0) return;
    want = Math.max(140, Math.min(360, Math.round(want)));
    if (Math.abs(want - this.h) <= 4 || want === this.lastFit) return;
    this.lastFit = want;
    run("layout.resize", { id: "herdboard-cards", px: want });
  }

  // Narrow windows: one list, most urgent first, each card labelled with its status.
  boardList(ctx) {
    const ordered = STATES.flatMap(state => ctx.by[state.key].map(a => ({ a, state })));
    const padY = 12, gap = 8;
    this.fitHeight(padY * 2 + 24 + 9 + ordered.reduce((h, { a }) => h + (a.status === "blocked" ? this.blockedHeight(a) : 64) + gap, 0));
    return this.sized(v_flex().size_full().px(14).py(padY).gap(9).bg(C.bg)
      .child(h_flex().flex_none().gap(6).items_center().flex_wrap().children(STATES.map(state => {
        const n = ctx.by[state.key].length;
        const urgent = state.key === "blocked" && n > 0;
        return h_flex().id(`count-${state.key}`).h(24).px(8).gap(6).items_center().rounded(6)
          .bg(urgent ? wash(state.color, "1f") : C.bar).border(1).border_color(urgent ? wash(state.color, "66") : C.line)
          .text_size(11).text_color(n ? C.ink : C.dim).tooltip(state.label)
          .child(dot(state.color, 7)).child(state.label).child(div().text_color(state.color).when(urgent, el => el.font_semibold()).child(String(n)));
      })))
      .child(v_flex().id("board-list").flex_1().min_h(0).overflow_y_scrollbar().gap(gap)
        .when(ordered.length === 0, el => el.items_center().justify_center().child(div().text_size(11).text_color(C.dim).child(L.none)))
        .children(ordered.map(({ a, state }) => this.card(a, state, ctx, true)))));
  }

  board(list, cx) {
    this.rememberTitles(list);
    const ctx = this.groups(list);
    // Agent navigation (agent.next/prev) follows the board's order.
    const idleShown = shared(IDLE_KEY) !== false || this.below(800);
    setAgentOrder(STATES.filter(s => s.key !== "idle" || idleShown).flatMap(s => ctx.by[s.key].map(a => a.address)));
    this.fetchAsks(ctx.by.blocked, cx);
    if (this.below(800)) { this.colW = this.w - 28; return this.boardList(ctx); }
    const narrow = this.below(1100);
    const padX = narrow ? 16 : 24, padY = 14, colGap = narrow ? 10 : 16, gap = 8;
    this.colW = this.w > 0 ? (this.w - padX * 2 - colGap * 3) / 4 : 0;
    const idleOpen = shared(IDLE_KEY) !== false;
    const colHeight = (key) => {
      const items = ctx.by[key];
      if (!items.length) return 40;
      if (key === "idle") return idleOpen ? items.length * IDLE_ROW + (items.length - 1) * 4 : 0;
      return items.reduce((h, a) => h + (key === "blocked" ? this.blockedHeight(a) : 64) + gap, -gap) + (key === "blocked" ? 12 : 0);
    };
    this.fitHeight(padY * 2 + 26 + gap + Math.max(...STATES.map(s => colHeight(s.key))) + 2);
    return this.sized(h_flex().size_full().px(padX).py(padY).gap(colGap).bg(C.bg).children(STATES.map(state => {
      const items = ctx.by[state.key];
      const empty = items.length === 0;
      const urgent = state.key === "blocked" && !empty;
      const isIdle = state.key === "idle";
      const head = h_flex().id(`head-${state.key}`).h(26).flex_none().items_center().gap(8).px(6).rounded(6)
        .when(urgent, el => el.bg(wash(state.color, "1f")))
        .child(dot(state.color, 8))
        .child(div().min_w(0).text_size(13).font_semibold().text_color(empty ? C.muted : C.ink).truncate().child(state.label))
        .child(div().flex_none().px(6).py(2).rounded(4).bg(state.wash).text_size(10).text_color(state.color)
          .when(urgent, el => el.font_semibold()).child(String(items.length)))
        .when(isIdle && !empty, el => el.cursor_pointer().hover(st => st.bg(C.hover))
          .on_click(() => setShared(IDLE_KEY, !idleOpen))
          .child(div().flex_1())
          .child(div().flex_none().text_size(11).text_color(C.dim).child(idleOpen ? L.fold : L.unfold)));
      const body = v_flex().id(`cards-${state.key}`).flex_1().min_h(0).overflow_y_scrollbar().gap(isIdle ? 4 : gap)
        .when(empty, el => el.child(div().h(40).flex_none().rounded(7).border(1).border_color(C.line)
          .flex().items_center().justify_center().text_size(11).text_color(C.dim).child(L.none)))
        .when(!empty && (!isIdle || idleOpen), el => el.children(items.map(a => isIdle ? this.idleRow(a, ctx) : this.card(a, state, ctx))));
      return v_flex().flex_1().min_w(0).h_full().gap(gap)
        .when(urgent, el => el.p(6).rounded(9).bg(wash(state.color, "0f")).border(1).border_color(wash(state.color, "40")))
        .child(head).child(body);
    })));
  }

  render(cx) {
    palette();
    const role = props()?.role;
    if (role === "menu") return this.menu();
    if (!role) this.fetchRequests(startupCandidates(), cx);
    const knownStartup = shared(STARTUP_KEY);
    const startup = startupCandidates().filter(a => {
      if (role) return Array.isArray(knownStartup) && knownStartup.includes(spell(a));
      const ask = this.asks[a.address];
      return ask?.key === spell(a) && ask.visible;
    });
    if (!role) {
      const keys = startup.map(spell);
      if (JSON.stringify(knownStartup) !== JSON.stringify(keys)) setShared(STARTUP_KEY, keys);
    }
    const list = [...agents(), ...startup];
    if (role === "header") return this.header(list);
    if (role === "terminals") return this.rail();
    if (role === "pane") {
      const p = panes().find(p => p.pane === props().pane);
      return h_flex().size_full().px(13).items_center().gap(7).bg(C.head).border_b(1).border_color(C.line)
        .child(icon(p?.program, 14)).child(div().text_size(11).text_color(C.ink).child(p?.program?.name ?? "Terminal"))
        .child(div().flex_1()).child(dot(stateColor(p?.status), 6));
    }
    return this.board(list, cx);
  }
}
