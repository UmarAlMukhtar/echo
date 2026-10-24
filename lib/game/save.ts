import type { DecisionId, Decisions, FragmentId, NpcId } from "./types";

export const SAVE_KEY = "echo-save-v1";
export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  fragments: FragmentId[];
  talkedTo: NpcId[];
  puzzleSolved: boolean;
  decisions: Decisions;
  playerPos: [number, number];
  mode: "3d" | "story";
  savedAt: number;
}

export type LoadStatus = "ok" | "none" | "corrupt" | "unavailable";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const FRAGMENTS: FragmentId[] = ["tide", "lantern", "rain"];
const NPCS: NpcId[] = ["mirai", "devi", "ilyas"];
const DECISION_IDS: DecisionId[] = ["retain", "serve", "control"];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/** Validate an unknown value as a SaveData; returns null when invalid. */
export function validateSave(raw: unknown): SaveData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (s.version !== SAVE_VERSION) return null;
  if (
    !Array.isArray(s.fragments) ||
    !s.fragments.every((f) => FRAGMENTS.includes(f as FragmentId))
  )
    return null;
  if (
    !Array.isArray(s.talkedTo) ||
    !s.talkedTo.every((n) => NPCS.includes(n as NpcId))
  )
    return null;
  if (typeof s.puzzleSolved !== "boolean") return null;
  if (typeof s.decisions !== "object" || s.decisions === null) return null;
  const decisions: Decisions = {};
  for (const [k, v] of Object.entries(s.decisions)) {
    if (!DECISION_IDS.includes(k as DecisionId) || typeof v !== "boolean")
      return null;
    decisions[k as DecisionId] = v;
  }
  if (
    !Array.isArray(s.playerPos) ||
    s.playerPos.length !== 2 ||
    !isFiniteNumber(s.playerPos[0]) ||
    !isFiniteNumber(s.playerPos[1])
  )
    return null;
  const mode = s.mode === "story" ? "story" : "3d";
  if (!isFiniteNumber(s.savedAt)) return null;
  return {
    version: SAVE_VERSION,
    fragments: s.fragments as FragmentId[],
    talkedTo: s.talkedTo as NpcId[],
    puzzleSolved: s.puzzleSolved,
    decisions,
    playerPos: [s.playerPos[0], s.playerPos[1]],
    mode,
    savedAt: s.savedAt,
  };
}

export function loadSave(
  storage: StorageLike | undefined
): { status: LoadStatus; data: SaveData | null } {
  if (!storage) return { status: "unavailable", data: null };
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { status: "unavailable", data: null };
  }
  if (raw === null) return { status: "none", data: null };
  try {
    const data = validateSave(JSON.parse(raw));
    return data ? { status: "ok", data } : { status: "corrupt", data: null };
  } catch {
    return { status: "corrupt", data: null };
  }
}

export function writeSave(
  data: Omit<SaveData, "version" | "savedAt">,
  storage: StorageLike | undefined
): boolean {
  if (!storage) return false;
  const payload: SaveData = {
    ...data,
    version: SAVE_VERSION,
    savedAt: Date.now(),
  };
  try {
    storage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike | undefined): void {
  if (!storage) return;
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    /* unavailable storage: nothing to clear */
  }
}

/** Browser helper — safe on SSR and when storage is blocked. */
export function browserStorage(): StorageLike | undefined {
  try {
    if (typeof window === "undefined" || !window.localStorage) return undefined;
    const probe = "__echo_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return undefined;
  }
}
