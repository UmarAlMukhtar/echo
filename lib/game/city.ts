/* ------------------------------------------------------------------ *
 *  District geometry: walkable platforms, solid obstacles, decor data. *
 *                                                                    *
 *  Movement uses a floor-union model instead of wall colliders: a      *
 *  point is standable when inside a walkable rect (platforms, pedest-  *
 *  als, fixed causeways, energized tiles) and outside obstacle boxes.  *
 *  Edges therefore block automatically — no falling, no walls needed.  *
 * ------------------------------------------------------------------ */

import {
  JOINT_DEFS,
  Rect,
  energizedRects,
} from "./signal";
import type { JointRotations } from "./signal";

export type { Rect };

/** Rect where the player may stand. */
export interface FloorRect extends Rect {
  id: string;
  /** Visual tone key used by the scene. */
  tone: "ivory" | "peach" | "lilac" | "wood" | "slate";
}

/* ------------------------- Always-on floors ------------------------ */

export const BASE_FLOORS: FloorRect[] = [
  { id: "spawn", x0: -3, z0: 9.5, x1: 3, z1: 15.5, tone: "peach" },
  { id: "csouth", x0: -1.6, z0: 4, x1: 1.6, z1: 9.5, tone: "ivory" },
  { id: "plaza", x0: -5, z0: -4, x1: 5, z1: 4, tone: "ivory" },
  { id: "cnorth", x0: -1.6, z0: -9.5, x1: 1.6, z1: -4, tone: "ivory" },
  { id: "overlook", x0: -2.5, z0: -13, x1: 2.5, z1: -9.5, tone: "peach" },
  // stage 1 — garden (Mirai)
  { id: "ped-j1", x0: -8.2, z0: -2.6, x1: -5, z1: -0.4, tone: "slate" },
  { id: "garden", x0: -14.5, z0: -4, x1: -11, z1: 1, tone: "peach" },
  // stage 2 — dock (Devi)
  { id: "ped-j2a", x0: -7.8, z0: 3, x1: -5, z1: 5.4, tone: "slate" },
  { id: "ped-j2b", x0: -7.8, z0: 6.4, x1: -5.4, z1: 8.4, tone: "slate" },
  { id: "dock", x0: -14.5, z0: 5.5, x1: -11.4, z1: 9.5, tone: "wood" },
  // stage 3 — archive (Ilyas)
  { id: "ped-j3a", x0: 5, z0: -2, x1: 7.8, z1: 0.4, tone: "slate" },
  { id: "ped-j3b", x0: 5.4, z0: -5.4, x1: 7.4, z1: -3.4, tone: "slate" },
  { id: "ped-j3c", x0: 5.4, z0: -8.4, x1: 7.4, z1: -6.4, tone: "slate" },
  { id: "archive", x0: 10.4, z0: -9.5, x1: 15, z1: -5.5, tone: "peach" },
];

// Floors share edges, so no margin — the player can stand right at a seam.
// Solid obstacles apply their own radius margin in isWalkable.
function inside(r: Rect, x: number, z: number, m: number): boolean {
  return x >= r.x0 + m && x <= r.x1 - m && z >= r.z0 + m && z <= r.z1 - m;
}

/* ------------------------------ Obstacles -------------------------- */

/** Solid boxes carved out of the floor union (relay plinth, emitters, joints). */
export const OBSTACLES: Rect[] = [
  // relay spire plinth at plaza center
  { x0: -1.7, z0: -1.7, x1: 1.7, z1: 1.7 },
  // signal emitters at each stage source
  { x0: -5.45, z0: -1.95, x1: -4.55, z1: -1.05 },
  { x0: -5.45, z0: 3.95, x1: -4.55, z1: 4.85 },
  { x0: 4.55, z0: -1.25, x1: 5.45, z1: -0.35 },
  // joint columns (stand around them, not inside)
  ...JOINT_DEFS.map((j) => ({
    x0: j.pos[0] - 0.42,
    z0: j.pos[1] - 0.42,
    x1: j.pos[0] + 0.42,
    z1: j.pos[1] + 0.42,
  })),
  // overlook beacon
  { x0: -0.6, z0: -11.9, x1: 0.6, z1: -10.9 },
];

