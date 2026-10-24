"use client";

import { create } from "zustand";
import {
  DECISION_ORDER,
  DECISION_OWNER,
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
import {
  PLAZA_SAFE,
  connectedToPlaza,
} from "./city";
import {
  computeAllBeams,
  initialJoints,
  jointReachable,
} from "./signal";
import type { JointId, JointRotations, StageId } from "./signal";
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
  JOINT_INTERACTABLES,
  NPC_INTERACTABLES,
  OVERLOOK_INTERACTABLE,
  SPAWN,
} from "./story";

export interface GameState {
  phase: GamePhase;
  overlay: Overlay | null;
  mode: GameMode;
  reducedMotion: boolean;
  fragments: FragmentId[];
  talkedTo: NpcId[];
  joints: JointRotations;
  decisions: Decisions;
  ending: EndingId | null;
  reachedEnding: boolean;
  objective: string;
  hasSave: boolean;
  saveStatus: "ok" | "none" | "corrupt" | "outdated" | "unavailable" | null;
  lastNotice: string | null;
  nearby: InteractableSpec | null;
  repeatVisit: boolean;

  /* actions */
  newGame: (mode: GameMode) => void;
  continueGame: () => void;
  openDialogue: (npcId: NpcId) => void;
  closeDialogue: () => void;
  rotateJoint: (id: JointId) => void;
  closeReveal: () => void;
  openDecision: (id: DecisionId) => void;
  applyDecision: (id: DecisionId, flag: boolean) => void;
  closeDecision: () => void;
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

interface ProgressSnapshot {
  fragments: FragmentId[];
  talkedTo: NpcId[];
  joints: JointRotations;
  decisions: Decisions;
  reachedEnding: boolean;
}

function currentObjective(s: ProgressSnapshot): string {
  const beams = computeAllBeams(s.joints);
  if (s.reachedEnding) return OBJECTIVES.wander;
  if (!beams.stage1.reached) return OBJECTIVES.alignGarden;
  if (!s.talkedTo.includes("mirai")) return OBJECTIVES.talkMirai;
  if (s.decisions.retain === undefined) return OBJECTIVES.decideRetain;
  if (!beams.stage2.reached) return OBJECTIVES.alignDock;
  if (!s.talkedTo.includes("devi")) return OBJECTIVES.talkDevi;
  if (s.decisions.serve === undefined) return OBJECTIVES.decideServe;
  if (!beams.stage3.reached) return OBJECTIVES.alignArchive;
  if (!s.talkedTo.includes("ilyas")) return OBJECTIVES.talkIlyas;
  if (s.decisions.control === undefined) return OBJECTIVES.decideControl;
  return OBJECTIVES.toOverlook;
}

/**
 * The next decision in fixed order, when its resident has been heard.
 * Weaves decisions through progression after puzzle stages — and chains
 * instantly if the resident was already talked to out of order.
 */
function pendingDecision(s: {
  decisions: Decisions;
  talkedTo: NpcId[];
}): DecisionId | null {
  const idx = DECISION_ORDER.findIndex((d) => s.decisions[d] === undefined);
  if (idx < 0) return null;
  const id = DECISION_ORDER[idx];
  return s.talkedTo.includes(DECISION_OWNER[id]) ? id : null;
}

function overlayForDecision(id: DecisionId): Overlay {
  // The final decision is preceded by the relay's reveal.
  return id === "control" ? { kind: "reveal" } : { kind: "decision", id };
}

function persist(state: GameState): void {
  const storage = browserStorage();
  const wrote = writeSave(
    {
      fragments: state.fragments,
      talkedTo: state.talkedTo,
      joints: state.joints,
      decisions: state.decisions,
      reachedEnding: state.reachedEnding,
      playerPos: [playerRuntime.pos.x, playerRuntime.pos.z],
      mode: state.mode,
    },
    storage
  );
  // Reflect what actually landed in storage — a fresh run's first
  // milestone must turn on Continue and the title's overwrite guard.
  const { status } = loadSave(storage);
  useGameStore.setState({
    hasSave: status === "ok",
    saveStatus: status,
    // A failed write to present-but-broken storage must surface as
    // feedback — an older readable save still keeps Continue via
    // hasSave, but must not masquerade as a successful persist of this
    // milestone. (No storage at all is already covered by the startup
    // banner, so it doesn't spam every milestone.)
    ...(storage && !wrote
      ? {
          lastNotice:
            "Couldn't save progress — browser storage is unavailable.",
        }
      : {}),
  });
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: "title",
  overlay: null,
  mode: "3d",
  reducedMotion: false,
  fragments: [],
  talkedTo: [],
  joints: initialJoints(),
  decisions: {},
  ending: null,
  reachedEnding: false,
  objective: OBJECTIVES.alignGarden,
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
      joints: initialJoints(),
      decisions: {},
      ending: null,
      reachedEnding: false,
      objective: OBJECTIVES.alignGarden,
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
      joints: data.joints,
      decisions: data.decisions,
      ending: computeEnding(data.decisions) ?? null,
      reachedEnding: data.reachedEnding,
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
    const next = { ...s, fragments, talkedTo };
    set({
      overlay: { kind: "dialogue", npcId },
      fragments,
      talkedTo,
      repeatVisit: already,
      objective: currentObjective(next),
    });
    if (!already) persist(get());
  },

