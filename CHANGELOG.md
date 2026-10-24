# Change log

Record each meaningful project change during the event, newest first. Update this file in the same commit as the change. Use a real timestamp with timezone, for example `YYYY-MM-DDTHH:MM:SS+05:30`.

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
