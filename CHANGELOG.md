# Change log

## 2026-10-25T01:32:40+05:30 — Original rigged memory keeper

- Added `assets/echo_player/`: original rounded-hood keeper, single mint lens,
  slate-lilac coat, peach scarf, brass lantern and visible boots; deterministic
  Blender generator, editable rig, GLB, six previews and integration/QA reports.
- Budget: 2,064 triangles, 4 shared materials, 214,936-byte self-contained GLB.
  An 18-bone rig exports in-place Idle (2.4 s), Walk (1 s), Interact (1.2 s).
  Origin is on the ground, scale 1 m/unit, GLB +Z forward and Y-up.
- Checks: two independent exports across worker counts byte-identical; Blender
  re-import confirmed all materials and clips; actual Three.js 0.180.0 GLTFLoader
  and AnimationMixer evaluated all skinned clips, vertex colours, loop seams,
  stationary root and boot ground clearance. Six views inspected, including
  normal game-camera distance and Interact peak. Syntax and whitespace pass.
- Corrections: foot rotation compensation, scarf/face overlap, unused UV data and
  nondeterministic triangle ordering corrected from test/render evidence.
- Scope: assets and documentation only. Map unchanged from
  2bc7f2b21f5dae981e127519999ae854870a1584; application/gameplay code untouched.
- Limits: live-game avatar/controller integration not performed. Runtime loop
  modes are configured by the animation player as documented in INTEGRATION.md.

## 2026-10-25T00:12:41+05:30 — Detail approved district and optimize asset exports

- Changed: expanded `assets/echo_memory_district/generate_district.py` with plaza
  paving/mosaic/astrolabe, layered foundations, tower windows/roofs, arch trim,
  garden planting/bench, dock station/bollards, archive shelves/seats and railings.
  Replaced blockout outputs with editable `echo_district.blend`, optimized visual
  `echo_district.glb`, separate collision GLB and three 1920 × 1440 previews.
- Why: the user approved blockout `e8effb8` and requested detail. Walking surfaces,
  heights, bridge pivots and NPC spawns retain that layout. Shared mesh components
  remain editable; production geometry batches by district/material and bridge.
- Validation: headless Blender generation and all three CPU Cycles renders passed;
  1.8 m route corridors tested with 0.3 m character radius, max riser 0.15 m;
  NPC clearance and independent bridge rotation passed. Independent GLB validator
  passed closed/outward collision geometry, hierarchy, Y-up pivots, spawn markers,
  material/triangle/size budgets and visual/collision separation. Two independent
  generations produced byte-identical GLBs. Final visual: 614,080 bytes, 10,838
  triangles, 6 materials, 38 material batches; collision: 51,772 bytes, 768 instance
  triangles, 64 proxy nodes. Python syntax, report file sizes and diff whitespace pass.
- Files: asset folder, repository `README.md`, `AI_USAGE.md`, `CHANGELOG.md`.
- Limitations: no gameplay integration or in-engine physics test. The existing flat
  floor controller needs a separately scoped integration. Lighting/atmosphere must
  be configured in-engine; NPC characters are preview stand-ins with runtime spawns.
  Application, components, game logic and tests remain unchanged.
- Final QA: optimized GLB re-import rendered successfully; duplicate corner posts
  removed to eliminate dark overlap artifacts. Corrected exports reproduce bytewise.
  Three corrected previews regenerated and visually checked.

## 2026-10-24T23:40:00+05:30 — Environment layout review blockout

- Changed: added `assets/echo_memory_district/` with a deterministic Blender
  Python generator, editable blockout, review GLB, three rendered views, per-object
  JSON inventory and integration notes. Added the asset command to `README.md`.
- Why: provide an original compact plaza and three connected memory platforms
  for layout approval before detailing. Three movable bridge parents and three
  NPC spawn empties are independently named; simple collision proxies are in Blend.
- Validation: Blender 4.5.3 LTS background startup and 64 × 64 CPU Cycles smoke
  render passed. Generated three 1440 × 1080 previews. Geometry raycasts pass for
  all three routes at 0.05 m intervals across a 0.6 m corridor; max riser 0.15 m.
  Review GLB structure checked: 1,128 triangles, 5 materials, 61 nodes, three
  bridge parents and three NPC spawn nodes, correct Y-up export translations.
- Limitations: blockout awaiting layout review; no final detailing or production
  optimization. Visual GLB omits collision proxies, review labels and lighting.
  Existing fixed-height movement/floor maps do not yet support this proposal.
  Application and gameplay source files are unchanged; no application tests needed.

## 2026-10-24T17:58:00+00:00 — Failed milestone writes surface feedback

- Changed: `lib/game/store.ts` — `persist` now uses `writeSave`'s result: when storage exists but the write throws, `lastNotice` becomes "Couldn't save progress — browser storage is unavailable." instead of silently reloading an older valid save and reporting `saveStatus:"ok"` as if the milestone persisted. The older save still keeps `hasSave`/`saveStatus` from what is actually stored, so Continue and the overwrite guard reflect reality. No storage at all stays covered by the startup banner rather than spamming every milestone.
- Why: Codex browser automation error-path review — `persist` ignored `writeSave`'s false result, so a failed milestone write reported ok.
- Validation: `npx tsc --noEmit` clean, `npm run lint` clean, `npx vitest run` 61/61 (new regression: `setItem` throws for the save key while `getItem` returns an older valid snapshot — notice surfaces, older save still offers Continue), `npm run build` clean; production preview restarted and serving HTTP 200.
- Limitations: none new.

