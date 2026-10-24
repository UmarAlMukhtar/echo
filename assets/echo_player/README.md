# ECHO — wandering memory keeper

Original playable-character asset, separate from the map. A broad round cowl,
single mint face lens, short slate-lilac coat, peach scarf and hanging brass
lantern provide a readable silhouette against pale architecture. Boots remain
visible. All geometry, rigging and motion are generated from scratch.

- `echo-player.glb`: browser-ready, self-contained character with Idle/Walk/Interact.
- `echo-player.blend`: editable mesh, 18-bone rig, three actions and named NLA tracks.
- `generate_player.py`: reproducible Blender 4.5 LTS generator; no downloads/add-ons.
- `INTEGRATION.md`: dimensions, axes, materials, animation names and R3F usage.
- `player_report.json`: geometry/file metrics, bounds, bones and source pose checks.
- `verify_blender.py`: re-import validation and rendered runtime poses.
- `verify_three.mjs`: actual Three.js loader, skinning and animation validation.
- `blender_validation.json`, `three_validation.json`: verification results.

From the repository root, with Blender 4.5 LTS and Python/Node available:

```bash
blender --background --factory-startup --threads 8 --python-exit-code 1 \
  --python assets/echo_player/generate_player.py
blender --background --threads 8 --python-exit-code 1 \
  --python assets/echo_player/verify_blender.py
node assets/echo_player/verify_three.mjs
```

The Node check uses the repository's installed `three` package. It was also tested
with an isolated Three.js 0.180.0 installation, with no application packages or
source files changed. Set `ECHO_THREE_PACKAGE` to that installation's package.json
to run the check against an isolated package instead.

Generator arguments after `--`: `--output /absolute/path`, `--skip-renders`.
Use a fresh Blender process: the generator clears its scene. Its output is
deterministic for the tested build; PNG pixels can vary across rendering hardware.
The Blend opens in Idle at frame 1. To inspect another action, keep NLA tracks
muted and assign the desired action in the Action Editor. Three named NLA tracks
are used to export the clips separately; they are muted in the saved source so
the preview does not stack all actions.

## Previews

| File | View |
| --- | --- |
| `previews/01_front.png` | Front |
| `previews/02_side.png` | Side |
| `previews/03_game_three_quarter.png` | Intended elevated game view |
| `previews/04_glb_roundtrip.png` | Re-imported runtime GLB |
| `previews/05_interact_pose.png` | Interact at its midpoint |
| `previews/06_game_distance.png` | Runtime GLB at the existing camera's normal orbit |

The first three previews are 1200 × 1200. Verification previews use 900 × 900,
and the normal-distance view uses 1200 × 675. The ivory studio floor, cameras and
lights are presentation only and are not in the runtime GLB. Character materials
remain exactly four. No environment mesh is embedded in the character.

Application/gameplay code remains unchanged. The map is separately located in
`assets/echo_memory_district/`, last changed at
`2bc7f2b21f5dae981e127519999ae854870a1584`, on `asset/echo-memory-district`.
