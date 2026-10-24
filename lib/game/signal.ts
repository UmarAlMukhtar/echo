/* ------------------------------------------------------------------ *
 *  Signal routing puzzle                                              *
 *                                                                    *
 *  The relay emits a visible signal from emitters on the plaza edge.   *
 *  It travels node to node in straight, axis-aligned lines. Each node  *
 *  is a rotatable joint pedestal: straight pieces pass the beam        *
 *  through, elbows turn it ninety degrees. When the beam completes a   *
 *  segment between two nodes, the causeway tiles along it energize     *
 *  and become walkable — architecture is the puzzle state. When the    *
 *  beam reaches a stage's target platform, that stage is aligned.      *
 * ------------------------------------------------------------------ */

/** Cardinal direction as an index: 0=N(-z), 1=E(+x), 2=S(+z), 3=W(-x). */
export type Dir = 0 | 1 | 2 | 3;

export const DIR_VEC: Record<Dir, [number, number]> = {
  0: [0, -1],
  1: [1, 0],
  2: [0, 1],
  3: [-1, 0],
};

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export type JointId = "j1" | "j2a" | "j2b" | "j3a" | "j3b" | "j3c";
export type StageId = "stage1" | "stage2" | "stage3";
export const STAGE_IDS: StageId[] = ["stage1", "stage2", "stage3"];
export type JointRotations = Record<JointId, number>;

export interface JointDef {
  id: JointId;
  stage: StageId;
  kind: "straight" | "elbow";
  pos: [number, number];
  /** Rotation index at game start (each joint starts misaligned). */
  init: number;
}

export interface TileDef {
  /** Directed edge "fromId>toId" whose traversal energizes this tile. */
  edge: string;
  rect: Rect;
}

export interface StageDef {
  id: StageId;
  label: string;
  /** Short name used in notices ("the garden platform"). */
  targetName: string;
  source: { pos: [number, number]; dir: Dir };
  joints: JointDef[];
  target: { pos: [number, number] };
  tiles: TileDef[];
}

/* ------------------------------- Layout ---------------------------- */

export const STAGES: StageDef[] = [
  {
    id: "stage1",
    label: "Garden signal",
    targetName: "garden platform",
    source: { pos: [-5, -1.5], dir: 3 },
    joints: [
      {
        id: "j1",
        stage: "stage1",
        kind: "straight",
        pos: [-6.6, -1.5],
        init: 0,
      },
    ],
    target: { pos: [-11, -1.5] },
    tiles: [
      { edge: "j1>target", rect: { x0: -11, z0: -2.5, x1: -8.2, z1: -0.5 } },
    ],
  },
  {
    id: "stage2",
    label: "Dock signal",
    targetName: "dock platform",
    source: { pos: [-5, 4.4], dir: 3 },
    joints: [
      {
        id: "j2a",
        stage: "stage2",
        kind: "elbow",
        pos: [-6.4, 4.4],
        init: 0,
      },
      {
        id: "j2b",
        stage: "stage2",
        kind: "elbow",
        pos: [-6.4, 7.4],
        init: 0,
      },
    ],
    target: { pos: [-11.4, 7.4] },
    tiles: [
      { edge: "j2a>j2b", rect: { x0: -7.8, z0: 5.4, x1: -5.4, z1: 6.4 } },
      { edge: "j2b>target", rect: { x0: -11.4, z0: 6.4, x1: -7.8, z1: 8.4 } },
    ],
  },
  {
    id: "stage3",
    label: "Archive signal",
    targetName: "archive platform",
    source: { pos: [5, -0.8], dir: 1 },
    joints: [
      {
        id: "j3a",
        stage: "stage3",
        kind: "elbow",
        pos: [6.4, -0.8],
        init: 0,
      },
      {
        id: "j3b",
        stage: "stage3",
        kind: "straight",
        pos: [6.4, -4.4],
        init: 1,
      },
      {
        id: "j3c",
        stage: "stage3",
        kind: "elbow",
        pos: [6.4, -7.4],
        init: 2,
      },
    ],
    target: { pos: [10.4, -7.4] },
    tiles: [
      { edge: "j3a>j3b", rect: { x0: 5.4, z0: -3.4, x1: 7.4, z1: -2 } },
      { edge: "j3b>j3c", rect: { x0: 5.4, z0: -6.4, x1: 7.4, z1: -5.4 } },
      { edge: "j3c>target", rect: { x0: 7.4, z0: -8.4, x1: 10.4, z1: -6.4 } },
    ],
  },
];

export const JOINT_DEFS: JointDef[] = STAGES.flatMap((s) => s.joints);
export const JOINT_IDS: JointId[] = JOINT_DEFS.map((j) => j.id);
export const JOINT_BY_ID = new Map(JOINT_DEFS.map((j) => [j.id, j]));
export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

