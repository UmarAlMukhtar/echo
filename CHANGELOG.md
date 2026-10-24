# Change log

## 2026-10-25T04:33:02+05:30 — Publish the stable ECHO animation preview

- Changed: with explicit owner approval, made only the stable codex/blender-integration preview hostname public for current/future branch updates. Updated README and SUBMISSION links, implementation SHA (4bccde9), 77-test count, verification evidence and AI usage.
- Validation: hosted preview Ready; real-keyboard frames showed both walking cadences, E solved the first stage and reload/Continue restored it with no browser warnings/errors. Anonymous exact-URL HTML and all three GLB requests returned HTTP 200 without redirect; model hashes matched. Documentation whitespace/local-link checks passed.
- Limits: documentation/publication only; prior 77-test/lint/typecheck/build results apply to the unchanged animation code. Vercel Authentication remains enabled elsewhere; no production promotion, merge, unrelated project change, event submission or physical mobile/gamepad testing.

## 2026-10-25T04:11:13+05:30 — Make keeper footsteps visible and quicken the normal gait

- Changed: `lib/game/keeper-animation.ts` now plays Walk while moving even under Reduced Motion. Normal cadence is 1.8×; reduced cadence is 1× with a neutral still pose when stopped. Existing authored breathing, scarf/lantern sway and one-shot interactions are reused. Added real-GLB leg/arm movement, cadence and quiet-pose tests and updated README/design/integration/AI usage documentation.
- Why: OS Reduced Motion selected Idle and froze the mixer, making the keeper slide without stepping. The owner approved visible leg/arm movement with a calmer reduced-motion variant.
- Validation: test-first failures reproduced the freeze and absent cadence; 77 tests, typecheck, lint and production build pass. Local production browser held-key frames show both walking modes; relay interaction, pause movement blocking, save/reload and guided→3D remount passed with no browser warnings/errors.
- Limits: no GLB, movement controller, collision, puzzle or save changes. Hosted preview publication is checked separately; no physical mobile/gamepad testing and no merge.

## 2026-10-25T03:47:29+05:30 — Verify and publish the scoped ECHO preview

- Changed: recorded the working public demo URL and exact deployment SHA in README, SUBMISSION and integration verification; added actual hosted-check and owner-approval evidence to AI_USAGE.
- Validation: Vercel Git preview `590b8e96676c3df5146fd365d5031abb524eb0cf` reached Ready in 59 seconds. Real hosted WASD/E completed garden routing/bridge/NPC/choice; reload retained progress. Guided UI completed dock/archive/reveal/remaining choices and The City Remembers, then returned to a moving 3D keeper. Browser warnings/errors were empty. Anonymous HTML plus all three model files returned HTTP 200; model hashes match the immutable handoff. Documentation whitespace/local-link checks passed.
- Access: owner explicitly approved public access to the exact delivered hostname; added only that domain exception. Other previews retain Vercel Authentication. No production promotion, merge or unrelated project changes.
- Limits: no new application code (prior 74-test/lint/typecheck/build evidence); only one ending was replayed on this host, with all three checked locally. No physical mobile/gamepad testing; event submission not performed.

## 2026-10-25T03:39:39+05:30 — Configure ECHO Git previews and refresh demo handoff

- Changed: created a separate ECHO Vercel project connected to UmarAlMukhtar/echo, with the Next.js preset, Node.js 24 and main as its production branch. Added preview setup/status links to README, and corrected SUBMISSION's stale implementation SHA, 49-test count and procedural-only asset claim. Updated integration verification and AI usage with actual access/setup evidence.
- Why: the owner authorized publishing the committed integration. The connector still returned 403 after consent, while the signed-in browser worked. Vercel classified its manual Preview action as Production; that build was canceled before readiness. Git branch previews will be used instead.
- Validation: observed project settings, exact source d689735 and canceled status in Vercel; documentation whitespace/local-link checks. Application code is unchanged, so the previous 74-test/build results remain the implementation evidence; hosted gameplay checks are pending.
- Limitations: no public/hosted readiness claim yet, no protection changes, no automatic merge or event submission.

## 2026-10-25T02:25:20+05:30 — Final production verification and title fallback feedback

- Changed: title screen renders the existing notice and explicit 3D retries clear stale feedback so a first-load model failure is explained before a run starts. Added final production replay/recovery evidence to integration documentation.
- Why: an intentionally missing map correctly fell back and retried after restoration, but its title menu did not show the reason for the 3D switch.
- Validation: 74 tests, typecheck/lint, collider data check and fresh production build passed after this feedback change. Actual production UI reached all three endings, retained guided/3D saves and replay protection, and recovered from the induced missing-model case. Hosted preview remains blocked on Vercel team-access approval; local production preview is verified.
- Limitations: no physical mobile/gamepad test; custom kinematic collision model as documented. No merge.

## 2026-10-25T02:15:58+05:30 — Integrate approved Blender district and memory keeper

- Changed: imported the three checksum-verified runtime GLBs and source integration notes; replaced procedural map/player visuals, kept the existing camera-relative controller, and added floor-height sampling from nine exported slab/ramp/deck surfaces and 64 collision proxies. Three named bridge parents share the exact gate offset used by navigation; NPC spawns match exported empties. Six joints use the new approved layout; stories, choices, three endings and guided mode remain.
- Added: in-place Idle/Walk/one-shot Interact animation, skeleton clone and mount/cleanup-safe mixer lifecycle, per-stage reset with honest rescue feedback, v2→v3 save migration preserving narrative progress, failed-model fallback and rejected GLB cache clearing for retry. Imported materials are cloned before warm/cold choice changes. Removed the obsolete procedural relay and old skyline/floor data.
- Why: integrate the user's approved original art without replacing ongoing gameplay. All implementation continued locally in Codex after Devin usage was exhausted; no new Devin work was requested.
- Validation: baseline 61 tests passed. Full real-keyboard 3D playthrough crossed all three bridges/stairs, rotated all six joints, heard all three residents, made all-open choices and reached The City Remembers. Browser reload restored dock progress; guided reset rescued the player and returned to 3D. New navigation/asset/animation/migration/reset tests and focused transient-load retry regression cover the changed contracts. Final production checks and replay results are recorded in docs/assets/VERIFICATION.md.
- Limitations: custom kinematic floor/obstacle navigation, no rigid-body/jump physics or moving-bridge riding; stairs use smooth collision wedges. Legacy coordinates restart at entry while story progress survives. Hosting is reported separately from local preview proof. Human review pending; no merge.

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
