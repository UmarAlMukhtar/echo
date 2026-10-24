import { beforeEach, describe, expect, it } from "vitest";
import {
  checkSolution,
  cyclePhase,
  initialSelections,
} from "@/lib/game/puzzle";
import { CORRECT_PHASES, FRAGMENTS, computeEnding } from "@/lib/game/story";
import {
  SAVE_KEY,
  loadSave,
  validateSave,
  writeSave,
  type StorageLike,
} from "@/lib/game/save";
import { activeInteractables, useGameStore } from "@/lib/game/store";
import type { Decisions } from "@/lib/game/types";

function memStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

function phaseIndex(fragmentId: string, phaseId: string): number {
  const f = FRAGMENTS.find((f) => f.id === fragmentId)!;
  return f.phases.findIndex((p) => p.id === phaseId);
}

/* ------------------------------ Puzzle ------------------------------ */

describe("relay puzzle", () => {
  it("starts unsolved", () => {
    expect(checkSolution(initialSelections()).solved).toBe(false);
  });

  it("solves only when all three dials match the clues", () => {
    let sel = initialSelections();
    // set each dial to its correct index
    for (const f of FRAGMENTS) {
      const idx = phaseIndex(f.id, CORRECT_PHASES[f.id]);
      sel = { ...sel, [f.id]: idx };
    }
    expect(checkSolution(sel).solved).toBe(true);
    expect(checkSolution(sel).correct).toHaveLength(3);
  });

  it("reports which fragments are aligned", () => {
    const sel = { ...initialSelections(), tide: phaseIndex("tide", "rising") };
    const c = checkSolution(sel);
    expect(c.solved).toBe(false);
    expect(c.correct).toEqual(["tide"]);
  });

  it("cycles phases and wraps around", () => {
    let sel = initialSelections();
    const count = FRAGMENTS.find((f) => f.id === "tide")!.phases.length;
    for (let i = 0; i < count; i++) sel = cyclePhase(sel, "tide");
    expect(sel.tide).toBe(0);
  });
});

/* ------------------------- Ending rule ------------------------------ */

describe("ending rule", () => {
  const all: [Decisions, string][] = [
    [{ retain: true, serve: true, control: true }, "remembers"],
    [{ retain: false, serve: false, control: false }, "quiet"],
    [{ retain: true, serve: false, control: false }, "watcher"],
    [{ retain: false, serve: true, control: false }, "watcher"],
    [{ retain: false, serve: false, control: true }, "watcher"],
    [{ retain: true, serve: true, control: false }, "watcher"],
    [{ retain: false, serve: true, control: true }, "watcher"],
    [{ retain: true, serve: false, control: true }, "watcher"],
  ];
  it.each(all)("decisions %j → %s", (d, expected) => {
    expect(computeEnding(d)).toBe(expected);
  });

  it("returns null until all three decisions are made", () => {
    expect(computeEnding({})).toBeNull();
    expect(computeEnding({ retain: true })).toBeNull();
    expect(computeEnding({ retain: true, serve: false })).toBeNull();
  });
});

/* ------------------------- Save validation --------------------------- */

const goodSave = {
  version: 1,
  fragments: ["tide"],
  talkedTo: ["mirai"],
  puzzleSolved: false,
  decisions: {},
  playerPos: [1, 2],
  mode: "3d",
  savedAt: 123,
};

