import { describe, expect, it, beforeEach } from "vitest";
import {
  STAGES,
  computeAllBeams,
  computeStage,
  initialJoints,
  jointEdges,
  jointReachable,
} from "../lib/game/signal";
import type { JointRotations } from "../lib/game/signal";
import {
  connectedToPlaza,
  isWalkable,
  slideMove,
} from "../lib/game/city";
import { computeEnding, NPC_INTERACTABLES, SPAWN } from "../lib/game/story";
import {
  SAVE_KEY,
  loadSave,
  validateSave,
  writeSave,
} from "../lib/game/save";
import type { StorageLike } from "../lib/game/save";
import { activeInteractables, playerRuntime, useGameStore } from "../lib/game/store";

function memStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
  };
}

const rotate = (j: JointRotations, id: keyof JointRotations, n = 1) => {
  const next = { ...j };
  next[id] = (next[id] + n) % 4;
  return next;
};

/* --------------------------- signal propagation --------------------- */

describe("signal routing", () => {
  it("connects each edge type at the right rotations", () => {
    expect(jointEdges("straight", 0).sort()).toEqual([0, 2]);
    expect(jointEdges("straight", 1).sort()).toEqual([1, 3]);
    expect(jointEdges("elbow", 0).sort()).toEqual([0, 1]);
    expect(jointEdges("elbow", 2).sort()).toEqual([2, 3]);
  });

  it("starts with every stage's beam blocked", () => {
    const beams = computeAllBeams(initialJoints());
    expect(beams.stage1.reached).toBe(false);
    expect(beams.stage2.reached).toBe(false);
    expect(beams.stage3.reached).toBe(false);
    // but each beam at least reaches its first joint
    expect(beams.stage1.edges).toContain("src>j1");
    expect(beams.stage2.edges).toContain("src>j2a");
    expect(beams.stage3.edges).toContain("src>j3a");
  });

  it("stage 1 teaches the operation: one turn carries the signal", () => {
    let j = initialJoints();
    j = rotate(j, "j1");
    const res = computeStage(STAGES[0], j);
    expect(res.reached).toBe(true);
    expect(res.edges).toEqual(["src>j1", "j1>target"]);
  });

  it("stage 1 is reversible: rotating back breaks the connection", () => {
    let j = rotate(initialJoints(), "j1");
    j = rotate(j, "j1");
    expect(computeStage(STAGES[0], j).reached).toBe(false);
  });

  it("stage 2 needs both elbows and energizes the middle segment first", () => {
    let j = initialJoints();
    j = rotate(j, "j2a"); // turns south, beam reaches j2b
    let res = computeStage(STAGES[1], j);
    expect(res.reached).toBe(false);
    expect(res.edges).toEqual(["src>j2a", "j2a>j2b"]);
    expect(jointReachable("j2b", j)).toBe(true);
    j = rotate(j, "j2b", 3); // elbow to west
    res = computeStage(STAGES[1], j);
    expect(res.reached).toBe(true);
    expect(res.edges).toContain("j2b>target");
  });

  it("stage 2 blocks an unreachable downstream joint", () => {
    expect(jointReachable("j2b", initialJoints())).toBe(false);
    expect(jointReachable("j2a", initialJoints())).toBe(true);
  });

  it("stage 3 combines straight + two elbows", () => {
    let j = initialJoints();
    j = rotate(j, "j3a", 3); // elbow W->N
    j = rotate(j, "j3b", 1); // straight N-S
    j = rotate(j, "j3c", 3); // elbow S->E
    const res = computeStage(STAGES[2], j);
    expect(res.reached).toBe(true);
    expect(res.edges).toEqual([
      "src>j3a",
      "j3a>j3b",
      "j3b>j3c",
      "j3c>target",
    ]);
  });

  it("stage 3 dies when any single joint is wrong", () => {
    let j = initialJoints();
    j = rotate(j, "j3a", 3);
    j = rotate(j, "j3b", 1);
    // j3c stays misaligned — the beam reaches it and dies
    const res = computeStage(STAGES[2], j);
    expect(res.reached).toBe(false);
    expect(res.lastNode).toBe("j3c");
  });
});