## 2026-10-24T17:56:00+00:00 — Element-scoped context-loss + save hardening

- Changed: `components/scene/CityScene.tsx` — the global `window` `webglcontextlost` capture listener (which let a newly mounted listener catch the OLD canvas's delayed disposal event and revert to guided mode) is replaced by a `ContextLossWatcher` inside the Canvas: `useThree` binds the handler directly to the live `gl.domElement`, effect keyed on `gl` removes any registration race with `onCreated`, and cleanup on unmount removes the listener so intentional disposal can never reach a fresh mount. `components/story/StoryMode.tsx` + `app/globals.css` — `lastNotice` now renders as `.story-notice` in guided mode (it was previously only in Hud, which guided mode hides), so the real fallback explanation is visible there. `lib/game/save.ts` — `normalizePosition` now requires both `connectedToPlaza` AND `isWalkable` for the restored point and its plaza fallback (a saved point inside the solid relay plinth connected to floor but could never be walked out of — no more invisible softlock); `reachedEnding` validation rejects non-boolean values and `true` without all three decisions (absent still defaults false for older v2 saves).
- Why: Codex browser automation lifecycle retest — rapid 3D↔guided cycles looked 3D immediately but reverted to guided once the stale canvas's delayed disposal event reached the new mount's global listener; plus save-validation gaps letting a softlock position and an impossible `reachedEnding` through.
- Validation: `npx tsc --noEmit` clean, `npm run lint` clean, `npx vitest run` 60/60 (2 new regressions: obstacle-inside save point normalized away; non-boolean and premature `reachedEnding` rejected while a complete-decisions true round-trips), `npm run build` clean. Live production-build browser verification via CDP: `WEBGL_lose_context.loseContext()` on the active renderer → guided mode + "3D view lost — switched to Guided Story Mode." rendered in the guided `.story-notice`; Return to 3D retries and recovers (`mode:"3d"`, canvas remounted); four rapid guided→3D cycles checked at immediate AND settled (+8s) state — all stayed `mode:"3d"` with a mounted canvas and no story UI.
- Limitations: none new.

## 2026-10-24T17:48:00+00:00 — PR #2 review findings closed

- Changed: `lib/game/store.ts` — `persist` now refreshes `hasSave`/`saveStatus` from the real write result, so a fresh run's first milestone enables Continue + the overwrite guard; `activeInteractables` filters joint prompts by `jointReachable` (matching guided gating; `rotateJoint` stays ungated for reset); `reachedEnding` is saved and restored so Continue after an ending keeps "walk the city you made". `lib/game/save.ts` — `reachedEnding` field (defaults false for older v2 saves). `components/ui/Overlays.tsx` + `lib/game/story.ts` — new `pickDialogueLines`: first meetings always give the testimony (Ilyas's stage must be aligned to reach him, so alignment can no longer skip `firstMeeting`); repeats get `again` until the reveal, then `afterRelay`. `components/scene/CityScene.tsx` + `components/GameShell.tsx` — the `webglcontextlost` listener on the canvas is removed on unmount, a latched `sceneError` no longer gates the 3D view (fresh mounts clear it via `onReady`, and a retry remount fires when 3D becomes live), and `onError` only drops to guided mode with a notice when the 3D view was actually live.
- Why: PR #2 review (Codex browser automation + Devin Review) found five real defects — stale `hasSave` after a first milestone write bypassing overwrite protection, guided title bypass (previous commit), Ilyas's first testimony skipped by the aligned-stage check, downstream joints prompting across unpowered gaps, endings forgotten on reload — plus a browser-reproduced mode-switch deadlock where intentional Canvas disposal latched `sceneError` and Return to 3D could not recover.
- Validation: `npx tsc --noEmit` clean, `npm run lint` clean, `npx vitest run` 58/58 (6 new regressions: milestone-enables-save-flag, joint-prompt gating + ungated reset, reachedEnding save round-trip + Continue objective, dialogue line selection), `npm run build` clean. Browser CDP verification on the rebuilt production preview: guided-save Continue restored story mode, then three full 3D↔guided cycles — Return to 3D mounted the canvas every time with no stuck latch; Ilyas's first-meeting testimony renders on first visit; `hasSave` flips true after the first joint rotation.
- Limitations: a real GPU context loss mid-run drops to guided mode with a notice (by design); the one-retry remount is not exercised end-to-end (requires a real context loss).

## 2026-10-24T17:41:00+00:00 — Save-overwrite confirmation for Guided story mode

- Changed: `components/ui/TitleScreen.tsx` — both new-run entries ("New game" and "Guided story mode") now route through the same pending-mode confirmation instead of only New game; Guided story mode previously called `newGame("story")` directly and bypassed the overwrite guard.
- Why: Codex browser automation found the last save-protection gap — a Guided story mode click over an existing save discarded it without confirmation.
- Also: removed the stale limitation that the other two endings were only reach-tested via unit coverage — all three are now independently browser-reached.
- Validation: `npx tsc --noEmit` clean, `npm run lint` clean, `npx vitest run` 52/52, `npm run build` clean (exit 0 each). CDP browser check on the rebuilt production preview: Guided story mode shows "Start over? / Keep save" instead of starting, Keep save cancels and preserves `echo-save-v2`, Start over launches story mode. Fresh 390px screenshots of guided routing and expanded pause Signal help taken for layout review.
- Limitations: none new.

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
- Limitations: reduced-motion was code-verified (static title orbit, halted motion flags) plus earlier screenshot review.

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
