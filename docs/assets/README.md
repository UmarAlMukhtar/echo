# Runtime Blender asset integration

Original approved assets from `UmarAlMukhtar/echo`, retrieved without merging the
asset branch or its application history. [DISTRICT.md](DISTRICT.md),
[DISTRICT_REPORT.md](DISTRICT_REPORT.md), and [PLAYER.md](PLAYER.md) preserve the
upstream handoff; their statements that integration was pending describe delivery
on the asset branch. This document describes the integrated application.

| Runtime file | Source commit | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| `public/models/echo-district.glb` | `2bc7f2b21f5dae981e127519999ae854870a1584` | 614080 | `cd5c1e3338a0a391c72d8fc910814afe4b24760d90748d62681d9d067f0e7d52` |
| `public/models/echo-district-collision.glb` | same map commit | 51772 | `43f03fd8c91155327f6c0364a721e402d9cac337af92f8f556155e043a318835` |
| `public/models/echo-player.glb` | `c62f4aea1dc52d7f8a8c4bc2b4f818f168c10957` | 214936 | `4bdcec284177bacd6b29075263038fa4a2de0fd75d3272e5f207caaab90b544b` |

All three were retrieved at character branch HEAD, where the map files are
unchanged. Runtime total: 880788 bytes (~860 KiB); no texture or decoder downloads.
10,838 environment triangles / six materials; 2,064 character triangles / four
materials. Collision export: 64 proxies, 768 instanced triangles, not rendered.

## Coordinates and controller

Both GLBs load at identity, scale 1: a meter stays a meter, +Y up, +Z player
forward. Map north is -Z. `PlayerRig` still owns horizontal position and facing;
it now samples `floorHeight` for feet/camera height. The character origin stays
between grounded feet; its old procedural bob is removed.

`scripts/district-colliders.mjs` loads the actual collision GLB with the installed
Three.js loader, asserts its hash and 64-proxy contract, and derives
`lib/game/district-colliders.json`. Nine slab/ramp/deck surfaces supply height
planes; other boxes/wedges supply conservative axis-aligned blockers. A 0.3 m
controller radius blocks props/rails. Movement substeps at 0.08 m prevent tunnelling.
There is no new physics dependency or hidden visible collision scene.

The three `PUZZLE_BRIDGE_01_GARDEN`, `PUZZLE_BRIDGE_02_DOCK`, and
`PUZZLE_BRIDGE_03_ARCHIVE` parents map respectively to stage1/2/3. The same
`bridgeOffset` drives their visual parent and corresponding collider offset.
Docked is the delivered transform; parked is 3 m lower and nonwalkable.
Bridge changes are immediate to keep visual and movement state synchronized.
A broken route/reset rescues an isolated player to the plaza.

Residents use the exact exported `NPC_SPAWN_01_MIRAI` (-12.9,.6,.8),
`NPC_SPAWN_02_DEVI` (12,0,1), and `NPC_SPAWN_03_ILYAS` (0,1.5,-11.5)
coordinates, checked against the actual model in tests. The six joint controls
are positioned in the new plaza/stair approaches; an archive receiver drives
the north bridge. Garden/dock/archive heights and entire clear centerlines are
covered by navigation tests. The overlook is on the south plaza edge.

Camera blockers derive from the supplied tall collision proxies. Distant asset
arches/stairs remain nonplayable. The character's collision capsule remains
independent of coat/scarf/lantern bounds.

## Character animation and cleanup

`Keeper` skeleton-clones the cached GLB once per mounted actor. A fresh mixer is
created inside the mount effect and stopped/uncached on cleanup, including React
Strict Mode's setup/cleanup/setup cycle. Cached shared geometry/materials are
not disposed by individual actors. Player materials and vertex colors are kept.

Idle (2.4 s) and Walk (1 s) repeat with short crossfades. An interaction counter
starts the 1.2 s Interact clip once, then returns to Idle/Walk. No root motion
moves the controller. A remount ignores old interaction events. Reduced motion
keeps the authored Walk running at 1× while moving, with a quiet neutral Idle
pose when stopped. Normal motion plays Walk at 1.8× for a brisker step rhythm
and keeps the authored Idle breathing and scarf/lantern sway. Essential footstep
feedback remains visible when the OS requests less motion. Imported map materials are cloned before choice tint
changes so cached assets are not globally recolored.

## Saves, fallback and limits

v3 saves use `echo-save-v3`. Valid v2 data is read without deleting the original;
fragments, NPC conversations, choices, ending progress and mode survive. Dock
rotations gain one quarter turn for the east-facing layout; old positions return
to the entry because the former map had incompatible coordinates. A new v3
milestone is written normally; replay intentionally clears both versions.

Guided mode uses the same signals, stage reset, choices and ending rules without
loading the models. WebGL loss or failed model loads gives visible fallback
feedback and a Return-to-3D retry. Save validation still handles corrupt/unavailable
storage. No audio is required.

Limit: custom kinematic walking uses floor planes and conservative proxy bounds,
not rigid-body physics; there is no jumping/falling or riding a moving bridge.
The stair collision wedges intentionally smooth 0.15 m visible risers. This
integration does not copy Blender source files/previews into the runtime branch.
