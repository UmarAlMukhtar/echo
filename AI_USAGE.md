# AI usage record

## Approved environment detailing — 2026-10-25T00:04:38+05:30

- Tool: Codex with Blender 4.5.3 LTS, headless CPU Cycles and standard Python.
- User direction: blockout approved; add detail while preserving the separate asset branch.
- Contribution: procedural architectural/prop detail, repeated mesh components,
  independent bridge groups, optimized material batches, collision GLB, three
  renders, independent asset validator and full object/size/integration reports.
- Checks: route and NPC clearance, bridge motion, collision closure/outward winding,
  GLB hierarchy/axes, byte-identical regeneration, file sizes and syntax.
- Corrections: closed mesh winding normalized for physics; duplicate corner posts
  removed after the optimized GLB round-trip render exposed dark overlap artifacts.
- Human review: blockout approved; detailed output awaiting any further feedback.
- Scope: assets and documentation only; no application/gameplay source changes.

## Environment blockout — 2026-10-24T23:40:00+05:30

- Tool: Codex with Blender 4.5.3 LTS running headlessly on CPU.
- Task: create an original compact environment blockout on an isolated asset branch.
- Assistance: inspected five user references, authored the deterministic Python
  scene generator, built three connected routes and movable bridge groups,
  rendered three layout views, and documented scale, axes, pivots and inventory.
- Checks: background startup + CPU render smoke test, actual-mesh route raycasts,
  GLB structure/names/axis validation and agent visual inspection of all previews.
- Corrections: tiny seam overlaps added after exact-boundary raycasts found cracks;
  presentation exposure/palette adjusted after inspecting the first renders.
- Human review: pending layout approval; detailing and integration have not begun.
- Scope: assets and documentation only; application and gameplay code untouched.

If maintaining this record, briefly document the actual contributions of whichever AI tools you use at Devin Hack Kochi. Add a row after each meaningful task or milestone. Keep summaries concise and omit secrets, private data, and full chat transcripts.

## Event build log

| Date and time with timezone | Tool / model, if known | Task | Assistance and affected files | Human review / corrections | Validation and result |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24T16:45:00+00:00 | Devin (Cognition AI) | Implemented the complete ECHO vertical slice: game design, all source code, tests, and docs | Designed narrative/mechanics; wrote `app/`, `lib/game/` (story, puzzle, save, store, city), `components/scene/*`, `components/ui/*`, `components/story/*`, `tests/game.test.ts`, `DESIGN.md`, `README.md` | Pending | `typecheck`, `eslint`, `vitest` (28 tests), `next build` all pass |
| 2026-10-24T17:00:00+00:00 | Devin (Cognition AI) | Browser playtest + fixes | Played through the build in a real browser (movement, camera, interactions, puzzle, decisions, endings, save/resume, story mode); fixed defects found | Codex browser automation — three defects found and fixed (blocked movement drift, reduced-motion title orbit, lax save validation) | `tsc`, `eslint`, `vitest` 48/48 |
| 2026-10-24T17:15:00+00:00 | Devin (Cognition AI) | Redesigned ECHO as an architectural signal-routing puzzle per Umar's four supplied art references | Wrote `lib/game/signal.ts` (joint/beam propagation), rewrote `city.ts` (floor union + energized tiles), `store.ts`, `District.tsx`, `Relay.tsx`, `CityScene.tsx`, `PlayerRig.tsx`, `StoryMode.tsx`, save v2; removed dial puzzle | Codex browser automation — stage 1 verified end-to-end, then two defects found and fixed (consequence panel dismissed early, arch camera clamp) | `tsc`, `eslint`, `vitest` 49/49, CDP browser verification |
| 2026-10-24T17:48:00+00:00 | Devin (Cognition AI) | Closed PR #2 review findings + mode-switch deadlock | `store.ts` persist/refresh + joint gating + reachedEnding, `save.ts` field, `story.ts` pickDialogueLines, `Overlays.tsx`, `CityScene.tsx`/`GameShell.tsx` listener cleanup + recoverable sceneError | Codex browser automation + Devin Review — six defects found and fixed | `tsc`, `eslint`, `vitest` 58/58, `next build`, CDP 3D↔guided cycle verification |
| 2026-10-24T17:56:00+00:00 | Devin (Cognition AI) | Element-scoped context-loss handling + save hardening | `CityScene.tsx` ContextLossWatcher (useThree, per-element listener, unmount cleanup), `StoryMode.tsx`/CSS `.story-notice` for guided fallback visibility, `save.ts` isWalkable+connectedToPlaza position check and reachedEnding validation | Codex browser automation — delayed mode-switch regression and save-validation gaps found and fixed | `tsc`, `eslint`, `vitest` 60/60, `next build`, live `WEBGL_lose_context`→guided fallback + retry-recovery + 4 rapid settled-state cycles via CDP |
| 2026-10-24T17:58:00+00:00 | Devin (Cognition AI) | Failed milestone writes surface feedback | `store.ts` persist uses `writeSave` result — failed write sets a notice while an older readable save keeps Continue | Codex browser automation — error-path defect found and fixed | `tsc`, `eslint`, `vitest` 61/61 (throwing-setItem regression), `next build` |
| 2026-10-24T17:41:00+00:00 | Devin (Cognition AI) | Routed Guided story mode through the save-overwrite confirmation | `TitleScreen.tsx` pending-mode state shared by both new-run buttons | Codex browser automation — bypass found and fixed | `tsc`, `eslint`, `vitest` 52/52, `next build`, CDP confirm/cancel verification |
| 2026-10-24T17:35:00+00:00 | Devin (Cognition AI) | Guided-mode accessibility + shared signal help | `stageGuide` helper, guided toolbar (objective/pause/return-to-3D/hints), 3D pause Signal help + stage reset | Codex browser automation — full 3D path, all three endings, guided replays, guided-mode accessibility gap found and fixed | `tsc`, `eslint`, `vitest` 52/52, production build, CDP guided-mode run to THE CITY REMEMBERS |


## Template preparation

This historical preparation note refers to the older template. It does not define Devin Hack Kochi's event rules or AI tool requirements.

On 10 October 2026, Codex prepared this documentation template from the organizer's supplied rules and checked the linked Luma page for the event name and dates. This covered `README.md`, `RULES.md`, `AGENTS.md`, `CHANGELOG.md`, `AI_USAGE.md`, `SUBMISSION.md`, `.gitignore`, and the pull request checklist. Agent validation covered local links, event consistency, required documents, and diff whitespace; organizer review is pending.

This preparation is separate from participant project implementation and participant AI usage during the event.

## Event documentation correction — 2026-10-24T21:53:05+05:30

- Tool: Codex.
- Task: correct the organizer-shared template to Devin Hack Kochi and clarify
  that the event has no major AI usage constraints.
- Affected files: `.github/pull_request_template.md`, `AGENTS.md`, `AI_USAGE.md`, `CHANGELOG.md`, `README.md`, `RULES.md`, `SUBMISSION.md`.
- Human review: pending maintainer review of this pull request.
- Validation: documentation diff, whitespace, and local Markdown link checks;
  no application code changed and no runtime checks were needed.
