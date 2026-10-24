# ECHO — Memory District blockout

**Stage: layout review required.** This is an original spatial proposal, not the
approved detailed asset. Do not integrate it into the live game yet. Detailing,
final repeated-mesh optimization and the production GLB follow layout approval.

## Layout

One 12 × 10 m plaza serves three nearby memory platforms. Lilac bridges with mint
center stripes identify the three independently movable parts. All are docked
in the review scene; no intended route requires jumping.

| Destination | Platform center, Blender meters | Walking height | Connection |
| --- | --- | --- | --- |
| Garden / Mirai | (-13, 0) | 0.60 m | West stair: 4 × 0.15 m; bridge B01 |
| Dock / Devi | (12, -1) | 0 m | Level bridge B02 |
| Archive / Ilyas | (0, 12) | 1.50 m | North stair: 10 × 0.15 m; bridge B03 |

Playable bounds: X -16…15 m, Y -5…14.5 m (31 × 19.5 m). Bridges and stairs
are 2.8 m wide. Each NPC has reserved interaction space; the simple dark figures
are scale placeholders, not character designs. Entry is on the south edge of the
plaza. The low central relay mass leaves room to circulate on either side.

The detached stair fragment and distant arch northwest of the plaza are scenery.
They have no connection, navigation surface or collision proxy. All intended
walking routes physically connect in the docked state. Rotating or moving a
bridge away intentionally opens a gap; gameplay must gate crossing while undocked.

## Reproduce

Verified using the official **Blender 4.5.3 LTS Linux x64** portable build, running
headlessly with Cycles on CPU. No display server or GPU is required. Background
startup and a separate 64 × 64 Cycles smoke render both succeeded before generation.

From the repository root:

```bash
blender --background --factory-startup --threads 8 --python-exit-code 1 \
  --python assets/echo_memory_district/generate_district.py
```

Use `-- --output /absolute/output/path` to write elsewhere, or add
`--skip-renders` after `--` for geometry and report only. The script recreates the
scene from scratch. Run it in a fresh Blender process; it clears the current scene.
No downloads, external add-ons, textures or application dependencies are used.
Geometry and layout are deterministic; PNG bytes can vary with Blender/CPU version.

Outputs: editable `echo_district_blockout.blend`, review-only
`echo_district_blockout.glb`, three PNG renders and `blockout_report.json`.
The JSON records every object name, parent, collection, origin, triangle count,
material names and generated file sizes. File sizes are bytes; triangles are
triangulated face counts, not polygons or estimated draw calls.

## Integration contract

- Scale: **1 unit = 1 meter**. Asset root `ECHO_DISTRICT_ROOT` is at plaza center
  on the walking surface, (0, 0, 0), with identity rotation and scale.
- Blender: +X east, +Y north, +Z up. GLB is right-handed Y-up; exporter maps
  `(x, y, z)` to `(x, z, -y)`. No additional 90-degree root rotation is needed
  when loading the GLB into Three.js.
- Static mesh origins are their modeled centers; transforms have applied scale.
  Review labels, cameras, lights and mint presentation ground are excluded from GLB.
- Three movable parents are `PUZZLE_BRIDGE_01_GARDEN`,
  `PUZZLE_BRIDGE_02_DOCK`, `PUZZLE_BRIDGE_03_ARCHIVE`. Each owns its deck,
  stripe and collision proxy. Move the parent, not its deck alone. Local rotation
  is Blender Z / GLB Y. Bridge origins are at the near bank, deck surface centerline:

| Bridge | Blender origin (m) | GLB origin (m) |
| --- | --- | --- |
| 01 Garden | (-8, 0, 0.6) | (-8, 0.6, 0) |
| 02 Dock | (6, -1, 0) | (6, 0, 1) |
| 03 Archive | (0, 8, 1.5) | (0, 1.5, -8) |

| NPC spawn empty | Blender feet origin (m) | GLB feet origin (m) |
| --- | --- | --- |
| NPC_SPAWN_01_MIRAI | (-12.9, -0.8, 0.6) | (-12.9, 0.6, 0.8) |
| NPC_SPAWN_02_DEVI | (12, -1, 0) | (12, 0, 1) |
| NPC_SPAWN_03_ILYAS | (0, 11.5, 1.5) | (0, 1.5, -11.5) |

- `COLLISION` contains simple boxes and closed stair wedges, hidden in the saved
  Blender viewport and renders. Toggle that collection to inspect them. Collision
  proxies are **not embedded in the review visual GLB**. Retain bridge proxy
  parenting when later exporting or converting physics shapes.
- Current gameplay uses a 2D floor-rectangle union and a fixed player height.
  This original layout and raised stairs do not match that collision map. A later
  integration task must update movement, floor heights, NPC coordinates and puzzle
  gates; this asset branch intentionally makes no such changes.

## Verification and limits

The generator raycasts actual floor/deck meshes every 0.05 m along all three
route centerlines and at ±0.30 m offsets. It rejects missing floor and rises above
0.151 m, and asserts three bridge parents with one attached proxy each. This is a
geometry check, not an in-engine navigation or physics test. There are no final
edge barriers, foliage, decorative trim, gameplay animation or baked lighting.
Lilac/peach illumination and the mint atmosphere are Blender presentation lighting;
the GLB includes shared flat PBR materials, not the preview's lighting setup.

Reference direction: five user-supplied images, used for palette, floating
architecture, arches and bridges. No source image, copied mesh, texture or
third-party environment asset is included in the distributable.

## Review views

- `previews/01_game_three_quarter.png`: elevated game composition, all platforms.
- `previews/02_top_layout.png`: labeled plan, bridge positions and physical seams.
- `previews/03_reverse_connections.png`: lower opposing view of stair/bridge joints.

Review the layout, travel distances, heights and NPC locations before detailing.
