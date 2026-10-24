import { CORRECT_PHASES, FRAGMENTS } from "./story";
import type { FragmentId } from "./types";

export type PhaseSelections = Record<FragmentId, number>;

/** Initial dial indices (all fragments on phase 0). */
export function initialSelections(): PhaseSelections {
  return { tide: 0, lantern: 0, rain: 0 };
}

/** Cycle one fragment's dial forward; wraps at the end. */
export function cyclePhase(sel: PhaseSelections, id: FragmentId): PhaseSelections {
  const count = FRAGMENTS.find((f) => f.id === id)!.phases.length;
  return { ...sel, [id]: (sel[id] + 1) % count };
}

export function selectedPhaseIds(sel: PhaseSelections): Record<FragmentId, string> {
  const out = {} as Record<FragmentId, string>;
  for (const f of FRAGMENTS) {
    out[f.id] = f.phases[sel[f.id]].id;
  }
  return out;
}

export interface SolutionCheck {
  solved: boolean;
  /** Which fragments are currently correct — used for gentle feedback. */
  correct: FragmentId[];
}

export function checkSolution(sel: PhaseSelections): SolutionCheck {
  const ids = selectedPhaseIds(sel);
  const correct = FRAGMENTS.map((f) => f.id).filter(
    (id) => ids[id] === CORRECT_PHASES[id]
  );
  return { solved: correct.length === FRAGMENTS.length, correct };
}
