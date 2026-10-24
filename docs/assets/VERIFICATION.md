# Integration verification

Checks and browser evidence for the Blender integration are recorded here after
execution. This is automated Codex verification, not human approval.

- Baseline: latest pushed gameplay `358d5cbc4fbee6ad4b0181a5c8e05808f5dbdfb6`, 61 tests passed before integration.
- All three delivered model SHA-256 values match the supplied immutable handoff.
- Independent whole-change code review found one important cache retry bug; repaired and reproduced as a failing-then-passing loader regression.
- Final automated checks: `npm test` 74/74 passed; `npm run typecheck`, `npm run lint`, `node scripts/district-colliders.mjs --check`, and `npm run build` passed. The production build generated all five static pages; `/` first-load JS is 120 kB.
- Transient-load regression: removing cache clearing reproduced the cached failure; restoring it reloads both URLs successfully.
- Production-browser replay: The City Remembers restored from the completed 3D save; fresh guided replays reached The Quiet City and The Watcher. Replay confirmation, guided save/reload, completed-ending persistence, 3D/guided remounts, mouse orbit and camera-relative movement passed. The production playtest tab reported no console warnings/errors during these normal flows.
- Recovery test: temporarily removed the map file on a separate local origin, observed the loader failure/fallback, restored the byte-identical file, and used Return to 3D to render the actual district again. The induced loader errors belong to that isolated recovery tab, not the normal playthrough. This also exposed missing title-screen feedback; the title now displays the existing notice, and explicit 3D retry clears stale fallback feedback.

## Browser work already completed

On the local development build with actual imported models, real WASD and E input
completed garden, dock and archive routes, all six joint alignments, all three
resident dialogues/clues and all-open choices to THE CITY REMEMBERS. Ascending and
descending both stairs, imported rail/prop/gap blocking, visible keeper orientation,
feet and animations, first Ilyas testimony, immediate overlay movement freeze,
local reload/Continue, stage reset/rescue and guided↔3D transitions were exercised.
No store injections or direct puzzle-state writes were used for the playthrough.

A development-only disposed-mixer error was reproduced and fixed by constructing
the animation driver in the mount effect. It was rechecked after a fresh reload.
The old title screenshot/initial error logs are not evidence of final production state.

## Practical limits

Navigation is a small kinematic controller using the collision export, not a
rigid-body simulation. The ramp proxies smooth the visible stair risers. No
mobile physical-device or gamepad testing has been performed. A local URL is
available only while the preview process runs; hosting/claim status is reported
separately. No automatic merge or unrelated repository changes.

## Preview access

Local production URL: `http://127.0.0.1:43100/` while the preview process runs.
The Vercel connector continued to return team-scope 403 after the owner's
consent. The signed-in browser provided access, so Codex created the separate
ECHO project, connected only UmarAlMukhtar/echo, selected Next.js and Node.js 24,
and confirmed that `main` remains the production branch. The manual action
labeled Create Preview Deployment incorrectly returned a Production build;
that build was canceled before it became ready. Git preview deployment of the
integration branch is the next verification step. No protection was disabled,
credentials bypassed, or unrelated project changed.