/* ------------------------------ walkable ---------------------------- */

describe("walkable floors", () => {
  it("plaza and fixed causeways are always walkable", () => {
    const j = initialJoints();
    expect(isWalkable(0, 11.5, j)).toBe(true); // spawn
    expect(isWalkable(0, 6, j)).toBe(true); // south causeway
    expect(isWalkable(-4, 0, j)).toBe(true); // plaza
  });

  it("the void and solid structures are not walkable", () => {
    const j = initialJoints();
    expect(isWalkable(-20, -10, j)).toBe(false); // void
    expect(isWalkable(0, 0, j)).toBe(false); // relay plinth
  });

  it("causeway tiles only stand once their beam segment is energized", () => {
    const j0 = initialJoints();
    expect(isWalkable(-9.6, -1.5, j0)).toBe(false); // garden gap tile
    const j1 = rotate(j0, "j1");
    expect(isWalkable(-9.6, -1.5, j1)).toBe(true);
  });

  it("slideMove blocks crossing an unpowered gap but slides along edges", () => {
    const j = initialJoints();
    const p = { x: -7, z: -1.5 }; // on j1 pedestal
    slideMove(p, -2.5, 0, j); // toward the unpowered tile
    expect(p.x).toBeGreaterThan(-8.4); // blocked at pedestal edge
  });

  it("garden platform is reachable only once stage 1 is aligned", () => {
    expect(connectedToPlaza(-12.6, -1.5, initialJoints())).toBe(false);
    const j = rotate(initialJoints(), "j1");
    expect(connectedToPlaza(-12.6, -1.5, j)).toBe(true);
  });
});

/* ------------------------------- endings ---------------------------- */

describe("computeEnding — all 8 decision combinations", () => {
  const cases: [boolean, boolean, boolean, string][] = [
    [true, true, true, "remembers"],
    [true, true, false, "watcher"],
    [true, false, true, "watcher"],
    [true, false, false, "watcher"],
    [false, true, true, "watcher"],
    [false, true, false, "watcher"],
    [false, false, true, "watcher"],
    [false, false, false, "quiet"],
  ];
  it.each(cases)("retain=%s serve=%s control=%s -> %s", (r, s, c, exp) => {
    expect(
      computeEnding({ retain: r, serve: s, control: c })
    ).toBe(exp);
  });
  it("returns null until all three are decided", () => {
    expect(computeEnding({})).toBeNull();
    expect(computeEnding({ retain: true, serve: false })).toBeNull();
  });
});

/* -------------------------------- saves ------------------------------ */

const goodSave = () => ({
  version: 2,
  fragments: ["tide"],
  talkedTo: ["mirai"],
  joints: initialJoints(),
  decisions: {},
  playerPos: [0, 11.5],
  mode: "3d",
  savedAt: Date.now(),
});

