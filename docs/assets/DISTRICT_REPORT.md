# ECHO detailed asset report

Approved layout preserved; detailed visual and collision exports.

| Measure | Visual GLB | Collision GLB |
| --- | --- | --- |
| bytes | 614,080 | 51,772 |
| triangles | 10,838 | 768 |
| unique_geometry_triangles | 10,838 | 456 |
| nodes | 45 | 68 |
| mesh_count | 38 | 38 |
| materials | 6 | 1 |
| draw_calls_estimate | 38 | 64 |

Triangles count every mesh instance. Draw calls estimate one call per visible primitive; renderer passes may add calls.

Editable source: 802 mesh objects, 145 unique meshes, 735 objects using shared mesh data.

## File sizes

| File | Bytes |
| --- | --- |
| echo_district.blend | 3,294,661 |
| echo_district.glb | 614,080 |
| echo_district_collision.glb | 51,772 |
| generate_district.py | 40,123 |
| previews/01_game_three_quarter.png | 3,092,229 |
| previews/02_top_layout.png | 2,797,404 |
| previews/03_reverse_connections.png | 3,058,123 |
| validate_asset.py | 4,726 |

## Materials

MAT_Ivory, MAT_Peach, MAT_Lilac, MAT_Mint, MAT_Ink, MAT_Brass, MAT_Memory_Glow

The visual GLB uses six materials. MAT_Ink is reserved for preview characters and collision geometry.

## Named integration objects

- `NPC_SPAWN_01_MIRAI`
- `NPC_SPAWN_02_DEVI`
- `NPC_SPAWN_03_ILYAS`
- `VIS_PUZZLE_BRIDGE_01_GARDEN_Brass`
- `VIS_PUZZLE_BRIDGE_01_GARDEN_Ivory`
- `VIS_PUZZLE_BRIDGE_01_GARDEN_Lilac`
- `VIS_PUZZLE_BRIDGE_01_GARDEN_Mint`
- `VIS_PUZZLE_BRIDGE_01_GARDEN_Peach`
- `PUZZLE_BRIDGE_01_GARDEN`
- `VIS_PUZZLE_BRIDGE_02_DOCK_Brass`
- `VIS_PUZZLE_BRIDGE_02_DOCK_Ivory`
- `VIS_PUZZLE_BRIDGE_02_DOCK_Lilac`
- `VIS_PUZZLE_BRIDGE_02_DOCK_Mint`
- `VIS_PUZZLE_BRIDGE_02_DOCK_Peach`
- `PUZZLE_BRIDGE_02_DOCK`
- `VIS_PUZZLE_BRIDGE_03_ARCHIVE_Brass`
- `VIS_PUZZLE_BRIDGE_03_ARCHIVE_Ivory`
- `VIS_PUZZLE_BRIDGE_03_ARCHIVE_Lilac`
- `VIS_PUZZLE_BRIDGE_03_ARCHIVE_Mint`
- `VIS_PUZZLE_BRIDGE_03_ARCHIVE_Peach`
- `PUZZLE_BRIDGE_03_ARCHIVE`
- `VIS_ARCHIVE_Brass`
- `VIS_ARCHIVE_Ivory`
- `VIS_ARCHIVE_Lilac`
- `VIS_ARCHIVE_Mint`
- `VIS_ARCHIVE_Peach`
- `VIS_DECOR_Ivory`
- `VIS_DECOR_Peach`
- `VIS_DOCK_Brass`
- `VIS_DOCK_Ivory`
- `VIS_DOCK_Lilac`
- `VIS_DOCK_Mint`
- `VIS_DOCK_Peach`
- `VIS_GARDEN_Brass`
- `VIS_GARDEN_Ivory`
- `VIS_GARDEN_Lilac`
- `VIS_GARDEN_Mint`
- `VIS_GARDEN_Peach`
- `VIS_PLAZA_Brass`
- `VIS_PLAZA_Ivory`
- `VIS_PLAZA_Lilac`
- `VIS_PLAZA_Memory_Glow`
- `VIS_PLAZA_Mint`
- `VIS_PLAZA_Peach`
- `ECHO_DISTRICT_ROOT`

`asset_report.json` contains every editable and export object name, local/world origin, parent, collection, triangle count and material assignment. `README.md` documents scale, axes and pivots.

Visual SHA-256: `cd5c1e3338a0a391c72d8fc910814afe4b24760d90748d62681d9d067f0e7d52`

Collision SHA-256: `43f03fd8c91155327f6c0364a721e402d9cac337af92f8f556155e043a318835`

No application or gameplay integration performed. The existing controller still requires separate floor-height and collision-map integration.
