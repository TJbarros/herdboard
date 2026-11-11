// Herdr window controls through the real board module. The stand-in records the command and
// the press; it does not minimize, maximize, or close a window.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { register } from "node:module";
register("./runtime/hooks.mjs", import.meta.url);
const { herdr } = await import("./runtime/herdr.mjs");
const { clicks, elements } = await import("./runtime/gpui.mjs");
const { default: Herdboard } = await import("../mods/herdboard/main.js");

const cx = { spawn: f => f(cx), notify() {}, stop_propagation() {},
  timer: { every() {} }, sleep: () => new Promise(() => {}) };
function board() { const b = new Herdboard(); b.init(null, cx); return b; }
function render(b) { clicks.clear(); elements.clear(); return b.render(cx); }
const childIds = (node) => (node?.data?.children ?? []).map(child => child.data?.id).filter(Boolean);

beforeEach(() => {
  herdr.agents = [];
  herdr.terminals = [];
  herdr.panes = [{ pane: "p1", tab: "tab1", focused: true, program: { name: "Terminal" } }];
  herdr.spaces = [{ id: "s1", machine: null, name: "Project", active: true,
    tabs: [{ id: "tab1", name: "1", active: true, named: false }] }];
  herdr.props = {};
  herdr.shared = { "herdboard.lang": "en" };
  herdr.calls.length = 0;
  herdr.runs.length = 0;
  herdr.layout = { children: [
    { id: "herdboard-header", hidden: false },
    { id: "herdboard-cards", hidden: false },
  ] };
  herdr.window = { platform: "linux", titlebar: "none", buttons: false, maximized: false, fullscreen: false, active: true };
});

test("the visible header shows minimize, maximize and close when Herdr draws no window buttons", () => {
  herdr.window.buttons = true;
  const b = board();
  herdr.props = { role: "header" };
  const header = render(b);
  const order = childIds(header);
  assert.deepEqual(order.slice(-3), ["window-minimize", "window-maximize", "window-close"]);
  assert.ok(order.indexOf("more") < order.indexOf("window-minimize"), "window controls sit after the more menu");
  assert.deepEqual(elements.get("space-strip").props.flex_1, []);
  assert.deepEqual(elements.get("space-strip").props.min_w, [0]);
  assert.ok(elements.get("space-strip").props.overflow_x_scrollbar);

  herdr.runs.length = 0;
  for (const [id, command] of [
    ["window-minimize", "window.minimize"],
    ["window-maximize", "window.maximize"],
    ["window-close", "window.close"],
  ]) {
    const button = elements.get(id);
    assert.deepEqual(button.props.flex_none, [], id);
    for (const press of button.props.on_mouse_downs) {
      let stopped = false;
      press[1]({}, { stop_propagation() { stopped = true; } });
      assert.equal(stopped, true, `${id} ${press[0]}`);
    }
    assert.deepEqual(button.props.on_mouse_downs.map(press => press[0]), ["left", "right"], id);
    clicks.get(id)({}, cx);
    assert.deepEqual(herdr.runs.at(-1), { command, args: undefined });
  }
  assert.deepEqual(herdr.runs.map(run => run.command), ["window.minimize", "window.maximize", "window.close"]);

  herdr.props = { role: "terminals" };
  render(b);
  assert.equal(elements.has("window-minimize"), false);
  assert.equal(elements.has("window-maximize"), false);
  assert.equal(elements.has("window-close"), false);
});

test("hiding the header block moves that one set of window controls onto the tab rail", () => {
  herdr.window.buttons = true;
  herdr.layout.children[0].hidden = true;
  const b = board();
  herdr.props = { role: "header" };
  render(b);
  assert.equal(elements.has("window-minimize"), false);
  assert.equal(elements.has("window-close"), false);

  herdr.props = { role: "terminals" };
  const rail = render(b);
  assert.deepEqual(childIds(rail).slice(-3), ["window-minimize", "window-maximize", "window-close"]);
  assert.ok(childIds(rail).indexOf("expand-terminals") < childIds(rail).indexOf("window-minimize"));
  assert.ok(childIds(rail).includes("tab-strip"));
  assert.deepEqual(elements.get("tab-strip").props.flex_1, []);
  assert.deepEqual(elements.get("tab-strip").props.min_w, [0]);
  assert.ok(elements.get("tab-strip").props.overflow_x_scrollbar);

  b.w = 700;
  const narrow = render(b);
  assert.deepEqual(childIds(narrow).slice(-3), ["window-minimize", "window-maximize", "window-close"]);
  assert.ok(childIds(narrow).includes("tab-strip"));
  assert.equal(elements.has("expand-terminals"), true);

  herdr.layout.children[0].hidden = false;
  b.w = 1200;
  herdr.props = { role: "header" };
  assert.deepEqual(childIds(render(b)).slice(-3), ["window-minimize", "window-maximize", "window-close"]);
  herdr.props = { role: "terminals" };
  render(b);
  assert.equal(elements.has("window-close"), false);
});

const glyph = (id) => elements.get(id).children.find(child => child.data?.source)?.data.source;