describe("save validation (v2)", () => {
  it("accepts a well-formed save", () => {
    expect(validateSave(goodSave())?.fragments).toEqual(["tide"]);
  });

  it("rejects wrong version and non-object saves", () => {
    expect(validateSave({ ...goodSave(), version: 1 })).toBeNull();
    expect(validateSave("nope")).toBeNull();
    expect(validateSave(null)).toBeNull();
  });

  it("rejects unknown or duplicate fragments", () => {
    expect(validateSave({ ...goodSave(), fragments: ["ember"] })).toBeNull();
    expect(
      validateSave({ ...goodSave(), fragments: ["tide", "tide"] })
    ).toBeNull();
  });

  it("rejects fragments whose owner was never met", () => {
    expect(
      validateSave({ ...goodSave(), fragments: ["lantern"], talkedTo: ["mirai"] })
    ).toBeNull();
  });

  it("rejects duplicate NPCs", () => {
    expect(
      validateSave({ ...goodSave(), talkedTo: ["mirai", "mirai"] })
    ).toBeNull();
  });

  it("rejects malformed joint rotations", () => {
    expect(
      validateSave({ ...goodSave(), joints: { j1: 9 } })
    ).toBeNull();
    expect(
      validateSave({ ...goodSave(), joints: { j1: "x" } })
    ).toBeNull();
    expect(validateSave({ ...goodSave(), joints: 4 })).toBeNull();
  });

  it("rejects decisions without their resident's conversation", () => {
    const s = {
      ...goodSave(),
      talkedTo: [],
      fragments: [],
      decisions: { retain: true },
    };
    expect(validateSave(s)).toBeNull();
  });

  it("rejects out-of-order decisions", () => {
    const s = {
      ...goodSave(),
      talkedTo: ["mirai", "devi", "ilyas"],
      fragments: ["tide", "lantern", "rain"],
      decisions: { serve: true },
    };
    expect(validateSave(s)).toBeNull();
  });

  it("accepts a complete endgame save", () => {
    const s = {
      ...goodSave(),
      talkedTo: ["mirai", "devi", "ilyas"],
      fragments: ["tide", "lantern", "rain"],
      joints: { ...initialJoints(), j1: 1, j2a: 1, j2b: 3, j3a: 2, j3b: 2, j3c: 0 },
      decisions: { retain: true, serve: false, control: true },
      playerPos: [0, -11.4],
    };
    expect(validateSave(s)).not.toBeNull();
  });

  it("normalizes a saved position that no longer connects to the plaza", () => {
    const s = {
      ...goodSave(),
      playerPos: [-12.6, -1.5], // garden — unreachable while stage 1 unaligned
    };
    const v = validateSave(s);
    expect(v).not.toBeNull();
    expect(connectedToPlaza(v!.playerPos[0], v!.playerPos[1], v!.joints)).toBe(
      true
    );
  });

  it("round-trips through storage", () => {
    const st = memStorage();
    writeSave(
      {
        fragments: ["tide"],
        talkedTo: ["mirai"],
        joints: initialJoints(),
        decisions: {},
        playerPos: [0, 11.5],
        mode: "3d",
      },
      st
    );
    const { status, data } = loadSave(st);
    expect(status).toBe("ok");
    expect(data?.talkedTo).toEqual(["mirai"]);
  });

  it("reports none when empty and corrupt for bad JSON", () => {
    const st = memStorage();
    expect(loadSave(st).status).toBe("none");
    st.data[SAVE_KEY] = "{not json";
    expect(loadSave(st).status).toBe("corrupt");
  });

  it("honestly flags saves from an older build as outdated", () => {
    const st = memStorage();
    st.data["echo-save-v1"] = JSON.stringify({ version: 1 });
    expect(loadSave(st).status).toBe("outdated");
    // legacy key cleared so it doesn't re-report
    expect(st.data["echo-save-v1"]).toBeUndefined();
  });

  it("handles storage being unavailable", () => {
    expect(loadSave(undefined).status).toBe("unavailable");
    expect(writeSave(goodSave() as never, undefined)).toBe(false);
  });
});

/* ------------------------------ store flow -------------------------- */

