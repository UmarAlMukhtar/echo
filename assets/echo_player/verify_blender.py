"""Re-import the player GLB, check its materials/clips and render runtime poses."""
import json
import math
from pathlib import Path

import bpy
from mathutils import Vector

BASE=Path(__file__).resolve().parent
bpy.ops.wm.open_mainfile(filepath=str(BASE/'echo-player.blend'))
bpy.data.objects['EchoPlayer_Mesh'].hide_render=True
qa=bpy.data.collections.new('QA_RUNTIME_IMPORT')
bpy.context.scene.collection.children.link(qa)
bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection.children[qa.name]
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=str(BASE/'echo-player.glb'))
imported=[o for o in bpy.data.objects if o not in before]
rig=next(o for o in imported if o.type=='ARMATURE')
meshes=[o for o in imported if o.type=='MESH']
mats={m.name.split('.')[0] for o in meshes for m in o.data.materials}
expected={'Keeper_SlateLilac','Keeper_Ink','Keeper_MintLight','Keeper_WarmAccents'}
assert mats==expected,mats
assert len(rig.data.bones)==18
actions={}
for track in rig.animation_data.nla_tracks:
    track.mute=True
    actions[track.name]=track.strips[0].action
assert set(actions)=={'Idle','Walk','Interact'},list(actions)
scene=bpy.context.scene
assert scene.render.fps==30
durations={n:(a.frame_range[1]-a.frame_range[0])/30 for n,a in actions.items()}
for name,duration in {'Idle':2.4,'Walk':1,'Interact':1.2}.items():
    assert abs(durations[name]-duration)<1e-5
rig.animation_data.action=actions['Idle']
scene.frame_set(0)
scene.camera=bpy.data.objects['CAM_03_game_three_quarter']
scene.render.resolution_x=900
scene.render.resolution_y=900
scene.cycles.samples=24
scene.render.filepath=str(BASE/'previews/04_glb_roundtrip.png')
bpy.ops.render.render(write_still=True)

rig.animation_data.action=actions['Interact']
scene.frame_set(18)
scene.render.filepath=str(BASE/'previews/05_interact_pose.png')
bpy.ops.render.render(write_still=True)

# Existing camera: 45-degree vertical FOV, 11 m orbit, pitch 0.72 rad.
rig.animation_data.action=actions['Idle']
scene.frame_set(0)
yaw=.55
cam=bpy.data.cameras.new('QA_GAME_DISTANCE')
cam.type='PERSP'
cam.sensor_fit='VERTICAL'
cam.sensor_height=32
cam.lens=32/(2*math.tan(math.radians(45)/2))
obj=bpy.data.objects.new(cam.name,cam)
qa.objects.link(obj)
obj.location=(math.sin(yaw)*math.cos(.72)*11,-math.cos(yaw)*math.cos(.72)*11,1.2+math.sin(.72)*11)
obj.rotation_euler=(Vector((0,0,1.3))-obj.location).to_track_quat('-Z','Y').to_euler()
scene.camera=obj
scene.render.resolution_x=1200
scene.render.resolution_y=675
scene.render.filepath=str(BASE/'previews/06_game_distance.png')
bpy.ops.render.render(write_still=True)
report={'status':'PASS','imported_materials':sorted(mats),'imported_bones':len(rig.data.bones),
    'imported_meshes':len(meshes),'animations_seconds':durations,
    'roundtrip_render':'previews/04_glb_roundtrip.png',
    'interact_peak_render':'previews/05_interact_pose.png',
    'normal_game_distance_render':'previews/06_game_distance.png',
    'camera':{'vertical_fov_degrees':45,'orbit_distance_m':11,'pitch_radians':.72}}
(BASE/'blender_validation.json').write_text(json.dumps(report,indent=2)+'\n')
print('ECHO_PLAYER_REIMPORT_OK',json.dumps(report))
