// Stand-in for gpui-kit / gpui-base: every builder call chains, `when` runs its branch, and an
// element's click handler is kept under its id, so a test can click a card's button.
export const clicks = new Map();
export const elements = new Map();
export const popovers = new Map();
function element(source) {
  let id = null;
  const data = { children: [], props: {} };
  if (source !== undefined) data.source = source;
  const el = new Proxy({}, {
    get: (_t, name) => {
      if (name === "then") return undefined;
      if (name === "data") return data;
      if (name === "id") return (v) => { id = v; data.id = v; elements.set(id, data); return el; };
      if (name === "when") return (cond, f) => (cond ? f(el) ?? el : el);
      if (name === "child") return (v) => { data.children.push(v); return el; };
      if (name === "children") return (vs) => { data.children.push(...vs); return el; };
      if (name === "on_click") return (f) => { data.props.on_click = [f]; if (id) clicks.set(id, f); return el; };
      // A control can stop more than one button. Keep every registration, and the last one
      // where existing tests read props.on_mouse_down.
      if (name === "on_mouse_down") return (...args) => {
        data.props.on_mouse_down = args;
        (data.props.on_mouse_downs ??= []).push(args);
        return el;
      };
      return (...args) => { data.props[name] = args; return el; };
    },
  });
  return el;
}
export class View {}
export const div = element, svg = element, image = element, h_flex = element, v_flex = element;
// Native Popover owns its trigger and reports open/dismiss through on_open_change. Keep its
// controlled state and slots so tests can open the surface, choose an item and dismiss it.
export const Popover = { new(id) { const el = element().id(id); popovers.set(id, el.data); return el; } };
