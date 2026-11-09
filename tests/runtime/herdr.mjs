// Stand-in for the Herdr runtime. Tests set `herdr.agents` / `herdr.terminals`; every `hc` call
// waits in `herdr.calls` until the test settles it, so a test decides the order reads finish in.
export const herdr = { agents: [], terminals: [], spaces: [], panes: [], props: {}, calls: [], execCalls: [], runs: [], shared: {}, layout: {} };
export const agents = () => herdr.agents;
export const terminals = () => herdr.terminals;
export const hc = (args) => new Promise((resolve, reject) => herdr.calls.push({ args, resolve, reject }));
export const exec = (command, args, options) => new Promise((resolve, reject) => {
  const call = { command, args, options, settled: false,
    resolve: value => { call.settled = true; resolve(value); },
    reject: error => { call.settled = true; reject(error); } };
  herdr.execCalls.push(call);
});
export const shared = (key) => herdr.shared[key];
export const setShared = (key, value) => { herdr.shared[key] = value; };
export const spaces = () => herdr.spaces, panes = () => herdr.panes, props = () => herdr.props, layout = () => herdr.layout;
export const theme = () => ({}), notify = () => {}, setAgentOrder = () => {};
export const run = (command, args) => {
  herdr.runs.push({ command, args });
  if (command === "tab.settle" || command === "tab.unsettle") {
    const tab = herdr.spaces.flatMap(s => s.tabs).find(t => t.id === args.id);
    if (tab) tab.settled = command === "tab.settle";
  }
};
export const openOverlay = () => {}, closeOverlay = () => {};
