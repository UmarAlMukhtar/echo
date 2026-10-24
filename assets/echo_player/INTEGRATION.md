# ECHO player integration

Runtime file: `assets/echo_player/echo-player.glb`. Serve it from a static asset
directory when integrating; the repository source folder is not a public URL.
The current application and gameplay code have not been modified.

| Property | Value |
| --- | --- |
| Geometry | 2,064 triangles; four skinned material primitives |
| Shared materials | 4; no image textures or required decoder extensions |
| GLB file size | 214,936 bytes (209.9 KiB) |
| Rig | 18 bones, one skeleton; no morph targets or constraints needed at runtime |
| Scale | 1 unit = 1 meter; use scale 1 |
| Rest dimensions, Three.js X/Y/Z | 1.065 m wide × 1.670 m tall × 0.485 m deep |
| Origin | (0, 0, 0), on the ground between the feet |
| Forward | GLB +Z; Blender -Y |
| Up | GLB +Y; Blender +Z |
| Asset root | `EchoPlayer` |

The width includes the hanging lantern and scarf tail, not just the body. The
hood is approximately 0.74 m wide. Use the game's character controller/capsule
for movement and collision rather than the animated mesh bounds.

| Clip name (case-sensitive) | Duration | Playback |
| --- | --- | --- |
| `Idle` | 2.4 s | LoopRepeat; quiet breathing and scarf/lantern sway |
| `Walk` | 1.0 s | LoopRepeat; alternating planted feet and arm motion |
| `Interact` | 1.2 s | LoopOnce; presents the lantern, then returns to neutral |

All clips are **in place**. Actor root translation stays zero. The pelvis has
small vertical gait/breathing motion; it supplies no travel. First and last poses
match for both loops. Interact also returns to its starting pose. glTF stores
animation curves; configure loop modes in the animation player.

Use the existing drei `useGLTF` and `useAnimations`, or Three.js `GLTFLoader` plus
`AnimationMixer`. Bind actions to a ref enclosing this asset; play Idle initially,
cross-fade to Walk while moving, and play Interact once with `clampWhenFinished`
before returning to Idle. For multiple independently animated instances, clone
with `SkeletonUtils.clone`, not a shallow scene clone. No new runtime dependency
is needed by the existing React Three Fiber game.

The existing `PlayerRig` moves and rotates a parent at ground level, using
`atan2(dx, dz)`. This asset's +Z forward direction matches that convention: no
90-degree rotation, centering offset or scale correction is needed. When later
replacing `PlayerAvatar`, remove its old procedural bob so Idle is not doubled.
Keep movement on that outer parent; animation must not drive world position.

Materials: `Keeper_SlateLilac`, `Keeper_Ink`, `Keeper_MintLight`, and
`Keeper_WarmAccents`. The peach scarf and brass/amber lantern share WarmAccents
using `COLOR_0` vertex colours. Preserve `vertexColors` if overriding materials.
The single mint face lens has modest emission; the lantern's amber insert uses
flat colour. No point lights, transparency, bloom, textures or postprocessing
are required. Apply ordinary scene lighting and shadows in the game.

Validated by re-importing the GLB into Blender 4.5.3 and loading it with the game's
Three.js 0.180.0 `GLTFLoader` and `AnimationMixer`. All four materials, warm vertex
colours, three clips, skinning, loop endpoints, origin, and ground clearance pass.
Normal-distance preview uses the current 45-degree FOV, 11 m camera orbit and
0.72 rad pitch. In-game controller integration has not been performed.
