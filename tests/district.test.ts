import { describe, expect, it } from "vitest";
import { connectedToPlaza, isWalkable, slideMove } from "../lib/game/city";
import * as city from "../lib/game/city";
import { initialJoints } from "../lib/game/signal";
const solved = () => ({
  ...initialJoints(),
  j1: 1,
  j2a: 2,
  j2b: 0,
  j3a: 3,
  j3b: 2,
  j3c: 1,
});

describe("Blender district navigation", () => {
  it("walks the actual plaza and samples raised ramp/landing heights", () => {
    const height = (
      city as unknown as {
        floorHeight?: (
          x: number,
          z: number,
          j: ReturnType<typeof initialJoints>,
        ) => number | null;
      }
    ).floorHeight;
    expect(height, "controller needs the exported floor heights").toBeTypeOf(
      "function",
    );
    expect(height!(0, 3, solved())).toBeCloseTo(0);
    expect(height!(-7, 0, solved())).toBeCloseTo(0.3);
    expect(height!(-12.9, 0.8, solved())).toBeCloseTo(0.6);
    expect(height!(0, -6.5, solved())).toBeCloseTo(0.75);
    expect(height!(0, -11.5, solved())).toBeCloseTo(1.5);
  });
  it("gates all three named bridge decks with their completed signals", () => {
    for (const [x, z] of [
      [-9, 0],
      [7.5, 1],
      [0, -8.8],
    ]) {
      expect(isWalkable(x, z, initialJoints())).toBe(false);
      expect(isWalkable(x, z, solved())).toBe(true);
    }
  });
  it("connects each resident to the plaza only through its bridge", () => {
    for (const [x, z] of [
      [-12.9, 0.8],
      [12, 1],
      [0, -11.5],
    ]) {
      expect(connectedToPlaza(x, z, initialJoints())).toBe(false);
      expect(connectedToPlaza(x, z, solved())).toBe(true);
    }
  });
  it("uses exported obstacles and keeps a clear center corridor on stairs/bridges", () => {
    expect(isWalkable(-15.05, -0.1, solved())).toBe(false); // garden bench
    expect(isWalkable(2.2, -12.1, solved())).toBe(false); // archive shelf
    for (let x = -12; x <= -6; x += 0.1)
      expect(isWalkable(x, 0, solved())).toBe(true);
    for (let x = 5; x <= 12; x += 0.1)
      expect(isWalkable(x, 1, solved())).toBe(true);
    for (let z = -11.5; z <= -4.5; z += 0.1)
      expect(isWalkable(0.4, z, solved())).toBe(true);
  });
  it("cannot tunnel through an unpowered gap or relay even with a large movement", () => {
    const p = { x: -7.8, z: 0 };
    slideMove(p, -4.2, 0, initialJoints());
    expect(p.x).toBeGreaterThan(-8.1);
    const q = { x: 0, z: 2 };
    slideMove(q, 0, -4, solved());
    expect(q.z).toBeGreaterThan(1);
  });
});

import { loadSave, SAVE_KEY, validateSave } from "../lib/game/save";
it("migrates v2 story progress and solved dock rotations without reusing old coordinates", () => {
  const old = {
    version: 2,
    fragments: ["tide", "lantern", "rain"],
    talkedTo: ["mirai", "devi", "ilyas"],
    joints: { j1: 1, j2a: 1, j2b: 3, j3a: 3, j3b: 2, j3c: 1 },
    decisions: { retain: true, serve: false, control: true },
    reachedEnding: true,
    playerPos: [12.2, -7.2],
    mode: "story",
    savedAt: 100,
  };
  const storage = {
    getItem: (key: string) =>
      key === "echo-save-v2" ? JSON.stringify(old) : null,
    setItem: () => {},
    removeItem: () => {},
  };
  const result = loadSave(storage);
  expect(result.status).toBe("ok");
  expect(result.data?.version).toBe(3);
  expect(result.data?.joints).toEqual(solved());
  expect(result.data?.decisions).toEqual(old.decisions);
  expect(result.data?.reachedEnding).toBe(true);
  expect(result.data?.playerPos).toEqual([0, 3.8]);
  expect(SAVE_KEY).toBe("echo-save-v3");
});
it("keeps a v3 raised-platform save at its actual location", () => {
  const data = validateSave({
    version: 3,
    fragments: [],
    talkedTo: [],
    joints: solved(),
    decisions: {},
    playerPos: [0, -11.5],
    mode: "3d",
    savedAt: 100,
  });
  expect(data?.playerPos).toEqual([0, -11.5]);
});

import { playerRuntime, useGameStore } from "../lib/game/store";
it("resets a stage once with honest feedback and rescues a stranded keeper", () => {
  useGameStore.getState().newGame("3d");
  useGameStore.setState({ joints: solved(), overlay: null });
  playerRuntime.pos = { x: -12.9, z: 0.8 };
  const reset = (
    useGameStore.getState() as unknown as {
      resetStage?: (id: "stage1") => void;
    }
  ).resetStage;
  expect(reset).toBeTypeOf("function");
  reset!("stage1");
  expect(useGameStore.getState().joints.j1).toBe(0);
  expect(playerRuntime.pos).toEqual({ x: -3.4, z: 2.8 });
  expect(useGameStore.getState().lastNotice).toMatch(/reset.*plaza/i);
});
