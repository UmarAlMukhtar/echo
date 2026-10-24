/* Procedural city layout: building footprints, colliders, lamps, skyline. */

export interface BuildingSpec {
  id: string;
  x: number;
  z: number;
  w: number; // footprint width (x)
  d: number; // footprint depth (z)
  h: number;
  style: "limestone" | "concrete" | "mixed";
}

export interface Aabb {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/** Solid buildings in the district core. Keep the plaza + roads walkable. */
export const BUILDINGS: BuildingSpec[] = [
  // North row (behind overlook approach)
  { id: "n1", x: -8, z: 17.5, w: 6, d: 3, h: 7, style: "concrete" },
  { id: "n2", x: 0, z: 18.5, w: 4, d: 2, h: 9, style: "mixed" },
  { id: "n3", x: 8, z: 17.5, w: 6, d: 3, h: 6, style: "limestone" },
  // East row
  { id: "e1", x: 15.5, z: 12, w: 5, d: 6, h: 8, style: "limestone" },
  { id: "e2", x: 16, z: 4, w: 4, d: 5, h: 11, style: "concrete" },
  { id: "e3", x: 15.5, z: -4, w: 5, d: 6, h: 7, style: "mixed" },
  { id: "e4", x: 14, z: -11, w: 6, d: 5, h: 9, style: "concrete" },
  // South-east cluster
  { id: "se1", x: 8, z: -10.5, w: 5, d: 5, h: 5, style: "limestone" },
  { id: "se2", x: 3, z: -12, w: 4, d: 4, h: 8, style: "mixed" },
  // South-west cluster
  { id: "sw1", x: -6, z: -11.5, w: 5, d: 5, h: 6, style: "concrete" },
  { id: "sw2", x: -9.5, z: -7, w: 4, d: 4, h: 4.5, style: "limestone" },
  // West bank (between canal and plaza)
  { id: "w1", x: -9, z: 5, w: 4, d: 5, h: 7, style: "mixed" },
  { id: "w2", x: -8.5, z: 11, w: 5, d: 4, h: 6, style: "concrete" },
  // Inner mid-rise framing the plaza
  { id: "m1", x: -6.5, z: 4.5, w: 3.5, d: 4, h: 5, style: "limestone" },
  { id: "m2", x: 6.5, z: 10, w: 4, d: 4, h: 6.5, style: "mixed" },
  { id: "m3", x: 10.5, z: -7.5, w: 3, d: 3, h: 4, style: "limestone" },
];

/** Distant skyline silhouettes — visual only, no colliders. */
export const SKYLINE: { x: number; z: number; w: number; d: number; h: number }[] = [
  { x: -34, z: -8, w: 8, d: 8, h: 22 },
  { x: -38, z: 6, w: 10, d: 9, h: 30 },
  { x: -33, z: 22, w: 7, d: 7, h: 18 },
  { x: -18, z: 32, w: 9, d: 8, h: 26 },
  { x: -4, z: 34, w: 8, d: 8, h: 20 },
  { x: 10, z: 33, w: 9, d: 9, h: 28 },
  { x: 24, z: 30, w: 8, d: 8, h: 24 },
  { x: 33, z: 18, w: 9, d: 8, h: 32 },
  { x: 34, z: 2, w: 8, d: 8, h: 20 },
  { x: 33, z: -12, w: 9, d: 9, h: 26 },
  { x: 22, z: -28, w: 8, d: 8, h: 18 },
  { x: 8, z: -30, w: 9, d: 8, h: 24 },
  { x: -8, z: -30, w: 8, d: 8, h: 21 },
];

/** Ghost quarter (revealed by the "retain" decision): translucent echoes. */
export const GHOST_QUARTER: { x: number; z: number; w: number; d: number; h: number }[] = [
  { x: -5, z: -4, w: 3, d: 3, h: 3.2 },
  { x: -3.2, z: -6.5, w: 2.4, d: 2.4, h: 2.6 },
  { x: 4.4, z: -5.2, w: 3, d: 2.6, h: 3.6 },
  { x: 2.6, z: -7.6, w: 2, d: 2, h: 2.2 },
  { x: -10.8, z: -2.5, w: 2.4, d: 2.8, h: 3 },
  { x: -11.5, z: 3.5, w: 2, d: 2.4, h: 2.4 },
  { x: 5.8, z: 3.4, w: 2.4, d: 2.4, h: 3 },
  { x: -2.4, z: 9.5, w: 2.6, d: 2.4, h: 2.8 },
];

/** Ghost residents (revealed with the quarter). */
export const GHOST_FIGURES: { x: number; z: number }[] = [
  { x: -4.4, z: -5.2 },
  { x: 3.8, z: -6.4 },
  { x: -10.5, z: 0.6 },
  { x: 4.9, z: 4.4 },
];

/** Lamp posts along the walkways and plaza (lit by the "serve people" choice). */
export const LAMP_POSTS: { x: number; z: number }[] = [
  { x: -4, z: 2 },
  { x: 4, z: 2 },
  { x: -4, z: -3.4 },
  { x: 4, z: -3.4 },
  { x: -10.5, z: -1.5 },
  { x: -11, z: 6.5 },
  { x: 2, z: 12 },
  { x: -2, z: 12 },
  { x: 10, z: 0 },
  { x: 10, z: -4 },
];

/** Elevated walkway decks (visual); keep clear of player routes. */
export const WALKWAYS: { x: number; z: number; w: number; d: number; y: number }[] = [
  { x: -7.5, z: 8, w: 0.01 + 7, d: 1.6, y: 4.6 },
  { x: 12.8, z: 8, w: 1.6, d: 9, y: 5.2 },
];

/** Cables: [from xyz] → [to xyz] (drawn as catenary lines). */
export const CABLES: [number, number, number, number, number, number][] = [
  [0, 12.5, 0, 15.5, 8.5, 12],
  [0, 12.5, 0, 16, 11.5, 4],
  [0, 12.5, 0, 14, 9.8, -11],
  [0, 12.5, 0, -8, 7.5, 5],
  [0, 12.5, 0, -6.5, 5.8, 4.5],
  [0, 12.5, 0, 0, 9.6, 18.5],
];

/* ------------------------------ Colliders -------------------------- */

/** Static collision rectangles for the player (world XZ). */
export function buildingColliders(): Aabb[] {
  return BUILDINGS.map((b) => ({
    minX: b.x - b.w / 2 - 0.4,
    maxX: b.x + b.w / 2 + 0.4,
    minZ: b.z - b.d / 2 - 0.4,
    maxZ: b.z + b.d / 2 + 0.4,
  }));
}

export function staticColliders(): Aabb[] {
  const boxes = buildingColliders();
  // Canal water — blocked except the dock bridge strip z ∈ [-1.8, 3.2].
  boxes.push({ minX: -20, maxX: -12.4, minZ: -18, maxZ: -1.8 });
  boxes.push({ minX: -20, maxX: -12.4, minZ: 3.2, maxZ: 14 });
  // Far edge of the dock platform.
  boxes.push({ minX: -20, maxX: -16.6, minZ: -1.8, maxZ: 3.2 });
  // Vault structure.
  boxes.push({ minX: 12.4, maxX: 15.6, minZ: 8.2, maxZ: 10.4 });
  return boxes;
}

/** Resolve a point (x,z,r) against AABBs + world bounds. Mutates out. */
export function resolveCollisions(
  out: { x: number; z: number },
  r: number,
  boxes: Aabb[],
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
): void {
  for (const b of boxes) {
    const cx = Math.max(b.minX, Math.min(out.x, b.maxX));
    const cz = Math.max(b.minZ, Math.min(out.z, b.maxZ));
    const dx = out.x - cx;
    const dz = out.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 === 0) {
        // Center inside the box: push along smallest penetration axis.
        const px = Math.min(out.x - b.minX, b.maxX - out.x);
        const pz = Math.min(out.z - b.minZ, b.maxZ - out.z);
        if (px < pz) out.x = out.x - b.minX < b.maxX - out.x ? b.minX - r : b.maxX + r;
        else out.z = out.z - b.minZ < b.maxZ - out.z ? b.minZ - r : b.maxZ + r;
      } else {
        const d = Math.sqrt(d2);
        out.x = cx + (dx / d) * r;
        out.z = cz + (dz / d) * r;
      }
    }
  }
  out.x = Math.max(bounds.minX + r, Math.min(out.x, bounds.maxX - r));
  out.z = Math.max(bounds.minZ + r, Math.min(out.z, bounds.maxZ - r));
}
