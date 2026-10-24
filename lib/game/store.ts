"use client";

import { create } from "zustand";
import {
  DECISION_ORDER,
  NPCS,
  OBJECTIVES,
  computeEnding,
} from "./story";
import {
  browserStorage,
  clearSave,
  loadSave,
  writeSave,
} from "./save";
import type {
  DecisionId,
  Decisions,
  EndingId,
  FragmentId,
  GameMode,
  GamePhase,
  InteractableSpec,
  NpcId,
  Overlay,
} from "./types";
import {
  LOCK_INTERACTABLE,
  NPC_INTERACTABLES,
  OVERLOOK_INTERACTABLE,
  RELAY_INTERACTABLE,
  SPAWN,
  VAULT_INTERACTABLE,
} from "./story";

export interface GameState {
  phase: GamePhase;
  overlay: Overlay | null;
  mode: GameMode;
  reducedMotion: boolean;
  fragments: FragmentId[];
  talkedTo: NpcId[];
  puzzleSolved: boolean;
  decisions: Decisions;
  ending: EndingId | null;
  reachedEnding: boolean;
  objective: string;
  hasSave: boolean;
  saveStatus: "ok" | "none" | "corrupt" | "unavailable" | null;
  lastNotice: string | null;
  nearby: InteractableSpec | null;
  repeatVisit: boolean;

  /* actions */
  newGame: (mode: GameMode) => void;
  continueGame: () => void;
  openDialogue: (npcId: NpcId) => void;
  closeDialogue: () => void;
  openPuzzle: () => void;
  puzzleSolvedNow: () => void;
  closeReveal: () => void;
  openDecision: (id: DecisionId) => void;
  applyDecision: (id: DecisionId, flag: boolean) => void;
  openEnding: () => void;
  dismissEnding: () => void;
  pause: () => void;
  resume: () => void;
  toTitle: () => void;
  resetToTitle: () => void;
  setReducedMotion: (v: boolean) => void;
  setNotice: (msg: string | null) => void;
  refreshSaveStatus: () => void;
  setMode: (mode: GameMode) => void;
  setNearby: (spec: InteractableSpec | null) => void;
  interact: (spec: InteractableSpec) => void;
}

/** Mutable player position — kept outside reactive state (updated per frame). */
export const playerRuntime = {
  pos: { x: SPAWN[0], z: SPAWN[1] },
};

function currentObjective(s: {
  fragments: FragmentId[];
  puzzleSolved: boolean;
  decisions: Decisions;
  reachedEnding: boolean;
}): string {
  if (s.reachedEnding) return OBJECTIVES.wander;
  if (s.fragments.length < 3) return OBJECTIVES.meetResidents;
  if (!s.puzzleSolved) return OBJECTIVES.attuneRelay;
  if (s.decisions.retain === undefined) return OBJECTIVES.decideRetain;
  if (s.decisions.serve === undefined) return OBJECTIVES.decideServe;
  if (s.decisions.control === undefined) return OBJECTIVES.decideControl;
  return OBJECTIVES.toOverlook;
}

