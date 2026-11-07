// Stand-in for gpui-kit / gpui-base: every builder call chains, `when` runs its branch, and an
// element's click handler is kept under its id, so a test can click a card's button.
export const clicks = new Map();
function element() {
  let id = null;
  const el = new Proxy({}, {
    get: (_t, name) => {
      if (name === "then") return undefined;
      if (name === "id") return (v) => { id = v; return el; };
      if (name === "when") return (cond, f) => (cond ? f(el) ?? el : el);
      if (name === "on_click") return (f) => { if (id) clicks.set(id, f); return el; };
      return () => el;
    },
  });
  return el;
}
export class View {}
export const div = element, svg = element, image = element, h_flex = element, v_flex = element;