describe("save validation", () => {
  it("accepts a well-formed save", () => {
    expect(validateSave(goodSave)).not.toBeNull();
  });
  it("rejects wrong version", () => {
    expect(validateSave({ ...goodSave, version: 2 })).toBeNull();
  });
  it("rejects unknown fragments", () => {
    expect(validateSave({ ...goodSave, fragments: ["bogus"] })).toBeNull();
  });
  it("rejects malformed decisions", () => {
    expect(
      validateSave({ ...goodSave, decisions: { retain: "yes" } })
    ).toBeNull();
  });
  it("rejects non-object input", () => {
    expect(validateSave("junk")).toBeNull();
    expect(validateSave(null)).toBeNull();
  });
  it("rejects duplicate fragments", () => {
    expect(
      validateSave({ ...goodSave, fragments: ["tide", "tide"], talkedTo: ["mirai"] })
    ).toBeNull();
  });
  it("rejects duplicate NPC visits", () => {
    expect(
      validateSave({ ...goodSave, talkedTo: ["mirai", "mirai"] })
    ).toBeNull();
  });
  it("rejects a fragment whose owner was never met", () => {
    expect(
      validateSave({ ...goodSave, fragments: ["rain"], talkedTo: ["mirai"] })
    ).toBeNull();
  });
  it("rejects puzzleSolved before all fragments", () => {
    expect(
      validateSave({ ...goodSave, puzzleSolved: true, fragments: ["tide"] })
    ).toBeNull();
  });
  it("rejects decisions without a solved puzzle", () => {
    expect(
      validateSave({ ...goodSave, decisions: { retain: true } })
    ).toBeNull();
  });
  it("rejects out-of-order decisions", () => {
    const base = {
      ...goodSave,
      fragments: ["tide", "lantern", "rain"],
      talkedTo: ["mirai", "devi", "ilyas"],
      puzzleSolved: true,
    };
    expect(validateSave({ ...base, decisions: { serve: true } })).toBeNull();
    expect(
      validateSave({ ...base, decisions: { retain: true, control: true } })
    ).toBeNull();
  });
  it("accepts a valid endgame save", () => {
    const endSave = {
      ...goodSave,
      fragments: ["tide", "lantern", "rain"],
      talkedTo: ["mirai", "devi", "ilyas"],
      puzzleSolved: true,
      decisions: { retain: true, serve: false, control: true },
    };
    expect(validateSave(endSave)).not.toBeNull();
  });
  it("normalizes out-of-bounds saved positions", () => {
    const data = validateSave({ ...goodSave, playerPos: [999, -999] });
    expect(data).not.toBeNull();
    expect(data!.playerPos[0]).toBeLessThanOrEqual(20);
    expect(data!.playerPos[1]).toBeGreaterThanOrEqual(-17);
  });
});

describe("save storage", () => {
  it("round-trips through storage", () => {
    const st = memStorage();
    writeSave(
      {
        fragments: ["tide"],
        talkedTo: ["mirai"],
        puzzleSolved: false,
        decisions: {},
        playerPos: [1, 2],
        mode: "3d",
      },
      st
    );
    const { status, data } = loadSave(st);
    expect(status).toBe("ok");
    expect(data?.fragments).toEqual(["tide"]);
  });
  it("reports corrupt JSON as corrupt", () => {
    const st = memStorage();
    st.setItem(SAVE_KEY, "{not json");
    expect(loadSave(st).status).toBe("corrupt");
  });
  it("reports missing save as none", () => {
    expect(loadSave(memStorage()).status).toBe("none");
  });
  it("reports absent storage as unavailable", () => {
    expect(loadSave(undefined).status).toBe("unavailable");
  });
});

/* ----------------------- Store transitions --------------------------- */

