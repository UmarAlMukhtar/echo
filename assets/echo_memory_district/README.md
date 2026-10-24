# ECHO — detailed Memory District asset

The approved blockout from commit `e8effb8` is now detailed. Platform positions,
walking heights, three routes, bridge pivots and NPC spawn locations are preserved.
Application and gameplay code remain untouched.

## Contents

- `generate_district.py`: deterministic Blender 4.5 LTS scene generator.
- `echo_district.blend`: editable source, shared repeated components and collision proxies.
- `echo_district.glb`: optimized visual geometry, three movable bridge parents and three NPC spawn empties.
- `echo_district_collision.glb`: simple boxes and closed stair wedges, with matching bridge parents.
- `previews/`: three 1920 × 1440 CPU Cycles renders, including an elevated game view.
- `ASSET_REPORT.md`: file sizes, triangles, materials, named runtime objects and export hashes.
- `asset_report.json`: full object inventory, local/world origins, parents, materials and checks.
- `validation_report.json`: geometry clearance, NPC spacing and independent bridge motion checks.
- `validate_asset.py`: independent standard-library GLB structure and collision validation.

The visual export batches static geometry by district area and material. Each
bridge is batched independently under its own parent. The Blend retains the
individual modeled components and linked mesh data; final render/export batches
are in the hidden `EXPORT_BATCHES` collection. There are no image textures,
external model dependencies, Draco decoder requirements, rigs or animations.

## Detailed design

The plaza has stone paving, a circular mosaic, signal traces and an astrolabe relay.
Layered foundations, recessed arch motifs, cornices, inset windows and faceted
roofs establish the floating district. The garden adds planters, a low-poly tree
and a bench; the dock has mooring bollards, deck joints and an open station; the
archive has bookshelves, seats and an arched memory portal. Handrails, balusters
and bridge numeral inlays use repeated components and shared materials.

Ivory and peach stone, lilac recesses, mint accents, muted brass and pale memory
glow are the six runtime materials. Dark NPC figures are preview scale stand-ins,
not included in the runtime visual GLB. `MAT_Ink` is used by those stand-ins and
collision geometry only. Replace the three spawn empties with actual characters.

## Approved layout and scale

**1 Blender unit = 1 meter.** All intended routes connect in the exported docked
state. No jump is required. Playable bounds remain X -16…15 m, Y -5…14.5 m
(31 × 19.5 m). Bridge and stair decks are 2.8 m wide. Railings leave the approach
lanes open. Tested route centerlines span a 1.8 m corridor, with a 0.3 m-radius,
1.7 m-tall character and maximum 0.15 m stair risers. Every NPC spawn has a 1.2 m
radius clear of hard obstacle proxies.

| Destination | Platform center, Blender XY (m) | Walking height | Connection |
| --- | --- | --- | --- |
| Garden / Mirai | (-13, 0) | 0.60 m | West stair: 4 × 0.15 m; bridge 01 |
| Dock / Devi | (12, -1) | 0 m | Level bridge 02 |
| Archive / Ilyas | (0, 12) | 1.50 m | North stair: 10 × 0.15 m; bridge 03 |

The southern plaza opening is the entry. Detached stairs and the distant arch
northwest of the district are nonplayable scenery, physically separate from the
routes and without collision. Platforms have edge rails, with intentional entry
and bridge openings. Moving a bridge away intentionally opens a gap; gameplay
must prevent crossing while undocked and handle characters standing on a bridge.

## Axes, origins and movable objects

`ECHO_DISTRICT_ROOT` has identity rotation/scale at the plaza walking surface:
(0, 0, 0). Blender uses +X east, +Y north and +Z up. GLB uses right-handed Y-up;
the exporter maps `(x, y, z)` to `(x, z, -y)`. Load with Three.js GLTFLoader without
adding another 90-degree rotation. Apply the same root transform to both exports.

| Bridge parent | Blender near-bank origin (m) | GLB origin (m) |
| --- | --- | --- |
| PUZZLE_BRIDGE_01_GARDEN | (-8, 0, 0.6) | (-8, 0.6, 0) |
| PUZZLE_BRIDGE_02_DOCK | (6, -1, 0) | (6, 0, 1) |
| PUZZLE_BRIDGE_03_ARCHIVE | (0, 8, 1.5) | (0, 1.5, -8) |