  closeDialogue: () => {
    const s = get();
    const pending = pendingDecision(s);
    set({ overlay: pending ? overlayForDecision(pending) : null });
  },

  rotateJoint: (id) => {
    const s = get();
    const before = computeAllBeams(s.joints);
    const joints: JointRotations = { ...s.joints, [id]: (s.joints[id] + 1) % 4 };
    const after = computeAllBeams(joints);

    // If the rotation strands the player on a disconnected island, the
    // plaza catches them — reversible states, no softlocks.
    const p = playerRuntime.pos;
    let stranded = false;
    if (!connectedToPlaza(p.x, p.z, joints)) {
      p.x = PLAZA_SAFE[0];
      p.z = PLAZA_SAFE[1];
      stranded = true;
    }

    const newlyReached = (["stage1", "stage2", "stage3"] as StageId[]).filter(
      (sid) => !before[sid].reached && after[sid].reached
    );
    let notice = s.lastNotice;
    if (stranded) notice = "The causeway folds — the plaza catches you.";
    else if (newlyReached.length > 0) {
      notice = newlyReached
        .map((sid) => `The signal reaches the ${stageName(sid)}.`)
        .join(" ");
    }

    const next = { ...s, joints };
    set({ joints, objective: currentObjective(next), lastNotice: notice });
    persist(get());
  },

  closeReveal: () => {
    set({ overlay: { kind: "decision", id: "control" } });
  },

  openDecision: (id) => {
    const s = get();
    const idx = DECISION_ORDER.indexOf(id);
    if (idx < 0) return;
    // Each decision unlocks only when the previous one is made and its
    // resident has been heard.
    if (idx > 0 && s.decisions[DECISION_ORDER[idx - 1]] === undefined) return;
    if (!s.talkedTo.includes(DECISION_OWNER[id])) return;
    set({ overlay: { kind: "decision", id } });
  },

  applyDecision: (id, flag) => {
    const s = get();
    const decisions = { ...s.decisions, [id]: flag };
    const ending = computeEnding(decisions);
    const next = { ...s, decisions };
    // Keep the decision panel up — its consequence text stays visible
    // until Continue, and closeDecision() then chains pending ones.
    set({
      decisions,
      ending,
      objective: currentObjective(next),
    });
    persist(get());
  },

  closeDecision: () => {
    const s = get();
    // Chain into the pending decision whose resident was already heard
    // (e.g. when stages were finished out of order), else close.
    const pending = pendingDecision(s);
    set({ overlay: pending ? overlayForDecision(pending) : null });
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
      joints: initialJoints(),
      decisions: {},
      ending: null,
      reachedEnding: false,
      objective: OBJECTIVES.alignGarden,
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
      case "joint":
        s.rotateJoint(spec.id as JointId);
        break;
      case "overlook":
        s.openEnding();
        break;
    }
  },
}));

function stageName(id: StageId): string {
  return id === "stage1"
    ? "garden platform"
    : id === "stage2"
      ? "dock platform"
      : "archive platform";
}

/** Interactables currently active given game progress (drives HUD prompts). */
export function activeInteractables(s: {
  joints: JointRotations;
  decisions: Decisions;
  ending: EndingId | null;
}): InteractableSpec[] {
  const list: InteractableSpec[] = [
    ...Object.values(NPC_INTERACTABLES),
    // Match guided mode's gating: a joint only prompts when its pedestal
    // is actually powered/reachable (reset still turns any joint directly).
    ...JOINT_INTERACTABLES.filter((it) =>
      jointReachable(it.id as JointId, s.joints)
    ),
  ];
  if (s.decisions.control !== undefined) list.push(OVERLOOK_INTERACTABLE);
  return list;
}
