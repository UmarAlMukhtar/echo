# Integration verification

Checks and browser evidence for the Blender integration are recorded here after
execution. This is automated Codex verification, not human approval.

- Baseline: latest pushed gameplay `358d5cbc4fbee6ad4b0181a5c8e05808f5dbdfb6`, 61 tests passed before integration.
- All three delivered model SHA-256 values match the supplied immutable handoff.
- Independent whole-change code review found one important cache retry bug; repaired and reproduced as a failing-then-passing loader regression.
- Final automated checks: `npm test` 73/73 passed; `npm run typecheck`, `npm run lint`, `node scripts/district-colliders.mjs --check`, and `npm run build` passed. The production build generated all five static pages; `/` first-load JS is 120 kB.
- Transient-load regression: removing cache clearing reproduced the cached failure; restoring it reloads both URLs successfully.
- Production-browser replay results: pending final pass.

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
