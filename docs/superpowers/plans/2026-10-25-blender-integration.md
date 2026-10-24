# Blender integration plan

Spec: the user's map/character integration brief and docs/assets contracts. Execute locally; no Devin agent usage or automatic merge.

1. Import the three hash-verified runtime GLBs and integration notes only. Derive a compact collision manifest from the actual collision GLB (floor planes, obstacle bounds, named bridge parent). Test floor heights, route clearance, bridge gates, anti-tunnelling and safe resets before replacing flat navigation.
2. Adapt six joint positions to the approved map while retaining the three-stage beam algorithm. Drive named bridge visual/collision offsets from the same completed-stage state. Preserve three NPCs/choices/endings/guided mode. Migrate v2 saves without losing story progress, resetting only incompatible position and adapting dock rotations.
3. Replace the player visual with a skeleton clone and in-place Idle/Walk/Interact playback. Preserve camera-relative input; add terrain height, collision-derived camera clearance, animation cleanup and reduced motion. Test actual exported clips and node contracts.
4. Run tests, lint, typecheck and production build. Play the full route, bridge reset, stairs, NPC interactions, consequences, save/reload, replay and guided mode in the browser. Record evidence and limitations; commit and push the integration branch without merging.

Scope reaches: public/models, scripts, lib/game/{city,signal,story,save,store}, scene components, guided place descriptions, tests, README/CHANGELOG/AI_USAGE, asset provenance. No new runtime dependencies.

Ruling: use this clean, task-owned local checkout on codex/blender-integration based on the latest pushed gameplay (358d5cb), without another worktree. No existing local edits or asset-branch merges.

Progress: baseline 61 tests passed. Runtime GLBs and source notes retrieved from c62f4aea1dc52d7f8a8c4bc2b4f818f168c10957. Implementation pending.

Progress: Tasks 1–3 implemented and checked. 73 tests, typecheck, lint, collision manifest check and production build passed; production replay pending. Full 3D route completed in browser to The City Remembers, with raised routes, three NPCs, six joints, choices, local save and guided reset/rescue. Ruling: make reset one state update instead of cycling through intermediate solved states, to preserve truthful feedback. Independent whole-change review found one important issue (rejected GLB cache prevents retry); repaired with a real loader-cache regression that fails when cache clearing is removed.

Progress: Task 4 local verification complete: 73 tests and production checks pass, all three endings browser-reached, save/reload/replay/guided/3D/camera/missing-model recovery checked. Final source changes show the existing fallback notice on title and clear it on explicit retry; 74 tests and final production checks passed. Final documentation commit follows. Hosted preview requires Vercel team approval; the local preview is available. No automatic merge.
