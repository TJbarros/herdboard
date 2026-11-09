import { terminals as nativeTerminals, theme as nativeTheme } from "herdr";

// Untyped native snapshots enter once here. Consumers receive only validated fields;
// unavailable optional facts stay absent rather than acquiring a guessed value.
/** @param {unknown} value @returns {value is Record<string, unknown>} */
export const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
/** @param {unknown} value */
const text = value => typeof value === "string" ? value : undefined;
/** @param {unknown} value */
const number = value => typeof value === "number" && Number.isFinite(value) ? value : undefined;
/** @param {unknown} value */
const boolean = value => typeof value === "boolean" ? value : undefined;
/** @param {unknown} value @returns {string[] | undefined} */
const argv = value => Array.isArray(value) && value.every(v => typeof v === "string") ? value : undefined;
/** @param {unknown} value @returns {import("./types.js").StatusReport | undefined} */
const report = value => isRecord(value) ? { state: text(value.state), app: text(value.app), kind: text(value.kind) } : undefined;

/** @param {unknown} value @returns {import("./types.js").CoreTerminal | null} */
export function readTerminal(value) {
  if (!isRecord(value) || typeof value.address !== "string") return null;
  const f = isRecord(value.foreground) ? value.foreground : null;
  const p = isRecord(value.program) ? value.program : null;
  /** @type {Record<string, string>} */
  const labels = {};
  if (isRecord(value.labels)) for (const [key, label] of Object.entries(value.labels)) {
    if (typeof label === "string") labels[key] = label;
  }
  return { address: value.address, state: text(value.state), screen: text(value.screen),
    created_ms: number(value.created_ms), pid: number(value.pid), parent: text(value.parent), cwd: text(value.cwd), argv: argv(value.argv),
    reported: boolean(value.reported), turn: number(value.turn), title: text(value.title), labels,
    status: typeof value.status === "string" ? value.status : report(value.status), report: report(value.report),
    foreground: f ? { pid: number(f.pid), cwd: text(f.cwd), name: text(f.name), argv: argv(f.argv) } : undefined,
    program: p ? { key: text(p.key), name: text(p.name), icon: text(p.icon), tint: boolean(p.tint),
      shell: boolean(p.shell), agent: boolean(p.agent), tile: text(p.tile), color: text(p.color) } : undefined };
}

export function terminals() {
  const values = nativeTerminals();
  return values.map(readTerminal).filter(value => value !== null);
}

/** @param {unknown} value @returns {value is import("gpui-kit").Color} */
export const isColor = value => typeof value === "string" && value.startsWith("#");
export function theme() {
  /** @type {Record<string, import("gpui-kit").Color>} */
  const colors = {};
  for (const [name, value] of Object.entries(nativeTheme())) {
    if (!isColor(value)) throw new TypeError(`Herdr theme color ${name} must use a hexadecimal value`);
    colors[name] = value;
  }
  return colors;
}