describe("game flow", () => {
  beforeEach(() => {
    useGameStore.getState().resetToTitle();
  });

  it("new game starts at intro with a fresh state", () => {
    useGameStore.getState().newGame("3d");
    const s = useGameStore.getState();
    expect(s.phase).toBe("playing");
    expect(s.overlay?.kind).toBe("intro");
    expect(s.fragments).toEqual([]);
  });

  it("dialogue grants each fragment once", () => {
    const g = useGameStore.getState();
    g.newGame("3d");
    g.resume();
    g.openDialogue("mirai");
    g.closeDialogue();
    g.openDialogue("devi");
    g.closeDialogue();
    g.openDialogue("mirai"); // repeat visit
    g.closeDialogue();
    const s = useGameStore.getState();
    expect(s.fragments.sort()).toEqual(["lantern", "tide"]);
    expect(s.talkedTo).toEqual(["mirai", "devi"]);
  });

  it("blocks the relay puzzle until all fragments are gathered", () => {
    const g = useGameStore.getState();
    g.newGame("3d");
    g.resume();
    g.openPuzzle();
    expect(useGameStore.getState().overlay).toBeNull();
    g.openDialogue("mirai");
    g.closeDialogue();
    g.openDialogue("devi");
    g.closeDialogue();
    g.openDialogue("ilyas");
    g.closeDialogue();
    g.openPuzzle();
    expect(useGameStore.getState().overlay?.kind).toBe("puzzle");
  });

  it("reveal flows into the first decision", () => {
    const g = useGameStore.getState();
    g.newGame("3d");
    g.resume();
    g.openDialogue("mirai");
    g.closeDialogue();
    g.openDialogue("devi");
    g.closeDialogue();
    g.openDialogue("ilyas");
    g.closeDialogue();
    g.openPuzzle();
    g.puzzleSolvedNow();
    expect(useGameStore.getState().overlay?.kind).toBe("reveal");
    g.closeReveal();
    expect(useGameStore.getState().overlay?.kind).toBe("decision");
  });

  it("enforces decision order and reaches endings", () => {
    const g = useGameStore.getState();
    g.newGame("3d");
    g.resume();
    for (const n of ["mirai", "devi", "ilyas"] as const) {
      g.openDialogue(n);
      g.closeDialogue();
    }
    g.puzzleSolvedNow();
    g.closeReveal();
    // 'serve' should be locked before 'retain'
    g.openDecision("serve");
    expect(useGameStore.getState().overlay?.kind).toBe("decision");
    expect(
      (useGameStore.getState().overlay as { kind: "decision"; id: string }).id
    ).toBe("retain");
    g.applyDecision("retain", true);
    g.openDecision("serve");
    g.applyDecision("serve", true);
    g.openDecision("control");
    g.applyDecision("control", true);
    const s = useGameStore.getState();
    expect(s.ending).toBe("remembers");
    expect(s.objective).toContain("overlook");
  });

  it("interact dispatch sends vault to the control decision", () => {
    const g = useGameStore.getState();
    g.newGame("3d");
    g.resume();
    for (const n of ["mirai", "devi", "ilyas"] as const) {
      g.openDialogue(n);
      g.closeDialogue();
    }
    g.puzzleSolvedNow();
    g.closeReveal();
    g.applyDecision("retain", false);
    g.applyDecision("serve", false);
    g.interact({
      id: "vault",
      kind: "vault",
      position: [14, 9],
      radius: 2,
      label: "Archive vault",
      prompt: "",
    });
    expect(useGameStore.getState().overlay).toEqual({
      kind: "decision",
      id: "control",
    });
  });

  it("gated interactables track progress", () => {
    const g = useGameStore.getState();
    g.newGame("3d");
    g.resume();
    let ids: string[] = activeInteractables(useGameStore.getState()).map(
      (i) => i.kind
    );
    expect(ids).toContain("npc");
    expect(ids).not.toContain("overlook");
    for (const n of ["mirai", "devi", "ilyas"] as const) {
      g.openDialogue(n);
      g.closeDialogue();
    }
    ids = activeInteractables(useGameStore.getState()).map((i) => i.id);
    expect(ids).toContain("relay");
    g.puzzleSolvedNow();
    g.applyDecision("retain", true);
    ids = activeInteractables(useGameStore.getState()).map((i) => i.id);
    expect(ids).toContain("lock");
    g.applyDecision("serve", true);
    ids = activeInteractables(useGameStore.getState()).map((i) => i.id);
    expect(ids).toContain("vault");
    g.applyDecision("control", true);
    ids = activeInteractables(useGameStore.getState()).map((i) => i.id);
    expect(ids).toContain("overlook");
  });

  it("reset returns a clean title state", () => {
    const g = useGameStore.getState();
    g.newGame("3d");
    g.resume();
    g.openDialogue("mirai");
    g.resetToTitle();
    const s = useGameStore.getState();
    expect(s.phase).toBe("title");
    expect(s.fragments).toEqual([]);
    expect(s.decisions).toEqual({});
  });
});