/* --------------------------- Movement ------------------------------ */

function allFloors(joints: JointRotations): FloorRect[] {
  const tiles = energizedRects(joints).map((r) => ({
    id: "tile",
    tone: "ivory" as const,
    ...r,
  }));
  return [...BASE_FLOORS, ...tiles];
}

/** True when (x,z) is on connected floor and not inside an obstacle. */
export function isWalkable(x: number, z: number, joints: JointRotations): boolean {
  const floors = allFloors(joints);
  const onFloor = floors.some((r) => inside(r, x, z, 0));
  if (!onFloor) return false;
  const m = 0.3;
  return !OBSTACLES.some(
    (o) => x > o.x0 - m && x < o.x1 + m && z > o.z0 - m && z < o.z1 + m
  );
}

/**
 * Move `pos` by (dx,dz), sliding along platform edges. Mutates pos.
 * Returns true when any movement was applied.
 */
export function slideMove(
  pos: { x: number; z: number },
  dx: number,
  dz: number,
  joints: JointRotations
): boolean {
  if (isWalkable(pos.x + dx, pos.z + dz, joints)) {
    pos.x += dx;
    pos.z += dz;
    return true;
  }
  let moved = false;
  if (dx !== 0 && isWalkable(pos.x + dx, pos.z, joints)) {
    pos.x += dx;
    moved = true;
  }
  if (dz !== 0 && isWalkable(pos.x, pos.z + dz, joints)) {
    pos.z += dz;
    moved = true;
  }
  return moved;
}

/**
 * True when (x,z) stands on floor connected (through walkable rects) to
 * the plaza. Detects a player stranded on an island when joints rotate.
 */
