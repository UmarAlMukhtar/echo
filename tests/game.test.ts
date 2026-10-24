import { describe, expect, it, beforeEach } from "vitest";
import {
  STAGES,
  computeAllBeams,
  computeStage,
  initialJoints,
  jointEdges,
  jointReachable,
  stageGuide,
} from "../lib/game/signal";
import type { JointRotations } from "../lib/game/signal";
import {
  connectedToPlaza,
  isWalkable,
  slideMove,
} from "../lib/game/city";
import {
  computeEnding,
  NPC_INTERACTABLES,
  NPCS,
  OBJECTIVES,
  pickDialogueLines,
  SPAWN,
} from "../lib/game/story";
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

  it("stageGuide names the route, joint edges and stop point at start", () => {
    const g = stageGuide(STAGES[1], initialJoints());
    expect(g.route).toContain("dock platform");
    expect(g.reached).toBe(false);
    // j2a at rot 0 joins north+east; the beam arrives from the east so it
    // passes through but exits north, dying in open air — the guide must
    // name that stop point, not just "partway and dies".
    expect(g.joints.find((x) => x.id === "j2a")!.current).toContain("north");
    expect(g.stopsAt.length).toBeGreaterThan(10);
    expect(g.hint).toMatch(/turn j2a/);
  });

  it("stageGuide reports aligned once the stage is solved", () => {
    let j = initialJoints();
    j = rotate(j, "j1");
    const g = stageGuide(STAGES[0], j);
    expect(g.reached).toBe(true);
    expect(g.hint).toMatch(/Aligned/);
    expect(g.joints[0].aligned).toBe(true);
    expect(g.stopsAt).toBe("the signal reaches the platform");
  });

  it("stageGuide names the exact failing joint in stage 3", () => {
    // Solve j3a only: the beam turns south, hits straight j3b (init rot 1 =
    // east-west) and dies there — the stop point must say j3b.
    let j = initialJoints();
    j = rotate(j, "j3a", 3);
    const g = stageGuide(STAGES[2], j);
    expect(g.reached).toBe(false);
    expect(g.stopsAt).toContain("j3b");
    expect(g.hint).toMatch(/turn j3b/);
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

  it("rejects a saved point inside a solid obstacle", () => {
    const s = { ...goodSave(), playerPos: [0, 0] }; // relay plinth
    const v = validateSave(s);
    expect(v).not.toBeNull();
    expect(isWalkable(v!.playerPos[0], v!.playerPos[1], v!.joints)).toBe(true);
    expect(connectedToPlaza(v!.playerPos[0], v!.playerPos[1], v!.joints)).toBe(
      true
    );
  });

  it("rejects non-boolean or premature reachedEnding", () => {
    expect(
      validateSave({ ...goodSave(), reachedEnding: "yes" })
    ).toBeNull();
    // true without all three decisions — impossible progress
    expect(
      validateSave({ ...goodSave(), reachedEnding: true })
    ).toBeNull();
    expect(
      validateSave({
        ...goodSave(),
        talkedTo: ["mirai", "devi", "ilyas"],
        fragments: ["tide", "lantern", "rain"],
        decisions: { retain: true, serve: false, control: true },
        reachedEnding: true,
      })
    ).not.toBeNull();
  });

  it("defaults reachedEnding to false and round-trips it when set", () => {
    expect(validateSave(goodSave())?.reachedEnding).toBe(false);
    const st = memStorage();
    writeSave(
      {
        fragments: ["tide", "lantern", "rain"],
        talkedTo: ["mirai", "devi", "ilyas"],
        joints: initialJoints(),
        decisions: { retain: true, serve: true, control: true },
        reachedEnding: true,
        playerPos: [0, 11.5],
        mode: "3d",
      },
      st
    );
    expect(loadSave(st).data?.reachedEnding).toBe(true);
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

  it("a fresh run's first milestone enables Continue + overwrite guard", () => {
    const w =
      (globalThis as { window?: { localStorage?: unknown } }).window ??
      ((globalThis as { window?: object }).window = {});
    w.localStorage = memStorage();
    useGameStore.getState().newGame("3d");
    expect(useGameStore.getState().hasSave).toBe(false);
    useGameStore.getState().resume();
    useGameStore.getState().rotateJoint("j1"); // first persisted milestone
    expect(useGameStore.getState().hasSave).toBe(true);
    expect(useGameStore.getState().saveStatus).toBe("ok");
    useGameStore.getState().toTitle(); // pause -> quit keeps the flag
    expect(useGameStore.getState().hasSave).toBe(true);
  });

  it("joint prompts are gated by beam reachability like guided mode", () => {
    const s = useGameStore.getState();
    const ids = activeInteractables(s)
      .filter((i) => i.kind === "joint")
      .map((i) => i.id);
    // stage-entry joints prompt; downstream joints do not until powered
    expect(ids).toEqual(["j1", "j2a", "j3a"]);
    expect(ids).not.toContain("j2b");
    // powering j2a's exit opens the prompt on j2b
    const powered = { ...s, joints: { ...s.joints, j2a: 1 } };
    expect(
      activeInteractables(powered)
        .filter((i) => i.kind === "joint")
        .map((i) => i.id)
    ).toContain("j2b");
    // but rotateJoint itself stays ungated so guided/pause reset works
    useGameStore.getState().newGame("3d");
    useGameStore.getState().rotateJoint("j3c");
    expect(useGameStore.getState().joints.j3c).toBe(3); // init 2 + 1
  });

  it("Continue after an ending keeps 'walk the city you made'", () => {
    const w =
      (globalThis as { window?: { localStorage?: unknown } }).window ??
      ((globalThis as { window?: object }).window = {});
    w.localStorage = memStorage();
    writeSave(
      {
        fragments: ["tide", "lantern", "rain"],
        talkedTo: ["mirai", "devi", "ilyas"],
        joints: initialJoints(),
        decisions: { retain: true, serve: true, control: true },
        reachedEnding: true,
        playerPos: [0, 11.5],
        mode: "3d",
      },
      w.localStorage as ReturnType<typeof memStorage>
    );
    useGameStore.getState().continueGame();
    const s = useGameStore.getState();
    expect(s.reachedEnding).toBe(true);
    expect(s.objective).toBe(OBJECTIVES.wander);
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

/* ------------------------- dialogue selection ------------------------ */

describe("dialogue line selection", () => {
  it("first meetings always give testimony — even with the beam aligned", () => {
    // Ilyas's stage must be aligned to reach him; his first visit must
    // still hand over the rain fragment, not skip to afterRelay.
    expect(pickDialogueLines(NPCS.ilyas, false, false)).toBe(
      NPCS.ilyas.firstMeeting
    );
    expect(pickDialogueLines(NPCS.ilyas, false, true)).toBe(
      NPCS.ilyas.firstMeeting
    );
  });

  it("repeat visits use 'again' until the reveal, then 'afterRelay'", () => {
    expect(pickDialogueLines(NPCS.ilyas, true, false)).toBe(NPCS.ilyas.again);
    expect(pickDialogueLines(NPCS.ilyas, true, true)).toBe(
      NPCS.ilyas.afterRelay
    );
  });
});
