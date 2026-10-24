# ECHO: The City That Remembers — design & implementation note

Built for Devin Hacks Kochi, Track 4 — MAKE ROOM FOR PLAY.

## Pillars

1. **Architecture is the puzzle.** One compact floating district, one coherent
   spatial system: rotate relay joints so a visible signal beam carries through
   causeways and docks the bridges you actually walk on.
2. **A city you can read at a glance.** Bright sculptural palette — ivory and
   peach faces, lilac shadow sides, mint-teal atmosphere with soft luminous
   fog — and one unmistakable focal structure (the astrolabe relay). Elevated
   three-quarter camera with restrained drag orbit.
3. **Three memories that disagree.** Each memory platform holds one resident
   whose fragment and written clue unlock a consequential decision — the
   decisions are woven through progression, one after each stage.
4. **Decisions that visibly change the world.** Each choice immediately
   re-lights or re-populates the district before the ending explains it.

## Narrative structure

```
title → intro → stage 1: garden signal (teaches the single turn)
      → Mirai → decision 1 (retain)
      → stage 2: dock signal (two joints combine)
      → Devi → decision 2 (serve)
      → stage 3: archive signal (straight + two elbows)
      → Ilyas → reveal → decision 3 (control)
      → overlook → ending + recap → wander / replay
```

Mystery: signal keeper Arjun Varma "defected" the night of the surge-flood.
Truth: he overloaded the relay to hide the district archive inside the city's
own infrastructure — the city is the vault.

## The spatial puzzle

`lib/game/signal.ts` is the whole system:

- **Joints** come in two shapes — `straight` (conducts two opposite edges) and
  `elbow` (conducts two adjacent edges) — each rotatable in 90° steps by
  standing at its pedestal and pressing E (or its button in guided mode).
- **The beam** propagates from a stage emitter, across straight lines through
  each joint's two connected edges, to its bridge receiver. It is drawn in the
  scene as a luminous teal line, so the routing itself is visible feedback.
- **Docking bridges.** A completed stage raises its named Blender bridge into
  place. Its deck and rail collision proxies share the same parent offset through
  `bridgeOffset`; the controller samples the actual exported floor planes and
  smooth stair wedges. Upstream beam segments activate downstream controls.
- **Progression gating.** A joint can only be turned once the beam has reached
  its pedestal (`jointReachable`), so stages teach then combine: stage 1 is a
  single turn; stage 2 chains two elbows; stage 3 interleaves an elbow, a
  straight, and a final elbow.
- **Reversible, no softlocks.** Joints cycle freely through quarter turns;
  breaking a connection parks its bridge below the route. If that ever strands the player
  off the plaza's floor island, they are caught back at the plaza with a
  notice. Guided mode exposes per-stage reset buttons.

## Ending rule (explicit, testable)

Each decision stores a boolean flag — "open" vs "sealed" — in
`decisions: Partial<Record<DecisionId, boolean>>`.

```
open = count(decisions.retain, decisions.serve, decisions.control === true)
open === 3 → "The City Remembers"
open === 0 → "The Quiet City"
else       → "The Watcher"
```

`computeEnding` in `lib/game/story.ts` is the single source of truth and is
unit-tested over all eight flag combinations.

## Architecture

- `lib/game/` — signal propagation, collider-derived floor heights and blockers,
  story content, save schema v3, zustand store, and the Three.js animation driver.
- `components/scene/` — imported map/player GLBs, beam lines and rotating joints,
  resident avatars, camera-relative controller and decision-driven effects
  (ghost quarter/cool sealed palette, warm grid/relay floodlights, shared shards/crown).
- `components/ui/` — DOM overlays (title, HUD, dialogue, reveal, decisions,
  ending, pause). All keyboard-operable HTML controls.
- `components/story/StoryMode.tsx` — guided mode: the same state machine
  driven through plain HTML location/action UI (turn joints, travel gated by
  energized causeways, talk to residents, make the same decisions, reach the
  same endings). Playable with no WebGL, no mouse, or on touch.

## Saves

Versioned localStorage (`echo-save-v3`) storing fragments, residents heard,
joint rotations, decisions, player position and mode. Validation rejects
duplicates, impossible progress (decisions without their resident's talk,
out-of-order decisions), malformed joint rotations, and normalizes positions
that no longer connect to the plaza or lie inside an obstacle. v2 saves migrate
progress and dock turn states to the new layout while resetting their old coordinates. A save from the earlier build
(`echo-save-v1`) is reported as *outdated* and cleared — honestly, never
silently.

## Accessibility & comfort

- Reduced-motion toggle (+ OS preference): halts orbits, bobbing, sparks.
- Guided story mode is a complete equivalent path — every action, every
  decision, every ending.
- All critical info is text or geometry; no audio is required anywhere.
- Pause overlays freeze the world; movement velocity is hard-zeroed while
  any overlay is open.