Bridge origins are centered across the near bank on the deck surface. Rotate
local Blender Z / GLB Y, or translate the parent. All deck, trim, numeral and
railing geometry follows that parent. In the collision export each matching
parent owns its deck proxy and two rail proxies. Synchronize the bridge transform
in both exports; never move a visual deck or a physics shape alone.
For bridge-specific color feedback, clone that bridge's shared mint material
before editing it; changing the shared material recolors other district elements.

| NPC empty | Blender feet origin (m) | GLB feet origin (m) |
| --- | --- | --- |
| NPC_SPAWN_01_MIRAI | (-12.9, -0.8, 0.6) | (-12.9, 0.6, 0.8) |
| NPC_SPAWN_02_DEVI | (12, -1, 0) | (12, 0, 1) |
| NPC_SPAWN_03_ILYAS | (0, 11.5, 1.5) | (0, 1.5, -11.5) |

Editable static mesh origins are modeled component centers with applied scale.
Runtime `VIS_` batches use sector origins: plaza (0,0,0), garden (-13,0,0.6), dock
(12,-1,0), archive (0,12,1.5), scenery (-9,10,0), in Blender coordinates. Bridge
batches use their parent origin. Vertex coordinates are relative to those origins.
Every `VIS_` node includes a `source_objects` custom property identifying its
editable components. The JSON inventory lists both source and export objects.

## Collision integration

The collision GLB is data for physics integration; do not display its meshes.
Its `COL_` nodes are simple boxes or closed stair wedges. It includes floor slabs,
bridge decks and rails, stair guards, tower/arch posts, planters, benches, shelves,
bollards and relay obstacles. Tiny trim, books and canopy details share their
larger obstacle proxy. There is no automatic collider convention imposed on an
engine: use the names and geometry to create static/kinematic physics shapes.

In the Blend, toggle `COLLISION` to inspect wire proxies. Toggle `EXPORT_BATCHES`
to inspect the production batches, while hiding the editable visual collections
to avoid overlapping duplicate geometry. Preview labels, characters, cameras,
lights and mint ground are excluded from runtime exports.

**The existing game uses a flat floor-rectangle union and fixed player height.**
This original layout and its raised routes require a separate integration change
to floor heights, collision maps, NPC coordinates and puzzle gates. This branch
supplies the asset and integration contract; it does not change that controller.
Blender preview lighting and mint atmosphere must also be set up in the engine.
The GLB contains PBR materials and a subtle emissive memory core, not baked lights.

## Reproduce and verify

Verified on the session's Linux x64 execution host with official Blender 4.5.3
LTS, headless CPU Cycles. Background startup and a separate 64 × 64 CPU render
were tested before the blockout. No display server or GPU is required.

From the repository root:

```bash
blender --background --factory-startup --threads 8 --python-exit-code 1 \
  --python assets/echo_memory_district/generate_district.py
python3 assets/echo_memory_district/validate_asset.py
```

Append `-- --output /absolute/output/path` to generate elsewhere. Add
`--skip-renders` after `--` to generate geometry/reports without re-rendering.
Run in a fresh Blender process: the script clears its current scene. No downloads,
external add-ons or application packages are needed. Layout, meshes and exports
are deterministic for the tested Blender version; render bytes can vary by CPU
or Blender build. Output overwrite is intentional; the approved blockout remains
available in Git at commit `e8effb8`.

The generator raycasts actual floors every 0.05 m across five lateral samples,
checks obstacle clearance and NPC spacing, tests each bridge rotating independently,
restores all three docked, then validates GLB names, pivots and size/triangle budgets.
The standalone validator checks collision mesh closure and outward winding, GLB
structure, collision separation, preserved pivots/spawns, and report consistency.
These are asset checks; in-engine navigation/physics testing is still required
when the asset is integrated.

Reference direction: five user-supplied images for palette, floating architecture,
arches and bridges. All geometry and layout are original. No source images,
copied meshes, external textures or third-party environment assets are distributed.
