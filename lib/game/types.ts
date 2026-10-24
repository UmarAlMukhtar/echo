export type GameMode = "3d" | "story";

export type GamePhase = "title" | "playing" | "ended";

export type FragmentId = "tide" | "lantern" | "rain";

export type NpcId = "mirai" | "devi" | "ilyas";

export type DecisionId = "retain" | "serve" | "control";

export type EndingId = "remembers" | "quiet" | "watcher";

export type Overlay =
  | { kind: "intro" }
  | { kind: "dialogue"; npcId: NpcId }
  | { kind: "reveal" }
  | { kind: "decision"; id: DecisionId }
  | { kind: "ending" }
  | { kind: "pause" };

export type Decisions = Partial<Record<DecisionId, boolean>>;

export type InteractableKind = "npc" | "joint" | "overlook";

export interface InteractableSpec {
  id: string;
  kind: InteractableKind;
  position: [number, number];
  radius: number;
  label: string;
  prompt: string;
}