/* --------------------------- Propagation --------------------------- */

/** Edges a joint connects at the given rotation index (0-3). */
export function jointEdges(kind: JointDef["kind"], rot: number): Dir[] {
  const r = ((((rot % 4) + 4) % 4) as Dir);
  if (kind === "straight") return r % 2 === 0 ? [0, 2] : [1, 3];
  return [r, ((r + 1) % 4) as Dir];
}

const opposite = (d: Dir): Dir => (((d + 2) % 4) as Dir);

interface NodeHit {
  id: string;
  pos: [number, number];
  dist: number;
}

/** The next node lying on the ray from pos along dir, if any. */
function nextNode(stage: StageDef, pos: [number, number], dir: Dir): NodeHit | null {
  const [vx, vz] = DIR_VEC[dir];
  const nodes: { id: string; pos: [number, number] }[] = [
    ...stage.joints.map((j) => ({ id: j.id, pos: j.pos })),
    { id: "target", pos: stage.target.pos },
  ];
  let best: NodeHit | null = null;
  for (const n of nodes) {
    const dx = n.pos[0] - pos[0];
    const dz = n.pos[1] - pos[1];
    const along = vx !== 0 ? dx * vx : dz * vz;
    const off = vx !== 0 ? dz : dx;
    if (along <= 0.01 || Math.abs(off) > 0.01) continue;
    const dist = Math.abs(dx) + Math.abs(dz);
    if (!best || dist < best.dist) best = { id: n.id, pos: n.pos, dist };
  }
  return best;
}

export interface BeamResult {
  stage: StageId;
  /** Directed edges traversed, in order ("src>j1", "j1>target", ...). */
  edges: string[];
  /** World segments the beam actually drew. */
  segments: { a: [number, number]; b: [number, number] }[];
  /** True when the beam reached the stage's target platform. */
  reached: boolean;
  /** Node where the beam stops (last hit), or null when it leaves cold. */
  lastNode: string | null;
}

export function computeStage(stage: StageDef, joints: JointRotations): BeamResult {
  const edges: string[] = [];
  const segments: BeamResult["segments"] = [];
  let pos = stage.source.pos;
  let dir = stage.source.dir;
  let prev = "src";
  let lastNode: string | null = null;
  for (let step = 0; step < 12; step++) {
    const hit = nextNode(stage, pos, dir);
    if (!hit) break;
    edges.push(`${prev}>${hit.id}`);
    segments.push({ a: pos, b: hit.pos });
    prev = hit.id;
    lastNode = hit.id;
    if (hit.id === "target") return { stage: stage.id, edges, segments, reached: true, lastNode };
    const joint = stage.joints.find((j) => j.id === hit.id)!;
    const conn = jointEdges(joint.kind, joints[joint.id]);
    const entry = opposite(dir);
    if (!conn.includes(entry)) break;
    dir = conn.find((e) => e !== entry)!;
    pos = hit.pos;
  }
  return { stage: stage.id, edges, segments, reached: false, lastNode };
}

export function computeAllBeams(
  joints: JointRotations
): Record<StageId, BeamResult> {
  return {
    stage1: computeStage(STAGES[0], joints),
    stage2: computeStage(STAGES[1], joints),
    stage3: computeStage(STAGES[2], joints),
  };
}

export function initialJoints(): JointRotations {
  return Object.fromEntries(JOINT_DEFS.map((j) => [j.id, j.init])) as JointRotations;
}

/** Causeway tile rects currently energized by any stage's beam. */
export function energizedRects(joints: JointRotations): Rect[] {
  const beams = computeAllBeams(joints);
  const out: Rect[] = [];
  for (const stage of STAGES) {
    const res = beams[stage.id];
    for (const t of stage.tiles) {
      if (res.edges.includes(t.edge)) out.push(t.rect);
    }
  }
  return out;
}

/**
 * A joint is reachable when its pedestal can be stood on: first joints of
 * each stage sit on spurs attached to the plaza; downstream joints need the
 * beam to have energized the edge leading into them.
 */
export function jointReachable(jointId: JointId, joints: JointRotations): boolean {
  const def = JOINT_BY_ID.get(jointId)!;
  const stage = STAGE_BY_ID.get(def.stage)!;
  if (stage.joints[0].id === jointId) return true;
  const res = computeStage(stage, joints);
  return res.edges.some((e) => e.endsWith(`>${jointId}`));
}

/** Number of stages whose beam currently reaches its target. */
export function alignedCount(joints: JointRotations): number {
  const beams = computeAllBeams(joints);
  return STAGE_IDS.filter((id) => beams[id].reached).length;
}