export function connectedToPlaza(
  x: number,
  z: number,
  joints: JointRotations
): boolean {
  const floors = allFloors(joints);
  const plaza = floors.findIndex((f) => f.id === "plaza");
  if (plaza < 0) return true;
  const myIdx = floors.findIndex((f) => inside(f, x, z, 0));
  if (myIdx < 0) return false;
  const parent = floors.map((_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  const union = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  const EPS = 0.25;
  for (let i = 0; i < floors.length; i++) {
    for (let j = i + 1; j < floors.length; j++) {
      const a = floors[i];
      const b = floors[j];
      const touching =
        a.x0 <= b.x1 + EPS && b.x0 <= a.x1 + EPS && a.z0 <= b.z1 + EPS && b.z0 <= a.z1 + EPS;
      if (touching) union(i, j);
    }
  }
  return find(myIdx) === find(plaza);
}

/** Fallback spot on the plaza when a player is stranded. */
export const PLAZA_SAFE: [number, number] = [-3.4, -1.5];

/* ------------------------------ Decor ------------------------------ */

/** Portal arches (pure decor): two columns + lintel, centered on (x,z). */
export const ARCHES: { x: number; z: number; w: number; h: number; axis: "x" | "z" }[] = [
  { x: 0, z: 6.7, w: 2.6, h: 3.4, axis: "z" }, // south causeway
  { x: 0, z: -6.7, w: 2.6, h: 3.4, axis: "z" }, // north causeway
  { x: -11.6, z: -1.5, w: 2.2, h: 3.2, axis: "x" }, // garden gate
  { x: 10.4, z: -7.4, w: 2.2, h: 3.2, axis: "x" }, // archive gate
];

/** Tall structures that can block the camera ray — used for clearance.
 *  Arches are open: only their columns + lintel slab block the view, so
 *  the elevated camera keeps its overview through the arch opening. */
export const CAMERA_TALL: (Rect & { h: number })[] = [
  { x0: -1.5, z0: -1.5, x1: 1.5, z1: 1.5, h: 13 }, // relay spire
  ...ARCHES.flatMap((a) => {
    const half = a.w / 2;
    const t = 0.35; // column half-width
    if (a.axis === "z") {
      // arch across a z-running causeway: columns offset in x
      return [
        { x0: a.x - half - t, z0: a.z - 0.4, x1: a.x - half + t, z1: a.z + 0.4, h: a.h },
        { x0: a.x + half - t, z0: a.z - 0.4, x1: a.x + half + t, z1: a.z + 0.4, h: a.h },
      ];
    }
    // arch across an x-running walkway: columns offset in z
    return [
      { x0: a.x - 0.4, z0: a.z - half - t, x1: a.x + 0.4, z1: a.z - half + t, h: a.h },
      { x0: a.x - 0.4, z0: a.z + half - t, x1: a.x + 0.4, z1: a.z + half + t, h: a.h },
    ];
  }),
];

/** Floating stair stacks receding into the void (decor). */
export const FLOATING_STEPS: { x: number; z: number; n: number; dir: 0 | 1 | 2 | 3 }[] = [
  { x: -9.8, z: 12.5, n: 5, dir: 3 },
  { x: 12.5, z: 3.5, n: 6, dir: 1 },
  { x: -16, z: -6, n: 4, dir: 0 },
  { x: 8.5, z: 12.5, n: 5, dir: 2 },
];

/** Distant skyline silhouettes — pale towers in the haze (decor). */
export const SKYLINE: { x: number; z: number; w: number; d: number; h: number }[] = [
  { x: -30, z: -14, w: 7, d: 7, h: 18 },
  { x: -36, z: 2, w: 9, d: 8, h: 26 },
  { x: -30, z: 20, w: 6, d: 6, h: 15 },
  { x: -16, z: 32, w: 8, d: 7, h: 22 },
  { x: -2, z: 36, w: 7, d: 7, h: 17 },
  { x: 12, z: 34, w: 8, d: 8, h: 24 },
  { x: 26, z: 30, w: 7, d: 7, h: 20 },
  { x: 34, z: 16, w: 8, d: 8, h: 28 },
  { x: 34, z: 0, w: 7, d: 7, h: 18 },
  { x: 32, z: -14, w: 8, d: 8, h: 24 },
  { x: 24, z: -30, w: 7, d: 7, h: 16 },
  { x: 8, z: -34, w: 8, d: 8, h: 21 },
  { x: -10, z: -32, w: 7, d: 7, h: 18 },
  { x: -26, z: -28, w: 8, d: 8, h: 23 },
];

/** Ghost echoes (revealed by the "retain" decision) floating on pale slabs. */
export const GHOST_QUARTER: { x: number; z: number; w: number; d: number; h: number }[] = [
  { x: -8, z: 10.5, w: 2.6, d: 2.6, h: 3.4 },
  { x: -10.5, z: 12.5, w: 2, d: 2.2, h: 2.6 },
  { x: 8.5, z: 8.5, w: 2.8, d: 2.4, h: 3.8 },
  { x: 11.5, z: 6, w: 2, d: 2, h: 2.4 },
  { x: -13, z: -8, w: 2.4, d: 2.4, h: 3 },
  { x: 7.5, z: -11.5, w: 2.6, d: 2.6, h: 3.2 },
];

export const GHOST_FIGURES: { x: number; z: number }[] = [
  { x: -8.6, z: 10.2 },
  { x: 9.2, z: 8.1 },
  { x: -13.4, z: -7.4 },
  { x: 8.1, z: -11 },
];

/** Lamp posts on platforms (lit by the "serve → living quarter" choice). */
export const LAMP_POSTS: { x: number; z: number }[] = [
  { x: -3.6, z: 3.2 },
  { x: 3.6, z: 3.2 },
  { x: -3.6, z: -3.2 },
  { x: 3.6, z: -3.2 },
  { x: -12.2, z: 0.2 },
  { x: -12.6, z: 8.4 },
  { x: 13, z: -8.4 },
  { x: 2, z: 13.4 },
  { x: -2, z: 13.4 },
  { x: 0, z: -11.8 },
];

/** Cables: relay crown → emitters/platform corners (catenary decor). */
export const CABLES: [number, number, number, number, number, number][] = [
  [0, 11.8, 0, -5, 2.2, -1.5],
  [0, 11.8, 0, -5, 2.2, 4.4],
  [0, 11.8, 0, 5, 2.2, -0.8],
  [0, 11.8, 0, -12.6, 4.4, -1.5],
  [0, 11.8, 0, -12.8, 4.4, 7.5],
  [0, 11.8, 0, 12.4, 5.4, -7.2],
  [0, 11.8, 0, 0, 5.6, -11.2],
];
