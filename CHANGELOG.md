# Change log

## 2026-10-24T21:53:05+05:30 — Correct Devin Hack Kochi event guidance

- Changed: corrected the current event name and AI tool guidance in `.github/pull_request_template.md`, `AGENTS.md`, `AI_USAGE.md`, `CHANGELOG.md`, `README.md`, `RULES.md`, `SUBMISSION.md`.
- Why: the organizer shared an older event template; Devin Hack Kochi has no
  major AI usage constraints and the template must not require a particular AI provider.
- Scope: preserved project implementation and historical assistance records.
- Removed obsolete template logistics, participation limits, and credit promises; current organizer instructions remain authoritative.
- Validation: reviewed documentation diffs, checked whitespace with `git diff --check`, and checked local Markdown links for new breakage.
- Limitations: maintainer review is pending; application tests were not run for this documentation-only correction.

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

## 2026-10-24T17:36:00+00:00 — Final verification pass + submission SHA

- Changed: Documentation only — recorded the final submitted commit SHA in SUBMISSION.md.
- Validation summary for the shipped slice: `npx tsc --noEmit` clean; `npm run lint` clean; `npx vitest run` 52/52; `npm run build` clean (production build now serving the preview). Codex browser automation review on the production build: complete 3D path — all six joints via real WASD/E, all three energized causeways, three residents, three open choices, then all three endings independently browser-reached (THE CITY REMEMBERS open, THE QUIET CITY all-sealed, THE WATCHER mixed), guided-mode replays of all three stages via real buttons, joint reset and joint-state save/reload, consequence panels, save restore across reload. Devin's own production-build checks (CDP): guided-mode full playthrough to ending (store-equivalent actions + DOM gates), title overwrite confirmation, narrow viewport, ending recap + replay buttons, save v2 restore.
- Limitations: reduced-motion was code-verified (static title orbit, halted motion flags) plus earlier screenshot review; remaining two endings reach-tested via unit coverage of the 8-combination rule rather than fresh full replays.

## 2026-10-24T17:35:00+00:00 — Guided-mode accessibility + shared signal help

- Changed: Guided story mode now shows what the beam is doing instead of bare "partway and dies": a shared `stageGuide` helper in `lib/game/signal.ts` describes each stage's route (emitter direction → target platform), every joint's current compass connections in words, the exact joint where the signal dies with the side it arrives on, and an optional computed hint ("turn j3b once — the signal must pass north–south"). Guided mode gained a toolbar with the live objective, Pause, Return-to-3D and a Hints on/off toggle. The 3D pause panel gained a "Signal help" section with the same per-stage description, hint and per-stage Reset — reset was previously guided-mode-only and there was no hint anywhere.
- Why: Codex browser automation guided-mode review — the UI exposed no joint connections, expected route, blocked node or hint, so solving was blind trial and error; objective/pause/return-to-3D controls were missing in guided mode.
- Validation: `npx tsc --noEmit` clean, `npm run lint` clean, `npx vitest run` 52/52 passing (three new stageGuide regression tests). Guided-mode equivalence verified end-to-end on the production build via CDP: all six joint turns through the same store actions the buttons call, gated travel, three NPCs, reveal, three decisions, THE CITY REMEMBERS ending + recap, replay reset, save overwrite confirmation, 390px narrow viewport.
- Limitations: hint text is generated from the known solution route (each joint's required entry/exit edges), not a general solver — fine for three authored stages.

## 2026-10-24T17:25:00+00:00 — Redesign fixes: decision consequence, arch camera, title UX

- Changed: Decision panels now keep their consequence text visible until the player presses Continue — `applyDecision` no longer clears the overlay; the new `closeDecision` store action chains into pending decisions afterward (regression test added). `CAMERA_TALL` now models only each arch's actual columns instead of a solid box over the opening, so the elevated camera keeps its overview when walking through causeway arches (verified the close-clamp bug is gone by geometry — columns sit at the arch edges only). Title screen tagline explains the architectural-puzzle premise; starting a New game over an existing save now asks for explicit confirmation before overwriting.
- Why: Codex browser automation review on commit 31ce6e5 — consequence copy never rendered (panel dismissed instantly) and the south arch clamped the camera to the avatar.
- Validation: `npx tsc --noEmit` clean, `npm run lint` clean, `npx vitest run` 49/49 passing; browser-verified decision flow via CDP: choice applied, panel text stays until Continue, save v2 restores joints on reload.
- Limitations: Full three-stage real-input playthrough still in progress in the reviewer's browser; ornament polish pending.

## 2026-10-24T17:15:00+00:00 — Redesign: architectural signal puzzle, milestone 1

- Changed: Reworked ECHO into an architectural puzzle game per the new visual direction (bright ivory/peach platforms, lilac shadow sides, mint atmosphere, teal signal accents, focal relay spire). Replaced the dial puzzle with a spatial signal-routing system: three escalating stages of rotatable relay joints (straight + elbow conductors), a visible beam that propagates emitter→joints→memory platform, and energized causeway tiles that literally rise into the walkway network. Movement is now floor-union walking with edge gaps, conventional camera-relative controls (fixes inverted W/A), an elevated ¾ camera with a clearance ray against tall structures, and a stranded-player catch (teleport to plaza, no softlocks). Decisions now weave through progression after each stage via the pending-decision chain; save format bumped to v2 with joint rotations and honest "outdated" handling of v1 saves; guided story mode rewired to the same joint/decision logic. Removed lib/game/puzzle.ts and Buildings.tsx; rewrote District/Relay/PlayerRig/StoryMode.
- Why: User steer — adopt the four supplied art references and make the architecture itself the manipulable puzzle; fix inverted controls, camera obstruction, and the too-dark scene.
- Validation: `npx tsc --noEmit` clean, `npm run lint` clean, `npx vitest run` 48/48 passing (signal propagation, energized-floor walkability, decision chaining, all 8 endings, save v2 incl. outdated). Scene verified rendering in the browser via CDP screenshot.
- Limitations: Ornamental dressing still being refined; full real-input playthrough pending; stage-2/3 NPC pacing not yet browser-verified.

## 2026-10-24T16:45:00+00:00 — ECHO vertical slice: core game

- Changed: Implemented the full playable vertical slice of *ECHO: The City That Remembers* — Next.js 15 + React Three Fiber app with a procedural low-poly canal district, third-person player (WASD + drag orbit camera + collision), three NPCs, the memory-relay alignment puzzle, three consequential decisions with immediate world transformations, three endings with recap, versioned localStorage save/resume, guided story mode, pause menu, and reduced-motion support. Added a vitest suite for narrative flow, puzzle correctness, decision/ending rules, save validation, and reset. Added DESIGN.md and rewrote README.md for the game (DevDay-era RULES.md/AGENTS.md preserved as scaffold provenance).
- Why: Build the Track 4 "MAKE ROOM FOR PLAY" vertical slice specified in the implementation brief.
- Validation: `npm run typecheck` clean, `npx eslint .` clean (0 problems), `npx vitest run` 28/28 passing, `npm run build` successful.
- Limitations: No audio; browser playthrough verification pending.

## Template setup — 10 October 2026

- Changed: Added the event README, rules, agent guide, change log, AI usage record, submission checklist, Git ignore rules, and pull request checklist.
- Why: Give participants a consistent starting point for event rules, basic coding patterns, documented changes, and regular commits.
- Validation: Checked local Markdown links, event detail consistency, required documents, and diff whitespace before publishing.
- Limitations: Documentation scaffolding only; no participant project, application, or working demo is included. GitHub publication and template status are verified separately after creation.
