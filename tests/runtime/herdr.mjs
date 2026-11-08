// Stand-in for the Herdr runtime. Tests set `herdr.agents` / `herdr.terminals`; every `hc` call
// waits in `herdr.calls` until the test settles it, so a test decides the order reads finish in.
export const herdr = { agents: [], terminals: [], spaces: [], panes: [], props: {}, calls: [], runs: [], shared: {} };
export const agents = () => herdr.agents;
export const terminals = () => herdr.terminals;
export const hc = (args) => new Promise((resolve) => herdr.calls.push({ args, resolve }));
export const shared = (key) => herdr.shared[key];
export const setShared = (key, value) => { herdr.shared[key] = value; };
export const spaces = () => herdr.spaces, panes = () => herdr.panes, props = () => herdr.props, layout = () => ({});
export const theme = () => ({}), notify = () => {}, setAgentOrder = () => {};
export const run = (command, args) => {
  herdr.runs.push({ command, args });
  if (command === "tab.settle" || command === "tab.unsettle") {
    const tab = herdr.spaces.flatMap(s => s.tabs).find(t => t.id === args.id);
    if (tab) tab.settled = command === "tab.settle";
  }
};
export const openOverlay = () => {}, closeOverlay = () => {};
