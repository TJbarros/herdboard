import type { AgentInfo, PaneInfo, Program, SpaceInfo, TabInfo } from "herdr";
import type { Color } from "gpui-kit";
import type { ParsedAsk, AnswerPair } from "./ask.js";

export type ReportedStatus = AgentInfo["status"];
export type BoardStatus = ReportedStatus | "unknown";
export type ProgramPresentation = Partial<Program>;
export interface StatusReport { state?: string; app?: string; kind?: string }
export interface Foreground { pid?: number; cwd?: string; name?: string; argv?: string[] }
export interface CoreTerminal {
  address: string;
  state?: string;
  screen?: string;
  created_ms?: number;
  pid?: number;
  parent?: string;
  cwd?: string;
  argv?: string[];
  foreground?: Foreground;
  reported?: boolean;
  status?: string | StatusReport;
  report?: StatusReport;
  turn?: number;
  title?: string;
  labels?: Record<string, string>;
  program?: ProgramPresentation;
}
export interface DiscoverySource { kind: "workspace-trust" | "cursor-process"; key: string; folder?: string }
export type BoardAgent = Omit<AgentInfo, "status" | "app" | "seq" | "program" | "pinned" | "focused" | "tab_index"> & {
  status: BoardStatus;
  app?: string;
  seq?: number;
  program?: ProgramPresentation;
  pinned?: boolean;
  focused?: boolean;
  source?: DiscoverySource;
};
export interface StatusGroup { key: BoardStatus; color: Color; label: string; wash: Color }
export interface BoardGroups {
  by: Record<BoardStatus, BoardAgent[]>;
  tabs: Map<string, TabInfo>;
  spaces: Map<string, SpaceInfo>;
  hasRemote: boolean;
  paneInfo: Map<string, PaneInfo>;
}
export interface StatusObservation { status: BoardStatus; source?: string; at: number }
export interface RememberedTitle { title: string; at: number; lifecycle?: string | null }
export type CachedAsk = ParsedAsk & { key: string; choices?: AnswerPair; sent?: AnswerPair; visible?: boolean; checkedAt?: number };
export interface Activity { a: BoardAgent; key: string; text: string | null; expires?: number }

export interface BoardText extends Record<BoardStatus, string> {
  verb: Record<ReportedStatus, string>;
  ago?: Partial<Record<ReportedStatus, boolean>>;
  stuck: string; stuckTip: string; noTitle: string; tab: string; none: string;
  doingNow: string; noActivity: string;
  localMachine: string; localMachineTip: string; remoteMachineTip(name: string): string;
  unknownMachine: string; unknownMachineTip: string;
  current(name: string): string; goTo(name: string): string;
  all: string; here: string; filterTip: string; search: string; searchTip: string;
  more: string; newSpace: string; newTab: string; newTabTip: string; closeTabTip: string;
  defaultLayout: string; defaultLayoutTitle: string; defaultLayoutBody: string;
  expand: string; restore: string; expandTip: string; restoreTip: string; langTip: string;
  answer: string; peek: string; pin: string; unpin: string; settle: string;
  peekTip: string; pinTip: string; settleTip: string; noAsk: string;
  yes: string; no: string; moreOptions: string; answerTip(n: number, text: string): string;
  cursorAnswerTip(text: string): string; shortcutAnswerTip(key: string, text: string): string;
  cancelAnswerTip(text: string): string;
  fold: string; unfold: string; lastTask: string; hereShort: string;
  worktree(n: number): string; worktreeUnavailable: string; worktreeTip: string;
}
