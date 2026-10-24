import colliders from "./district-colliders.json";
import { JOINT_DEFS, STAGES, computeAllBeams } from "./signal";
import type { JointRotations, Rect, StageId } from "./signal";
export type { Rect };

export const BRIDGES = [
  { name: "PUZZLE_BRIDGE_01_GARDEN", stage: "stage1" as StageId },
  { name: "PUZZLE_BRIDGE_02_DOCK", stage: "stage2" as StageId },
  { name: "PUZZLE_BRIDGE_03_ARCHIVE", stage: "stage3" as StageId },
];

// One pose controls both the model parent and its collision proxies.
export function bridgeOffset(name: string, joints: JointRotations): number {
  const bridge = BRIDGES.find((b) => b.name === name);
  return bridge && computeAllBeams(joints)[bridge.stage].reached ? 0 : -3;
}

const floors = colliders.colliders.filter((c) => c.plane);
const solids = colliders.colliders.filter((c) => !c.plane);
function inside(r: Rect, x: number, z: number, margin = 0): boolean {
  return (
    x >= r.x0 - margin &&
    x <= r.x1 + margin &&
    z >= r.z0 - margin &&
    z <= r.z1 + margin
  );
}

/** Height of an exported slab or smooth stair wedge; null means void. */
export function floorHeight(
  x: number,
  z: number,
  joints: JointRotations,
): number | null {
  let height: number | null = null;
  for (const f of floors) {
    if (f.bridge && bridgeOffset(f.bridge, joints) !== 0) continue;
    if (!inside(f, x, z, 0.001)) continue;
    const [a, b, c] = f.plane!;
    height = Math.max(height ?? -Infinity, a * x + b * z + c);
  }
  return height;
}

const puzzleSolids: Rect[] = [
  ...JOINT_DEFS.map((j) => ({
    x0: j.pos[0] - 0.38,
    x1: j.pos[0] + 0.38,
    z0: j.pos[1] - 0.38,
    z1: j.pos[1] + 0.38,
  })),
  ...STAGES.map((s) => ({
    x0: s.source.pos[0] - 0.26,
    x1: s.source.pos[0] + 0.26,
    z0: s.source.pos[1] - 0.26,
    z1: s.source.pos[1] + 0.26,
  })),
];

export function isWalkable(
  x: number,
  z: number,
  joints: JointRotations,
): boolean {
  const y = floorHeight(x, z, joints);
  if (y === null || !Number.isFinite(x + z)) return false;
  if (puzzleSolids.some((o) => inside(o, x, z, 0.3))) return false;
  return !solids.some((o) => {
    const offset = o.bridge ? bridgeOffset(o.bridge, joints) : 0;
    return (
      o.y1 + offset > y + 0.06 &&
      o.y0 + offset < y + 1.67 &&
      inside(o, x, z, 0.3)
    );
  });
}

/** Small steps prevent tunnelling through rails, props and closed bridge gaps. */
export function slideMove(
  pos: { x: number; z: number },
  dx: number,
  dz: number,
  joints: JointRotations,
): boolean {
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.08));
  if (!Number.isFinite(steps)) return false;
  let moved = false;
  for (let i = 0; i < steps; i++) {
    const x = dx / steps,
      z = dz / steps;
    if (isWalkable(pos.x + x, pos.z + z, joints)) {
      pos.x += x;
      pos.z += z;
      moved = true;
    } else {
      if (x !== 0 && isWalkable(pos.x + x, pos.z, joints)) {
        pos.x += x;
        moved = true;
      }
      if (z !== 0 && isWalkable(pos.x, pos.z + z, joints)) {
        pos.z += z;
        moved = true;
      }
    }
  }
  return moved;
}

/** Approved map has one bridge per platform; disconnected islands reset safely. */
export function connectedToPlaza(
  x: number,
  z: number,
  joints: JointRotations,
): boolean {
  if (floorHeight(x, z, joints) === null) return false;
  const beams = computeAllBeams(joints);
  if (x < -8.001) return beams.stage1.reached;
  if (x > 6.001) return beams.stage2.reached;
  if (z < -8.001) return beams.stage3.reached;
  return true;
}
export const PLAZA_SAFE: [number, number] = [-3.4, 2.8];

// Collider-derived camera blockers include the imported towers and archive posts.
export const CAMERA_TALL = solids
  .filter((o) => o.y1 > 2)
  .map((o) => ({ ...o, h: o.y1 }));

/** Ghost echoes (revealed by the "retain" decision) floating on pale slabs. */
export const GHOST_QUARTER: {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
}[] = [
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
export const LAMP_POSTS = [
  { x: -4, z: 3.7 },
  { x: 4, z: 3.7 },
  { x: 11, z: 3 },
  { x: -13, z: 2.2 },
  { x: 1.9, z: -10 },
];
