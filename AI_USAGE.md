# AI usage record

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

## Blender application integration — 2026-10-25T02:15:58+05:30

- Tool: Codex, running locally; one independent Codex code review. No new Devin agent calls. The previous Devin monitor was deleted at the user's request to stop using its exhausted quota.
- Task: integrate the approved map and animated keeper from the supplied immutable Git commits into the latest pushed gameplay branch (base `358d5cbc4fbee6ad4b0181a5c8e05808f5dbdfb6`).
- Contribution: runtime imports/provenance, derived collider manifest, raised-route navigation, bridge gates, new joint/NPC layout, skeleton animation/lifecycle, save migration, reset feedback, model-error fallback/retry and corresponding tests/docs. No php2shell-live changes and no automatic merge.
- Corrections from actual checks: fixed Strict Mode reuse of a disposed mixer, removed a problematic in-Canvas HTML loading portal, made stage reset atomic so its final feedback is truthful, and cleared rejected GLB cache entries after the independent review found retry reused the error.
- Verification: real UI/WASD/E browser playthrough plus automated project checks; see [integration verification](docs/assets/VERIFICATION.md). Human design/code review remains pending; automated review is not human approval.

- Final production review: all three endings reached through real UI; guided save/reload and 3D recovery checked. A controlled missing-map case confirmed cache retry and revealed absent title feedback; Codex added the existing notice to the title. 74 tests, typecheck, lint and production build passed. Explicit retry also clears stale fallback feedback. Hosted preview requires Vercel team authorization (403); no hosted success claimed.

## Hosted preview preparation — 2026-10-25T03:39:39+05:30

- Tool: Codex, using the owner's signed-in Vercel browser after the connector continued to reject team scope with 403 despite consent.
- Contribution: created the separate ECHO project, connected its existing GitHub repository, configured Next.js/Node.js 24 and confirmed main as the production branch. Canceled a manual build that Vercel classified as Production despite its Preview action label. Prepared Git preview instructions and corrected stale submission art/test/SHA information. No application code or php2shell-live changes.
- Validation: settings and cancellation were observed in Vercel; documentation whitespace/link checks. Hosted gameplay verification remains a separate next step. Human review and event submission remain pending; no merge.
