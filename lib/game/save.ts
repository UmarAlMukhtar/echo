import type { DecisionId, Decisions, FragmentId, NpcId } from "./types";
import { DECISION_OWNER, SPAWN } from "./story";
import { PLAZA_SAFE, connectedToPlaza, isWalkable } from "./city";
import { JOINT_IDS, initialJoints } from "./signal";
import type { JointId, JointRotations } from "./signal";

export const SAVE_KEY = "echo-save-v3";
export const SAVE_VERSION = 3;
/** Keys written by older builds — detected and reported as outdated. */
export const LEGACY_SAVE_KEYS = ["echo-save-v1"];

export interface SaveData {
  version: number;
  fragments: FragmentId[];
  talkedTo: NpcId[];
  joints: JointRotations;
  decisions: Decisions;
  /** Set once an ending has been viewed — survives reloads. */
  reachedEnding: boolean;
  playerPos: [number, number];
  mode: "3d" | "story";
  savedAt: number;
}

export type LoadStatus = "ok" | "none" | "corrupt" | "outdated" | "unavailable";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const FRAGMENTS: FragmentId[] = ["tide", "lantern", "rain"];
const NPC_KEYS: NpcId[] = ["mirai", "devi", "ilyas"];
const DECISION_IDS: DecisionId[] = ["retain", "serve", "control"];

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

const FRAGMENT_OWNER: Record<FragmentId, NpcId> = {
  tide: "mirai",
  lantern: "devi",
  rain: "ilyas",
};

function validateJoints(raw: unknown): JointRotations | null {
  const joints = initialJoints();
  if (typeof raw !== "object" || raw === null) return null;
  for (const [k, v] of Object.entries(raw)) {
    if (!JOINT_IDS.includes(k as JointId)) return null;
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 3)
      return null;
    joints[k as JointId] = v;
  }
  return joints;
}

/**
 * Normalize a saved position onto walkable floor connected to the plaza —
 * a point inside a solid obstacle can connect but can never be walked out
 * of, so both conditions are required.
 */
function normalizePosition(
  x: number,
  z: number,
  joints: JointRotations,
): [number, number] {
  const usable = (px: number, pz: number) =>
    isWalkable(px, pz, joints) && connectedToPlaza(px, pz, joints);
  if (usable(x, z)) return [x, z];
  const [sx, sz] = PLAZA_SAFE;
  if (usable(sx, sz)) return [sx, sz];
  return [...SPAWN];
}

/** Validate an unknown value as a SaveData; returns null when invalid. */
export function validateSave(raw: unknown): SaveData | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (s.version !== SAVE_VERSION && s.version !== 2) return null;
  if (
    !Array.isArray(s.fragments) ||
    !s.fragments.every((f) => FRAGMENTS.includes(f as FragmentId)) ||
    new Set(s.fragments).size !== s.fragments.length
  )
    return null;
  if (
    !Array.isArray(s.talkedTo) ||
    !s.talkedTo.every((n) => NPC_KEYS.includes(n as NpcId)) ||
    new Set(s.talkedTo).size !== s.talkedTo.length
  )
    return null;
  const fragments = s.fragments as FragmentId[];
  const talkedTo = s.talkedTo as NpcId[];
  // A fragment can only come from its owner's dialogue.
  for (const f of fragments) {
    if (!talkedTo.includes(FRAGMENT_OWNER[f])) return null;
  }
  const joints = validateJoints(s.joints);
  if (!joints) return null;
  // v2 used the old west-facing dock; preserve turn progress on its east-facing replacement.
  if (s.version === 2) {
    const old = s.joints as Partial<JointRotations>;
    joints.j2a = ((old.j2a ?? 0) + 1) % 4;
    joints.j2b = ((old.j2b ?? 0) + 1) % 4;
  }
  if (typeof s.decisions !== "object" || s.decisions === null) return null;
  const decisions: Decisions = {};
  for (const [k, v] of Object.entries(s.decisions)) {
    if (!DECISION_IDS.includes(k as DecisionId) || typeof v !== "boolean")
      return null;
    decisions[k as DecisionId] = v;
  }
  // Decisions are ordered and each needs its resident's conversation.
  for (const id of DECISION_IDS) {
    if (decisions[id] !== undefined && !talkedTo.includes(DECISION_OWNER[id]))
      return null;
  }
  if (decisions.serve !== undefined && decisions.retain === undefined)
    return null;
  if (decisions.control !== undefined && decisions.serve === undefined)
    return null;
  // reachedEnding: absent defaults false (older v2 saves); a present value
  // must be boolean, and true only with all three decisions made.
  if (s.reachedEnding !== undefined && typeof s.reachedEnding !== "boolean")
    return null;
  if (
    s.reachedEnding === true &&
    DECISION_IDS.some((id) => decisions[id] === undefined)
  )
    return null;
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
    fragments,
    talkedTo,
    joints,
    decisions,
    reachedEnding: s.reachedEnding === true,
    playerPos:
      s.version === 2
        ? [...SPAWN]
        : normalizePosition(s.playerPos[0], s.playerPos[1], joints),
    mode,
    savedAt: s.savedAt,
  };
}

export function loadSave(storage: StorageLike | undefined): {
  status: LoadStatus;
  data: SaveData | null;
} {
  if (!storage) return { status: "unavailable", data: null };
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY) ?? storage.getItem("echo-save-v2");
  } catch {
    return { status: "unavailable", data: null };
  }
  if (raw === null) {
    // Honest handling for saves from older, incompatible builds.
    for (const key of LEGACY_SAVE_KEYS) {
      try {
        if (storage.getItem(key) !== null) {
          storage.removeItem(key);
          return { status: "outdated", data: null };
        }
      } catch {
        return { status: "unavailable", data: null };
      }
    }
    return { status: "none", data: null };
  }
  try {
    const data = validateSave(JSON.parse(raw));
    return data ? { status: "ok", data } : { status: "corrupt", data: null };
  } catch {
    return { status: "corrupt", data: null };
  }
}

export function writeSave(
  data: Omit<SaveData, "version" | "savedAt" | "reachedEnding"> & {
    reachedEnding?: boolean;
  },
  storage: StorageLike | undefined,
): boolean {
  if (!storage) return false;
  const payload: SaveData = {
    ...data,
    reachedEnding: data.reachedEnding ?? false,
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
    storage.removeItem("echo-save-v2");
    for (const key of LEGACY_SAVE_KEYS) storage.removeItem(key);
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
