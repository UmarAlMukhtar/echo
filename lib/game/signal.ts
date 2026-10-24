/* ------------------------------------------------------------------ *
 *  Signal routing puzzle                                              *
 *                                                                    *
 *  The relay emits a visible signal from emitters on the plaza edge.   *
 *  It travels node to node in straight, axis-aligned lines. Each node  *
 *  is a rotatable joint pedestal: straight pieces pass the beam        *
 *  through, elbows turn it ninety degrees. When the beam reaches its *
 *  receiver, the named Blender bridge docks and becomes walkable.      *
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

export interface StageDef {
  id: StageId;
  label: string;
  /** Short name used in notices ("the garden platform"). */
  targetName: string;
  source: { pos: [number, number]; dir: Dir };
  joints: JointDef[];
  target: { pos: [number, number] };
}

/* ------------------------------- Layout ---------------------------- */

export const STAGES: StageDef[] = [
  {
    id: "stage1",
    label: "Garden signal",
    targetName: "garden platform",
    source: { pos: [-2.6, 0], dir: 3 },
    joints: [
      {
        id: "j1",
        stage: "stage1",
        kind: "straight",
        pos: [-4.4, 0],
        init: 0,
      },
    ],
    target: { pos: [-10, 0] },
  },
  {
    id: "stage2",
    label: "Dock signal",
    targetName: "dock platform",
    source: { pos: [2, -2.6], dir: 1 },
    joints: [
      {
        id: "j2a",
        stage: "stage2",
        kind: "elbow",
        pos: [4, -2.6],
        init: 1,
      },
      {
        id: "j2b",
        stage: "stage2",
        kind: "elbow",
        pos: [4, 1],
        init: 1,
      },
    ],
    target: { pos: [9, 1] },
  },
  {
    id: "stage3",
    label: "Archive signal",
    targetName: "archive platform",
    source: { pos: [-2.8, -2.4], dir: 1 },
    joints: [
      {
        id: "j3a",
        stage: "stage3",
        kind: "elbow",
        pos: [-0.9, -2.4],
        init: 0,
      },
      {
        id: "j3b",
        stage: "stage3",
        kind: "straight",
        pos: [-0.9, -4.1],
        init: 1,
      },
      {
        id: "j3c",
        stage: "stage3",
        kind: "elbow",
        pos: [-0.9, -6.5],
        init: 2,
      },
    ],
    target: { pos: [0.9, -6.5] },
  },
];

export const JOINT_DEFS: JointDef[] = STAGES.flatMap((s) => s.joints);
export const JOINT_IDS: JointId[] = JOINT_DEFS.map((j) => j.id);
export const JOINT_BY_ID = new Map(JOINT_DEFS.map((j) => [j.id, j]));
export const STAGE_BY_ID = new Map(STAGES.map((s) => [s.id, s]));

/* --------------------------- Propagation --------------------------- */

/** Edges a joint connects at the given rotation index (0-3). */
export function jointEdges(kind: JointDef["kind"], rot: number): Dir[] {
  const r = (((rot % 4) + 4) % 4) as Dir;
  if (kind === "straight") return r % 2 === 0 ? [0, 2] : [1, 3];
  return [r, ((r + 1) % 4) as Dir];
}

const opposite = (d: Dir): Dir => ((d + 2) % 4) as Dir;

interface NodeHit {
  id: string;
  pos: [number, number];
  dist: number;
}