function persist(state: GameState): boolean {
  return writeSave(
    {
      fragments: state.fragments,
      talkedTo: state.talkedTo,
      puzzleSolved: state.puzzleSolved,
      decisions: state.decisions,
      playerPos: [playerRuntime.pos.x, playerRuntime.pos.z],
      mode: state.mode,
    },
    browserStorage()
  );
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "title",
  overlay: null,
  mode: "3d",
  reducedMotion: false,
  fragments: [],
  talkedTo: [],
  puzzleSolved: false,
  decisions: {},
  ending: null,
  reachedEnding: false,
  objective: OBJECTIVES.meetResidents,
  hasSave: false,
  saveStatus: null,
  lastNotice: null,
  nearby: null,
  repeatVisit: false,

  newGame: (mode) => {
    clearSave(browserStorage());
    playerRuntime.pos = { x: SPAWN[0], z: SPAWN[1] };
    set({
      phase: "playing",
      overlay: { kind: "intro" },
      mode,
      fragments: [],
      talkedTo: [],
      puzzleSolved: false,
      decisions: {},
      ending: null,
      reachedEnding: false,
      objective: OBJECTIVES.meetResidents,
      hasSave: false,
      lastNotice: null,
      nearby: null,
      repeatVisit: false,
    });
  },

  continueGame: () => {
    const { status, data } = loadSave(browserStorage());
    if (status !== "ok" || !data) {
      set({ saveStatus: status });
      return;
    }
    playerRuntime.pos = { x: data.playerPos[0], z: data.playerPos[1] };
    const partial = {
      fragments: data.fragments,
      talkedTo: data.talkedTo,
      puzzleSolved: data.puzzleSolved,
      decisions: data.decisions,
      ending: computeEnding(data.decisions) ?? null,
      reachedEnding: false,
    };
    set({
      phase: "playing",
      overlay: null,
      mode: data.mode,
      ...partial,
      objective: currentObjective(partial),
      hasSave: true,
      saveStatus: "ok",
      lastNotice: "Progress restored.",
    });
  },

  openDialogue: (npcId) => {
    const s = get();
    const already = s.talkedTo.includes(npcId);
    const fragments = already
      ? s.fragments
      : [...s.fragments, NPCS[npcId].fragment];
    const talkedTo = already ? s.talkedTo : [...s.talkedTo, npcId];
    set({
      overlay: { kind: "dialogue", npcId },
      fragments,
      talkedTo,
      repeatVisit: already,
      objective: currentObjective({ ...s, fragments }),
    });
    if (!already) persist(get());
  },

  closeDialogue: () => set({ overlay: null }),

  openPuzzle: () => {
    const s = get();
    if (s.fragments.length >= 3 && !s.puzzleSolved)
      set({ overlay: { kind: "puzzle" } });
  },

  puzzleSolvedNow: () => {
    const s = get();
    set({
      puzzleSolved: true,
      overlay: { kind: "reveal" },
      objective: currentObjective({ ...s, puzzleSolved: true }),
    });
    persist(get());
  },

  closeReveal: () => {
    set({ overlay: { kind: "decision", id: "retain" } });
  },

  openDecision: (id) => {
    const s = get();
    const order = DECISION_ORDER;
    const idx = order.indexOf(id);
    if (idx < 0) return;
    // Each decision unlocks only when the previous one is made.
    if (idx > 0 && s.decisions[order[idx - 1]] === undefined) return;
    if (id === "retain" && !s.puzzleSolved) return;
    set({ overlay: { kind: "decision", id } });
  },

  applyDecision: (id, flag) => {
    const s = get();
    const decisions = { ...s.decisions, [id]: flag };
    const ending = computeEnding(decisions);
    set({
      decisions,
      ending,
      overlay: null,
      objective: currentObjective({ ...s, decisions }),
    });
    persist(get());
  },

  openEnding: () => {
    const s = get();
    if (s.ending) {
      set({
        overlay: { kind: "ending" },
        phase: "ended",
        reachedEnding: true,
        objective: OBJECTIVES.wander,
      });
      persist(get());
    }
  },

  dismissEnding: () => set({ overlay: null, phase: "playing" }),

  pause: () => {
    const s = get();
    if (s.phase === "playing" && s.overlay === null)
      set({ overlay: { kind: "pause" } });
  },

  resume: () => set({ overlay: null }),

  toTitle: () => {
    set({ phase: "title", overlay: null, lastNotice: null });
  },

  resetToTitle: () => {
    clearSave(browserStorage());
    playerRuntime.pos = { x: SPAWN[0], z: SPAWN[1] };
    set({
      phase: "title",
      overlay: null,
      fragments: [],
      talkedTo: [],
      puzzleSolved: false,
      decisions: {},
      ending: null,
      reachedEnding: false,
      objective: OBJECTIVES.meetResidents,
      hasSave: false,
      lastNotice: null,
      nearby: null,
      repeatVisit: false,
    });
  },

  setReducedMotion: (v) => set({ reducedMotion: v }),
  setNotice: (msg) => set({ lastNotice: msg }),

  refreshSaveStatus: () => {
    const { status } = loadSave(browserStorage());
    set({
      saveStatus: status,
      hasSave: status === "ok",
    });
  },

  setMode: (mode) => set({ mode }),

  setNearby: (spec) => {
    if (get().nearby?.id !== spec?.id) set({ nearby: spec });
  },

  interact: (spec) => {
    const s = get();
    switch (spec.kind) {
      case "npc":
        s.openDialogue(spec.id.replace("npc-", "") as NpcId);
        break;
      case "relay":
        if (s.puzzleSolved && s.decisions.retain === undefined)
          s.openDecision("retain");
        else s.openPuzzle();
        break;
      case "lock":
        s.openDecision("serve");
        break;
      case "vault":
        s.openDecision("control");
        break;
      case "overlook":
        s.openEnding();
        break;
    }
  },
}));

/** Interactables currently active given game progress (drives HUD prompts). */
export function activeInteractables(s: {
  fragments: FragmentId[];
  puzzleSolved: boolean;
  decisions: Decisions;
  ending: EndingId | null;
}): InteractableSpec[] {
  const list: InteractableSpec[] = Object.values(NPC_INTERACTABLES);
  if (s.fragments.length >= 3 && !s.puzzleSolved) list.push(RELAY_INTERACTABLE);
  if (s.puzzleSolved && s.decisions.retain === undefined)
    list.push(RELAY_INTERACTABLE);
  if (s.decisions.retain !== undefined && s.decisions.serve === undefined)
    list.push(LOCK_INTERACTABLE);
  if (s.decisions.serve !== undefined && s.decisions.control === undefined)
    list.push(VAULT_INTERACTABLE);
  if (s.decisions.control !== undefined) list.push(OVERLOOK_INTERACTABLE);
  return list;
}
