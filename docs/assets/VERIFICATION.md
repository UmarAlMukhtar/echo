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
that build was canceled before it became ready. The Git preview subsequently
built successfully in 59 seconds, generated all five static pages, and was explicitly classified Preview. At setup time no
protection was changed and no unrelated project was modified.

### Hosted verification — 2026-10-25T03:47:29+05:30

- Public URL: [https://echo-9z9tk1hfx-umar-al-mukhtar-s-projects.vercel.app/](https://echo-9z9tk1hfx-umar-al-mukhtar-s-projects.vercel.app/).
- Exact deployed commit: `590b8e96676c3df5146fd365d5031abb524eb0cf`; game code/assets are identical to `d689735ef2af27893f6563f51e8a44a6df566496`. Deployment ID: `dpl_AFcG3qFD5g7PhjR84nK9oatkk9n5`.
- Real hosted browser input: fresh 3D run, WASD movement, E to align garden joint, imported bridge crossing, Mirai dialogue and open choice. Reload/Continue retained that save/location. Guided mode then completed dock/archive stages, all residents, reveal, remaining choices and THE CITY REMEMBERS; Return to 3D rendered the completed district and movement worked. No state injection. The hosted browser log contained no warnings/errors during these flows.
- Public access: after explicit owner approval, added a deployment protection exception for **only this exact hostname**. Vercel Authentication remains enabled for other deployments. An anonymous request (no cookies, credentials or bypass token) returned the ECHO HTML with HTTP 200 and no sign-in redirect. All three hosted GLBs returned HTTP 200 and matched the delivered SHA-256 values and byte sizes.
- Scope: the other two endings and the complete 3D route were independently checked on the local production/integration build as recorded above, not replayed again on this host. No physical mobile/gamepad testing, no production promotion, no merge, no event submission. The immutable public URL targets the tested deployment even if later documentation commits trigger other Git previews.

### Walking animation polish — 2026-10-25T04:11:13+05:30

- Owner approved visible walking feet/arm swing, brisker normal steps, gentle authored idle motion and a calmer reduced-motion walk.
- Root cause: the animation driver selected Idle and stopped the entire mixer under Reduced Motion, including essential locomotion. It now plays the original Walk clip while moving in both modes, with 1.8× cadence normally and 1× under Reduced Motion. Resting reduced motion resets to the neutral Idle pose; normal idle breathing/scarf/lantern motion and the one-shot interaction are retained. All GLB bytes, movement/collision behavior and save data remain unchanged.
- Test-first: existing/new real-GLB tests failed on the frozen Walk branch and zero clip progression before the fix. Final checks: 77 tests, lint, typecheck and production build pass.
- Local production browser: real held WASD input and captured frames show alternating feet in both motion modes. E still changes the garden beam/bridge, Pause blocks movement, reload/Continue restores the saved puzzle/player state, and guided→3D remount returns to a responsive keeper. Browser warning/error log is empty. A GIF was assembled from actual captured browser frames, not generated imagery.
- Deployment: this section records local production proof; the previous public immutable preview remains the earlier release until the new Git preview is published separately.

### Stable public animation preview — 2026-10-25T04:33:02+05:30

- Stable URL: [Play ECHO](https://echo-git-codex-blender-integration-umar-al-mukhtar-s-projects.vercel.app/). Owner explicitly approved making this branch hostname public for the animation update and future updates. Added only that hostname to the protection exceptions; project Vercel Authentication remains enabled, and the earlier fixed public hostname remains intact.
- Hosted implementation: `4bccde932620e0eb4e1659334369f8f211e065ab`, preview deployment `dpl_H85wgZRvtoMP6dyiF82c36H2Aovp`, Ready. Actual hosted held-key screenshots showed calmer reduced-motion footsteps and brisk normal footsteps. E completed the garden signal, reload/Continue restored that puzzle state, and the browser warning/error log was empty.
- Anonymous access after publication: the exact stable URL returned HTTP 200 with ECHO HTML and no redirect; all three model files returned HTTP 200 without redirect and matched their delivered SHA-256 values. No cookies, credentials or bypass tokens were used in this check.
- README and SUBMISSION now point at the stable link and record the animation implementation SHA and 77-test result. This follow-up only changes documentation; no application or model changes, production promotion, merge or event submission. Physical mobile/gamepad testing remains unperformed.