/** The next node lying on the ray from pos along dir, if any. */
function nextNode(
  stage: StageDef,
  pos: [number, number],
  dir: Dir,
): NodeHit | null {
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

export function computeStage(
  stage: StageDef,
  joints: JointRotations,
): BeamResult {
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
    if (hit.id === "target")
      return { stage: stage.id, edges, segments, reached: true, lastNode };
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
  joints: JointRotations,
): Record<StageId, BeamResult> {
  return {
    stage1: computeStage(STAGES[0], joints),
    stage2: computeStage(STAGES[1], joints),
    stage3: computeStage(STAGES[2], joints),
  };
}

export function initialJoints(): JointRotations {
  return Object.fromEntries(
    JOINT_DEFS.map((j) => [j.id, j.init]),
  ) as JointRotations;
}

/**
 * A joint is reachable when its pedestal can be stood on: the first joint of
 * each stage is always active; downstream controls unlock as the signal arrives.
 */
export function jointReachable(
  jointId: JointId,
  joints: JointRotations,
): boolean {
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

/* --------------------- Accessible stage guidance -------------------- */

export const DIR_NAME: Record<Dir, string> = {
  0: "north",
  1: "east",
  2: "south",
  3: "west",
};

/** Dominant cardinal direction from one point to another. */
function dirToward(from: [number, number], to: [number, number]): Dir {
  const dx = to[0] - from[0];
  const dz = to[1] - from[1];
  if (Math.abs(dx) >= Math.abs(dz)) return dx > 0 ? 1 : 3;
  return dz > 0 ? 2 : 0;
}

/** "joins east–west" for a straight joint, "joins north to east" for an elbow. */
export function edgesPhrase(kind: JointDef["kind"], edges: Dir[]): string {
  const names = edges.map((d) => DIR_NAME[d]);
  return kind === "straight"
    ? `joins ${names[0]}–${names[1]}`
    : `joins ${names[0]} to ${names[1]}`;
}

const sameDirs = (a: Dir[], b: Dir[]) =>
  a.length === b.length && a.every((d) => b.includes(d));

export interface JointGuide {
  id: JointId;
  kind: JointDef["kind"];
  /** What the joint currently connects, in words. */
  current: string;
  /** Edges the working route needs: the side the signal arrives on, then the side it must leave. */
  needs: [Dir, Dir];
  /** True when the current rotation already connects the needed edges. */
  aligned: boolean;
  /** +1 turns to reach a rotation that connects the needed edges; -1 if impossible. */
  turnsToAlign: number;
}

export interface StageGuide {
  stage: StageId;
  label: string;
  /** One-line route: where the signal starts and where it must go. */
  route: string;
  reached: boolean;
  /** Where the signal currently dies, in words, or null when reached. */
  stopsAt: string;
  joints: JointGuide[];
  /** One actionable line. */
  hint: string;
}

/**
 * Textual view of a stage's live routing state — shared by guided mode and
 * the 3D pause/help panel so both describe the same beam.
 */
export function stageGuide(
  stage: StageDef,
  joints: JointRotations,
): StageGuide {
  const chain: [number, number][] = [
    stage.source.pos,
    ...stage.joints.map((j) => j.pos),
    stage.target.pos,
  ];
  const guide: JointGuide[] = stage.joints.map((j, i) => {
    const needs: [Dir, Dir] = [
      dirToward(j.pos, chain[i]),
      dirToward(j.pos, chain[i + 2]),
    ];
    const cur = jointEdges(j.kind, joints[j.id]);
    let turnsToAlign = -1;
    for (let k = 0; k < 4; k++) {
      if (sameDirs(jointEdges(j.kind, joints[j.id] + k), needs)) {
        turnsToAlign = k;
        break;
      }
    }
    return {
      id: j.id,
      kind: j.kind,
      current: edgesPhrase(j.kind, cur),
      needs,
      aligned: sameDirs(cur, needs),
      turnsToAlign,
    };
  });
  const res = computeStage(stage, joints);
  const route = `the plaza emitter fires ${DIR_NAME[stage.source.dir]} toward the ${stage.targetName}`;
  if (res.reached) {
    return {
      stage: stage.id,
      label: stage.label,
      route,
      reached: true,
      stopsAt: "the signal reaches the platform",
      joints: guide,
      hint: `Aligned — the signal reaches the ${stage.targetName} and its causeway is energized.`,
    };
  }
  let stopsAt: string;
  if (res.lastNode && res.lastNode !== "src") {
    const stop = guide.find((g) => g.id === res.lastNode);
    const seg = res.segments[res.segments.length - 1];
    const entry = seg ? DIR_NAME[dirToward(seg.b, seg.a)] : "emitter";
    stopsAt = `the signal dies at ${res.lastNode} — it arrives on the ${entry} side, but the joint ${stop?.current ?? "is misaligned"}`;
  } else {
    stopsAt = `the beam leaves the emitter heading ${DIR_NAME[stage.source.dir]} and finds nothing`;
  }
  const first = guide.find((g) => !g.aligned);
  const hint = first
    ? first.turnsToAlign === 1
      ? `Hint: turn ${first.id} once — the signal must ${first.kind === "straight" ? `pass ${DIR_NAME[first.needs[0]]}–${DIR_NAME[first.needs[1]]}` : `turn from the ${DIR_NAME[first.needs[0]]} side to the ${DIR_NAME[first.needs[1]]} side`} through it; it currently ${first.current}.`
      : `Hint: turn ${first.id} ${first.turnsToAlign > 0 ? `${first.turnsToAlign} times ` : ""}— it must ${first.kind === "straight" ? `pass ${DIR_NAME[first.needs[0]]}–${DIR_NAME[first.needs[1]]}` : `turn from the ${DIR_NAME[first.needs[0]]} side to the ${DIR_NAME[first.needs[1]]} side`}; it currently ${first.current}.`
    : "Hint: the route looks aligned — watch where the beam ends in the district.";
  return {
    stage: stage.id,
    label: stage.label,
    route,
    reached: false,
    stopsAt,
    joints: guide,
    hint,
  };
}