describe("game store", () => {
  beforeEach(() => {
    useGameStore.getState().resetToTitle();
    playerRuntime.pos = { x: SPAWN[0], z: SPAWN[1] };
  });

  it("newGame starts on the intro with a clean state", () => {
    useGameStore.getState().newGame("3d");
    const s = useGameStore.getState();
    expect(s.phase).toBe("playing");
    expect(s.overlay).toEqual({ kind: "intro" });
    expect(s.fragments).toEqual([]);
  });

  it("rotateJoint turns a joint and connects stage 1", () => {
    useGameStore.getState().newGame("3d");
    useGameStore.getState().rotateJoint("j1");
    const s = useGameStore.getState();
    expect(s.joints.j1).toBe(1);
    expect(computeAllBeams(s.joints).stage1.reached).toBe(true);
    expect(s.lastNotice).toContain("garden platform");
  });

  it("interact dispatches joint rotation", () => {
    useGameStore.getState().newGame("3d");
    useGameStore.getState().interact({
      id: "j1",
      kind: "joint",
      position: [-6.6, -1.5],
      radius: 2.5,
      label: "Relay joint",
      prompt: "Turn the relay joint",
    });
    expect(useGameStore.getState().joints.j1).toBe(1);
  });

  it("a stranded player is relocated to the plaza", () => {
    useGameStore.getState().newGame("3d");
    useGameStore.getState().rotateJoint("j1");
    playerRuntime.pos = { x: -12.6, z: -1.5 }; // standing on the garden platform
    useGameStore.getState().rotateJoint("j1"); // break the connection
    expect(connectedToPlaza(playerRuntime.pos.x, playerRuntime.pos.z, useGameStore.getState().joints)).toBe(true);
    expect(useGameStore.getState().lastNotice).toContain("causeway folds");
  });

  it("dialogue grants a fragment once and chains into its decision", () => {
    useGameStore.getState().newGame("3d");
    useGameStore.getState().rotateJoint("j1");
    useGameStore.getState().openDialogue("mirai");
    expect(useGameStore.getState().fragments).toEqual(["tide"]);
    useGameStore.getState().closeDialogue();
    expect(useGameStore.getState().overlay).toEqual({
      kind: "decision",
      id: "retain",
    });
    useGameStore.getState().applyDecision("retain", true);
    const s = useGameStore.getState();
    expect(s.decisions.retain).toBe(true);
    // consequence stays visible until Continue
    expect(s.overlay).toEqual({ kind: "decision", id: "retain" });
    useGameStore.getState().closeDecision();
    expect(useGameStore.getState().overlay).toBeNull();
  });

  it("keeps the consequence panel until Continue, then chains pending decisions", () => {
    useGameStore.getState().newGame("3d");
    useGameStore.getState().resume();
    // devi heard early — her decision becomes pending behind mirai's
    useGameStore.getState().openDialogue("devi");
    useGameStore.getState().closeDialogue();
    useGameStore.getState().openDialogue("mirai");
    useGameStore.getState().closeDialogue();
    expect(useGameStore.getState().overlay).toEqual({
      kind: "decision",
      id: "retain",
    });
    useGameStore.getState().applyDecision("retain", true);
    // the panel must NOT vanish or swap instantly — consequence is shown
    expect(useGameStore.getState().overlay).toEqual({
      kind: "decision",
      id: "retain",
    });
    // Continue chains into devi's pending decision
    useGameStore.getState().closeDecision();
    expect(useGameStore.getState().overlay).toEqual({
      kind: "decision",
      id: "serve",
    });
  });

  it("an out-of-order resident waits for the pending decision", () => {
    useGameStore.getState().newGame("3d");
    // talk to devi before mirai — her decision can't open before retain
    useGameStore.getState().openDialogue("devi");
    useGameStore.getState().closeDialogue();
    expect(useGameStore.getState().overlay).toBeNull();
    expect(useGameStore.getState().decisions.serve).toBeUndefined();
    // once mirai's decision is made and confirmed, devi's chains
    useGameStore.getState().openDialogue("mirai");
    useGameStore.getState().closeDialogue();
    useGameStore.getState().applyDecision("retain", false);
    useGameStore.getState().closeDecision();
    expect(useGameStore.getState().overlay).toEqual({
      kind: "decision",
      id: "serve",
    });
  });

  it("the reveal precedes the final decision", () => {
    useGameStore.getState().newGame("3d");
    for (const n of ["mirai", "devi", "ilyas"] as const)
      useGameStore.getState().openDialogue(n);
    useGameStore.getState().closeDialogue();
    useGameStore.getState().applyDecision("retain", true);
    useGameStore.getState().closeDecision();
    useGameStore.getState().applyDecision("serve", true);
    useGameStore.getState().closeDecision();
    expect(useGameStore.getState().overlay).toEqual({ kind: "reveal" });
    useGameStore.getState().closeReveal();
    expect(useGameStore.getState().overlay).toEqual({
      kind: "decision",
      id: "control",
    });
    useGameStore.getState().applyDecision("control", true);
    expect(useGameStore.getState().ending).toBe("remembers");
    useGameStore.getState().closeDecision();
    expect(useGameStore.getState().overlay).toBeNull();
  });

  it("the overlook is only interactable after all three decisions", () => {
    useGameStore.getState().newGame("3d");
    const s = useGameStore.getState();
    expect(activeInteractables(s).map((i) => i.id)).not.toContain("overlook");
    expect(s.openEnding()).toBeUndefined();
    expect(useGameStore.getState().overlay).toEqual({ kind: "intro" });
  });

  it("full progression reaches an ending", () => {
    useGameStore.getState().newGame("3d");
    useGameStore.getState().resume(); // dismiss intro
    useGameStore.getState().rotateJoint("j1");
    useGameStore.getState().openDialogue("mirai");
    useGameStore.getState().closeDialogue();
    useGameStore.getState().applyDecision("retain", true);
    useGameStore.getState().closeDecision();
    useGameStore.getState().rotateJoint("j2a");
    useGameStore.getState().rotateJoint("j2b");
    useGameStore.getState().rotateJoint("j2b");
    useGameStore.getState().rotateJoint("j2b");
    expect(computeAllBeams(useGameStore.getState().joints).stage2.reached).toBe(
      true
    );
    useGameStore.getState().openDialogue("devi");
    useGameStore.getState().closeDialogue();
    useGameStore.getState().applyDecision("serve", false);
    useGameStore.getState().closeDecision();
    useGameStore.getState().rotateJoint("j3a");
    useGameStore.getState().rotateJoint("j3a");
    useGameStore.getState().rotateJoint("j3a");
    useGameStore.getState().rotateJoint("j3b");
    useGameStore.getState().rotateJoint("j3c");
    useGameStore.getState().rotateJoint("j3c");
    useGameStore.getState().rotateJoint("j3c");
    expect(computeAllBeams(useGameStore.getState().joints).stage3.reached).toBe(
      true
    );
    useGameStore.getState().openDialogue("ilyas");
    useGameStore.getState().closeDialogue(); // -> reveal
    useGameStore.getState().closeReveal(); // -> control
    useGameStore.getState().applyDecision("control", false);
    useGameStore.getState().closeDecision();
    const s = useGameStore.getState();
    expect(s.ending).toBe("watcher");
    expect(s.objective).toContain("overlook");
    useGameStore.getState().openEnding();
    expect(useGameStore.getState().overlay).toEqual({ kind: "ending" });
    expect(useGameStore.getState().reachedEnding).toBe(true);
    useGameStore.getState().dismissEnding();
    expect(useGameStore.getState().phase).toBe("playing");
  });

  it("velocity-blocked state halts movement input via pause overlay", () => {
    useGameStore.getState().newGame("3d");
    useGameStore.getState().resume();
    useGameStore.getState().pause();
    expect(useGameStore.getState().overlay).toEqual({ kind: "pause" });
    useGameStore.getState().resume();
    expect(useGameStore.getState().overlay).toBeNull();
  });

  it("resetToTitle clears progress", () => {
    useGameStore.getState().newGame("3d");
    useGameStore.getState().rotateJoint("j1");
    useGameStore.getState().resetToTitle();
    const s = useGameStore.getState();
    expect(s.phase).toBe("title");
    expect(s.joints).toEqual(initialJoints());
  });

  it("NPC interactables sit on their own platforms", () => {
    for (const it of Object.values(NPC_INTERACTABLES)) {
      expect(it.kind).toBe("npc");
    }
    expect(NPC_INTERACTABLES.mirai.position[0]).toBeLessThan(-11);
    expect(NPC_INTERACTABLES.ilyas.position[0]).toBeGreaterThan(10);
  });
});