test("the maximize control shows restore while the window is maximized, in both languages", () => {
  herdr.window.buttons = true;
  const b = board();
  herdr.props = { role: "header" };
  const copy = {
    en: {
      minimize: "Minimize the window", maximize: "Maximize the window",
      restore: "Restore the window", close: "Close the window",
      tab: "Close the tab and end its terminals (Ctrl+Shift+W)",
    },
    pt: {
      minimize: "Minimizar a janela", maximize: "Maximizar a janela",
      restore: "Restaurar a janela", close: "Fechar a janela",
      tab: "Fechar a aba e encerrar os terminais dela (Ctrl+Shift+W)",
    },
  };
  for (const lang of ["en", "pt"]) {
    herdr.shared["herdboard.lang"] = lang;
    herdr.window.maximized = false;
    herdr.window.fullscreen = true;
    render(b);
    assert.equal(glyph("window-minimize"), "mods/herdboard/window-minimize.svg");
    assert.equal(glyph("window-maximize"), "mods/herdboard/window-maximize.svg");
    assert.equal(glyph("window-close"), "mods/herdboard/window-close.svg");
    assert.equal(elements.get("window-minimize").props.tooltip[0], copy[lang].minimize);
    assert.equal(elements.get("window-maximize").props.tooltip[0], copy[lang].maximize);
    assert.equal(elements.get("window-close").props.tooltip[0], copy[lang].close);
    assert.notEqual(elements.get("window-close").props.tooltip[0], copy[lang].tab);

    herdr.window.maximized = true;
    herdr.window.fullscreen = false;
    herdr.runs.length = 0;
    render(b);
    assert.equal(glyph("window-maximize"), "mods/herdboard/window-restore.svg");
    assert.equal(elements.get("window-maximize").props.tooltip[0], copy[lang].restore);
    clicks.get("window-maximize")({}, cx);
    assert.deepEqual(herdr.runs, [{ command: "window.maximize", args: undefined }]);
  }
});

test("Herdboard draws no window controls when the system is already drawing them", () => {
  const b = board();
  for (const fact of [
    { platform: "linux", titlebar: "none" },
    { platform: "windows", titlebar: "system" },
    { platform: "macos", titlebar: "none" },
  ]) {
    herdr.window = { ...fact, buttons: false, maximized: true, fullscreen: false, active: true };
    for (const hidden of [false, true]) {
      herdr.layout.children[0].hidden = hidden;
      for (const role of ["header", "terminals"]) {
        herdr.props = { role };
        render(b);
        assert.equal(elements.has("window-minimize"), false, `${fact.platform} ${role}`);
        assert.equal(elements.has("window-maximize"), false, `${fact.platform} ${role}`);
        assert.equal(elements.has("window-close"), false, `${fact.platform} ${role}`);
      }
    }
  }
  herdr.window = { platform: "macos", titlebar: "none", buttons: true, maximized: false, fullscreen: false, active: true };
  herdr.layout.children[0].hidden = false;
  herdr.props = { role: "header" };
  render(b);
  assert.equal(elements.has("window-close"), true);
});

test("the menu, pane and board do not draw window controls", () => {
  herdr.window.buttons = true;
  const b = board();
  for (const role of ["menu", "pane", undefined]) {
    herdr.props = role ? { role, pane: "p1" } : {};
    render(b);
    assert.equal(elements.has("window-minimize"), false, role ?? "board");
    assert.equal(elements.has("window-maximize"), false, role ?? "board");
    assert.equal(elements.has("window-close"), false, role ?? "board");
  }
});

test("expand and restore still hide and show the board with the arrow glyphs", () => {
  herdr.window.buttons = true;
  const b = board();
  herdr.props = { role: "terminals" };
  render(b);
  assert.equal(glyph("expand-terminals"), "mods/herdboard/maximize.svg");
  assert.equal(elements.get("expand-terminals").props.tooltip[0], "Expand the terminals to fill the whole area");
  clicks.get("expand-terminals")({}, cx);
  assert.deepEqual(herdr.runs, [
    { command: "layout.hide", args: { id: "herdboard-header" } },
    { command: "layout.hide", args: { id: "herdboard-cards" } },
  ]);

  herdr.layout.children[1].hidden = true;
  herdr.runs.length = 0;
  render(b);
  assert.equal(glyph("expand-terminals"), "mods/herdboard/minimize.svg");
  assert.equal(elements.get("expand-terminals").props.tooltip[0], "Show the agent board again");
  assert.equal(elements.has("window-close"), false);
  clicks.get("expand-terminals")({}, cx);
  assert.deepEqual(herdr.runs, [
    { command: "layout.show", args: { id: "herdboard-header" } },
    { command: "layout.show", args: { id: "herdboard-cards" } },
  ]);

  herdr.shared["herdboard.lang"] = "pt";
  herdr.layout.children[0].hidden = true;
  render(b);
  assert.equal(elements.get("expand-terminals").props.tooltip[0], "Voltar a mostrar o quadro de agentes");
  assert.equal(glyph("expand-terminals"), "mods/herdboard/minimize.svg");
  assert.equal(elements.get("window-close").props.tooltip[0], "Fechar a janela");
  assert.equal(elements.get("close-tab1").props.tooltip[0], "Fechar a aba e encerrar os terminais dela (Ctrl+Shift+W)");
  herdr.runs.length = 0;
  clicks.get("close-tab1")({}, cx);
  assert.deepEqual(herdr.runs, [{ command: "tab.close", args: { id: "tab1" } }]);
});

test("a narrow header keeps the window controls after the scrolling space pills", () => {
  herdr.window.buttons = true;
  const b = board();
  b.w = 700;
  herdr.props = { role: "header" };
  const header = render(b);
  assert.deepEqual(childIds(header).slice(-3), ["window-minimize", "window-maximize", "window-close"]);
  assert.deepEqual(elements.get("space-strip").props.flex_1, []);
  assert.deepEqual(elements.get("space-strip").props.min_w, [0]);
  assert.ok(elements.get("space-strip").props.overflow_x_scrollbar);
});
