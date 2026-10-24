# ECHO: The City That Remembers — design & implementation note

Built for Devin Hacks Kochi, Track 4 — MAKE ROOM FOR PLAY.

## Pillars

1. **A city you can read at a glance.** One dense canal district, procedural low-poly geometry, charcoal/limestone/teal/amber palette, a single landmark (the memory relay) that orientates the player everywhere.
2. **Three memories that disagree.** Three named residents each hand over a signal fragment and a written clue. All clues are text — no audio needed anywhere.
3. **Decisions that visibly change the world.** Each of the three decisions immediately re-lights or re-populates the district, so the consequence is seen before the ending explains it.

## Narrative structure

```
title → intro → explore (meet Mirai, Devi, Ilyas — any order)
      → relay puzzle → reveal → decision 1 (retain)
      → canal lock → decision 2 (serve)
      → archive vault → decision 3 (control)
      → overlook → ending + recap → wander / replay
```

Mystery: signal keeper Arjun Varma "defected" the night of the surge-flood.
Truth: he overloaded the relay to hide the district archive inside the city's
own infrastructure — the city is the vault.

## The puzzle

Three fragment dials (tide, lantern, rain), four phases each. Each NPC's clue
names the correct phase in plain text; the correct combination is
`tide=rising, lantern=lit, rain=passed` (`CORRECT_PHASES` in
`lib/game/story.ts`). The UI re-shows the three clues in place so the puzzle
never depends on memory or audio.

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

- `lib/game/` — pure logic: story content, puzzle, save schema, zustand store,
  city layout/colliders. No React/three imports; fully unit-testable.
- `components/scene/` — React Three Fiber scene: procedural district, relay,
  NPC avatars, player rig (WASD + drag-orbit camera + collisions), and the
  three decision-driven transformation groups (ghost quarter, lamp/floodlight
  lighting, dispersed/sealed archive shards).
- `components/ui/` — DOM overlays (title, HUD, dialogue, puzzle, reveal,
  decisions, ending, pause). All keyboard-operable HTML controls.
- `components/story/StoryMode.tsx` — guided mode: the same state machine
  driven through plain HTML location/actions UI. Playable with no WebGL, no
  mouse, or on touch.

## State & saves

`zustand` store is the single narrative state machine. Movement speed and the
player position live in a mutable runtime ref so per-frame updates never
trigger React re-renders. Progress is written to versioned `localStorage`
(`echo-save-v1`) after every meaningful milestone; `validateSave` rejects
corrupt/old data, and the title screen reports "unavailable" storage honestly.

## Performance & accessibility

- `dpr` capped at 1.5, instanced windows, fog-limited draw distance, no
  post-processing.
- Reduced motion (OS setting or HUD toggle) freezes bobbing, ring rotation,
  water undulation and marker animation.
- Escape pauses; keyboard clears on window blur; pointer-lock is never used —
  the camera orbits by drag so focus and keyboard access are never stolen.
