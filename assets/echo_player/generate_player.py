"""Original ECHO memory keeper; Blender 4.5 LTS, no external assets.

blender --background --factory-startup --python-exit-code 1 --python generate_player.py
Optional script arguments: --output DIR --skip-renders
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import struct
import sys

import bmesh
import bpy
from mathutils import Vector

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=Path(__file__).resolve().parent)
parser.add_argument('--skip-renders',action='store_true')
args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
OUT=args.output.resolve()
OUT.mkdir(parents=True,exist_ok=True)
(OUT/'previews').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for mat in list(bpy.data.materials):
    bpy.data.materials.remove(mat)
scene=bpy.context.scene
scene.unit_settings.system='METRIC'
scene.unit_settings.scale_length=1
scene.render.fps=30
bpy.context.preferences.filepaths.save_version=0
asset=bpy.data.collections.new('ECHO_PLAYER_ASSET')
scene.collection.children.link(asset)
presentation=bpy.data.collections.new('PRESENTATION_ONLY')
scene.collection.children.link(presentation)


def material(name,color,vertex=False,metallic=0):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*color,1)
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(*color,1)
    shader.inputs['Roughness'].default_value=.78
    shader.inputs['Metallic'].default_value=metallic
    if vertex:
        tint=mat.node_tree.nodes.new('ShaderNodeVertexColor')
        tint.layer_name='Color'
        mat.node_tree.links.new(tint.outputs['Color'],shader.inputs['Base Color'])
    return mat


coat=material('Keeper_SlateLilac',(.155,.175,.285))
ink=material('Keeper_Ink',(.018,.025,.036))
mint=material('Keeper_MintLight',(.38,.90,.68))
shader=mint.node_tree.nodes['Principled BSDF']
shader.inputs['Emission Color'].default_value=(.38,.90,.68,1)
shader.inputs['Emission Strength'].default_value=.45
accent=material('Keeper_WarmAccents',(1,1,1),vertex=True,metallic=.12)
MATERIALS=[coat,ink,mint,accent]
PEACH=(.92,.49,.32,1)
BRASS=(.57,.34,.105,1)
LANTERN_CORE=(.96,.70,.34,1)
pieces=[]


def finish(obj,name,mat,bone,color=(1,1,1,1),smooth=False):
    obj.name=name
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    asset.objects.link(obj)
    bpy.context.view_layer.objects.active=obj
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    colors=obj.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
    for value in colors.data:
        value.color=color
    for polygon in obj.data.polygons:
        polygon.use_smooth=smooth
    group=obj.vertex_groups.new(name=bone)
    group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
    pieces.append(obj)
    obj.select_set(False)
    return obj


def mesh(name,verts,faces,mat,bone,color=(1,1,1,1),smooth=False):
    data=bpy.data.meshes.new(name+'_geometry')
    data.from_pydata(verts,[],faces)
    data.update()
    bm=bmesh.new()
    bm.from_mesh(data)
    if all(e.is_manifold for e in bm.edges):
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(data)
    bm.free()
    obj=bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    return finish(obj,name,mat,bone,color,smooth)


def box(name,center,size,mat,bone,color=(1,1,1,1),bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=center)
    obj=bpy.context.object
    obj.scale=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('Small geometric chamfer','BEVEL')
        mod.width=bevel
        mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(obj,name,mat,bone,color)


def ellipsoid(name,center,scale,mat,bone,segments=12,rings=6,color=(1,1,1,1)):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,radius=1,location=center)
    obj=bpy.context.object
    obj.scale=scale
    return finish(obj,name,mat,bone,color,True)


def rod(name,a,b,radius,mat,bone,color=(1,1,1,1),vertices=8):
    a,b=Vector(a),Vector(b)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=(b-a).length,location=(a+b)/2)
    obj=bpy.context.object
    obj.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler()
    return finish(obj,name,mat,bone,color)


# Broad, round cowl with a real recessed opening and closed back; no pointed cap.
N=20
hood=[]
for y,rx,rz in [(-.19,.35,.34),(-.045,.37,.36),(.14,.30,.31),(.25,.13,.16)]:
    hood += [(rx*math.cos(i*math.tau/N),y,1.31+rz*math.sin(i*math.tau/N)) for i in range(N)]
hood += [(.235*math.cos(i*math.tau/N),-.215,1.31+.245*math.sin(i*math.tau/N)) for i in range(N)]
hood += [(.22*math.cos(i*math.tau/N),-.12,1.31+.23*math.sin(i*math.tau/N)) for i in range(N)]
faces=[]
for ring in range(3):
    for i in range(N):
        j=(i+1)%N
        faces.append((ring*N+i,ring*N+j,(ring+1)*N+j,(ring+1)*N+i))
faces.append(tuple(3*N+i for i in reversed(range(N))))
for i in range(N):
    j=(i+1)%N
    faces += [(i,4*N+i,4*N+j,j),(4*N+i,5*N+i,5*N+j,4*N+j)]
mesh('Hood_RoundedCowl',hood,faces,coat,'Head',smooth=True)
face=[(.222*math.cos(i*math.tau/N),-.125,1.31+.232*math.sin(i*math.tau/N)) for i in range(N)]
mesh('Face_Recess',face,[tuple(range(N))],ink,'Head')
ellipsoid('Face_SingleMintLens',(.025,-.19,1.355),(.058,.045,.058),mint,'Head',12,6)

# Short architectural coat with a gently flared, subtly asymmetric hem.
verts=[]
for z,rx,ry in [(.425,.295,.205),(.54,.31,.215),(.78,.27,.19),(.98,.255,.18),(1.045,.20,.145)]:
    for i in range(12):
        angle=i*math.tau/12
        hem=.018*math.cos(angle) if z==.425 else 0
        verts.append((rx*math.cos(angle),ry*math.sin(angle),z+hem))
faces=[]
for r in range(4):
    for i in range(12):
        j=(i+1)%12
        faces.append((r*12+i,r*12+j,(r+1)*12+j,(r+1)*12+i))
faces += [tuple(reversed(range(12))),tuple(48+i for i in range(12))]
body=mesh('Coat_ShortFlaredBody',verts,faces,coat,'Chest')
chest_group=body.vertex_groups['Chest']
pelvis_group=body.vertex_groups.new(name='Pelvis')
for v in body.data.vertices:
    w=max(0,min(1,(v.co.z-.48)/.40))
    chest_group.add([v.index],w,'REPLACE')
    pelvis_group.add([v.index],1-w,'REPLACE')
box('Coat_FrontPlacket',(0,-.207,.72),(.035,.022,.36),ink,'Chest')
for i,z in enumerate([.70,.83,.94]):
    ellipsoid('Coat_Button_'+str(i),(.045,-.218,z),(.023,.014,.023),accent,'Chest',8,4,BRASS)

# Scarf collar and a single offset ribbon, opposite the low hanging lantern.
bpy.ops.mesh.primitive_torus_add(major_segments=16,minor_segments=6,location=(0,0,.985),
    major_radius=.22,minor_radius=.055)
collar=bpy.context.object
collar.scale=(1.16,.78,.8)
finish(collar,'Scarf_Collar',accent,'Chest',PEACH,True)
ellipsoid('Scarf_Knot',(.245,-.08,.96),(.10,.075,.075),accent,'Chest',10,6,PEACH)
mesh('Scarf_OffsetTail',[(.23,-.03,.99),(.29,.06,1.01),(.51,.08,.80),(.46,-.025,.74),
                      (.235,-.04,.975),(.295,.05,.995),(.515,.07,.785),(.465,-.035,.725)],
    [(0,1,2,3),(4,7,6,5),(0,4,5,1),(1,5,6,2),(2,6,7,3),(3,7,4,0)],accent,'Scarf',PEACH)

for side,sx in [('L',1),('R',-1)]:
    x=sx*.145
    rod('Leg_Thigh_'+side,(x,0,.49),(x,0,.29),.073,ink,'Thigh.'+side,vertices=10)
    rod('Leg_Shin_'+side,(x,0,.29),(x,0,.09),.064,ink,'Shin.'+side,vertices=10)
    box('Boot_'+side,(x,-.075,.078),(.18,.29,.156),ink,'Foot.'+side,bevel=.032)
    box('Boot_Cuff_'+side,(x,0,.16),(.155,.15,.06),coat,'Shin.'+side,bevel=.012)
    rod('Sleeve_'+side,(sx*.23,0,.965),(sx*.355,-.015,.795),.095,coat,'UpperArm.'+side,vertices=12)
    rod('Cuff_'+side,(sx*.355,-.015,.795),(sx*.395,-.035,.705),.075,coat,'Forearm.'+side,vertices=10)
    ellipsoid('Glove_'+side,(sx*.405,-.045,.70),(.075,.07,.075),ink,'Hand.'+side,10,6)

# Brass lantern uses the same vertex-tinted accent material as the peach scarf.
lx,ly=-.435,-.055
for suffix,z,size in [('BASE',.355,(.23,.19,.055)),('CAP',.595,(.23,.19,.05))]:
    box('Lantern_'+suffix,(lx,ly,z),size,accent,'Lantern.R',BRASS,bevel=.015)
box('Lantern_MemoryAmber',(lx,ly,.475),(.12,.105,.18),accent,'Lantern.R',LANTERN_CORE,bevel=.018)
for i,(ox,oy) in enumerate([(-.085,-.065),(.085,-.065),(-.085,.065),(.085,.065)]):
    rod('Lantern_Frame_'+str(i),(lx+ox,ly+oy,.38),(lx+ox,ly+oy,.58),.014,accent,'Lantern.R',BRASS,6)
for i in range(12):
    a,b=math.pi*i/12,math.pi*(i+1)/12
    rod('Lantern_Handle_'+str(i),(lx+.083*math.cos(a),ly,.615+.083*math.sin(a)),
        (lx+.083*math.cos(b),ly,.615+.083*math.sin(b)),.014,accent,'Lantern.R',BRASS,6)

# Single deforming mesh, four materials and a small FK skeleton.
bpy.ops.object.select_all(action='DESELECT')
for obj in pieces:
    obj.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.join()
model=bpy.context.object
model.name='EchoPlayer_Mesh'
model.data.name='EchoPlayer_SkinnedGeometry'
for layer in list(model.data.uv_layers):
    model.data.uv_layers.remove(layer)
bm=bmesh.new()
bm.from_mesh(model.data)
bmesh.ops.triangulate(bm,faces=list(bm.faces),quad_method='FIXED',ngon_method='EAR_CLIP')
bm.to_mesh(model.data)
bm.free()
model.data.calc_loop_triangles()
triangle_count=len(model.data.loop_triangles)
assert triangle_count<5000,triangle_count
assert set(m.name for m in model.data.materials)==set(m.name for m in MATERIALS)

root=bpy.data.objects.new('EchoPlayer',None)
asset.objects.link(root)
root['units']='meters'
root['forward_gltf']='+Z'
root['origin']='ground between feet'
root['animations_in_place']=True
data=bpy.data.armatures.new('Keeper_Skeleton')
rig=bpy.data.objects.new('EchoPlayer_Rig',data)
asset.objects.link(rig)
rig.parent=root
rig.show_in_front=True
bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
bones={}


def bone(name,head,tail,parent=None):
    b=data.edit_bones.new(name)
    b.head=head
    b.tail=tail
    if parent:
        b.parent=bones[parent]
    bones[name]=b


bone('Root',(0,0,0),(0,0,.12))
bone('Pelvis',(0,0,.49),(0,0,.72),'Root')
bone('Chest',(0,0,.72),(0,0,1.03),'Pelvis')
bone('Head',(0,0,1.03),(0,0,1.50),'Chest')
bone('Scarf',(.245,-.04,1.00),(.46,.04,.79),'Chest')
for side,sx in [('L',1),('R',-1)]:
    x=sx*.145
    bone('Thigh.'+side,(x,0,.49),(x,0,.29),'Pelvis')
    bone('Shin.'+side,(x,0,.29),(x,0,.09),'Thigh.'+side)
    bone('Foot.'+side,(x,0,.09),(x,-.18,.09),'Shin.'+side)
    bone('UpperArm.'+side,(sx*.23,0,.965),(sx*.355,-.015,.795),'Chest')
    bone('Forearm.'+side,(sx*.355,-.015,.795),(sx*.395,-.035,.705),'UpperArm.'+side)
    bone('Hand.'+side,(sx*.395,-.035,.705),(sx*.415,-.05,.65),'Forearm.'+side)
bone('Lantern.R',(lx,ly,.67),(lx,ly,.43),'Hand.R')
bpy.ops.object.mode_set(mode='OBJECT')
model.parent=rig
modifier=model.modifiers.new('Keeper Skin','ARMATURE')
modifier.object=rig
for pb in rig.pose.bones:
    pb.rotation_mode='XYZ'
rig.animation_data_create()
actions={}


def reset_pose():
    for pb in rig.pose.bones:
        pb.rotation_euler=(0,0,0)
        pb.location=(0,0,0)
        pb.scale=(1,1,1)


for clip,frames in [('Idle',72),('Walk',30),('Interact',36)]:
    action=bpy.data.actions.new(clip)
    rig.animation_data.action=action
    for frame in range(1,frames+2):
        reset_pose()
        t=(frame-1)/frames
        wave=math.sin(t*math.tau)
        if clip=='Idle':
            rig.pose.bones['Pelvis'].location.y=.009*(1-math.cos(t*math.tau))
            rig.pose.bones['Chest'].rotation_euler.y=.022*wave
            rig.pose.bones['Head'].rotation_euler.z=.025*wave
            rig.pose.bones['Scarf'].rotation_euler.x=.055*wave
            rig.pose.bones['Lantern.R'].rotation_euler.x=.035*wave
        elif clip=='Walk':
            bob=-.025+.008*(1-math.cos(t*math.tau*2))
            rig.pose.bones['Pelvis'].location.y=bob
            rig.pose.bones['Chest'].rotation_euler.z=.05*wave
            for side,phase in [('L',t*math.tau),('R',t*math.tau+math.pi)]:
                target_y=.115*math.cos(phase)
                target_z=.09+.075*max(0,math.sin(phase))
                down=.49+bob-target_z
                distance=math.hypot(target_y,down)
                assert distance<.40001
                half_bend=math.acos(min(1,distance/.4))
                axis=math.atan2(target_y,down)
                upper=axis-half_bend
                lower=axis+half_bend
                rig.pose.bones['Thigh.'+side].rotation_euler.x=upper
                rig.pose.bones['Shin.'+side].rotation_euler.x=2*half_bend
                # Foot local X points opposite to the leg's X in the edit basis.
                rig.pose.bones['Foot.'+side].rotation_euler.x=lower
                swing=.18*math.cos(phase)
                rig.pose.bones['UpperArm.'+side].rotation_euler.x=-swing
            rig.pose.bones['Scarf'].rotation_euler.x=.1*wave
            rig.pose.bones['Lantern.R'].rotation_euler.x=.08*wave
        else:
            reach=math.sin(math.pi*t)**2
            rig.pose.bones['UpperArm.R'].rotation_euler.x=-.88*reach
            rig.pose.bones['Forearm.R'].rotation_euler.x=-.55*reach
            rig.pose.bones['Lantern.R'].rotation_euler.x=1.43*reach
            rig.pose.bones['Head'].rotation_euler.x=.16*reach
            rig.pose.bones['Scarf'].rotation_euler.x=-.1*reach
        for pb in rig.pose.bones:
            pb.keyframe_insert(data_path='rotation_euler',frame=frame,group=pb.name)
            pb.keyframe_insert(data_path='location',frame=frame,group=pb.name)
    actions[clip]=action
    rig.animation_data.action=None
    track=rig.animation_data.nla_tracks.new()
    track.name=clip
    strip=track.strips.new(clip,1,action)
    strip.name=clip
    strip.blend_type='REPLACE'
    track.mute=True

pose_checks={}
for clip,action in actions.items():
    rig.animation_data.action=action
    low=10
    first=None
    for frame in range(1,int(action.frame_range[1])+1):
        scene.frame_set(frame)
        bpy.context.view_layer.update()
        evaluated=model.evaluated_get(bpy.context.evaluated_depsgraph_get())
        for side in ['L','R']:
            group=model.vertex_groups['Foot.'+side].index
            ids=[v.index for v in model.data.vertices if any(g.group==group and g.weight>.9 for g in v.groups)]
            low=min(low,min((evaluated.matrix_world@evaluated.data.vertices[i].co).z for i in ids))
        assert rig.location.length<1e-8 and root.location.length<1e-8
        assert rig.pose.bones['Root'].location.length<1e-8
        transforms=[pb.matrix.copy() for pb in rig.pose.bones]
        if first is None:
            first=transforms
    assert low>=-.002,(clip,'feet below ground',low)
    assert all(abs(a[r][c]-b[r][c])<1e-5 for a,b in zip(first,transforms) for r in range(4) for c in range(4)),clip
    pose_checks[clip]={'minimum_boot_height_m':round(low,6),'endpoints_match':True,'root_motion':False}
rig.animation_data.action=None
# Default source pose and geometry dimensions at rest.
reset_pose()
scene.frame_set(1)
bpy.context.view_layer.update()
corners=[model.matrix_world@v.co for v in model.data.vertices]
minimum=[min(v[i] for v in corners) for i in range(3)]
maximum=[max(v[i] for v in corners) for i in range(3)]
dimensions=[maximum[i]-minimum[i] for i in range(3)]
assert abs(minimum[2])<1e-5,minimum

# Export only the asset, with named NLA clips sampled into portable bone tracks.
for track in rig.animation_data.nla_tracks:
    track.mute=False
rig.animation_data.action=None
bpy.ops.object.select_all(action='DESELECT')
for obj in [root,rig,model]:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'echo-player.glb'),export_format='GLB',
    use_selection=True,export_yup=True,export_extras=True,export_materials='EXPORT',
    export_animations=True,export_animation_mode='NLA_TRACKS',export_force_sampling=True,
    export_frame_range=False,export_anim_slide_to_zero=True,export_skins=True,
    export_morph=False,export_cameras=False,export_lights=False)
# Blender can emit equivalent triangle orders across worker counts. Canonicalize
# each material primitive's indices without changing winding or vertex attributes.
binary=bytearray((OUT/'echo-player.glb').read_bytes())
json_length=struct.unpack_from('<I',binary,12)[0]
gltf=json.loads(binary[20:20+json_length])
bin_offset=28+json_length
seen=set()
for gltf_mesh in gltf['meshes']:
    for primitive in gltf_mesh['primitives']:
        index=primitive['indices']
        if index in seen:
            continue
        seen.add(index)
        access=gltf['accessors'][index]
        view=gltf['bufferViews'][access['bufferView']]
        offset=bin_offset+view.get('byteOffset',0)+access.get('byteOffset',0)
        fmt={5123:'H',5125:'I'}[access['componentType']]
        values=struct.unpack_from('<'+fmt*access['count'],binary,offset)
        triangles=[]
        for i in range(0,len(values),3):
            a,b,c=values[i:i+3]
            triangles.append(min((a,b,c),(b,c,a),(c,a,b)))
        values=[v for triangle in sorted(triangles) for v in triangle]
        struct.pack_into('<'+fmt*len(values),binary,offset,*values)
(OUT/'echo-player.glb').write_bytes(binary)
for track in rig.animation_data.nla_tracks:
    track.mute=True
rig.animation_data.action=actions['Idle']
scene.frame_start=1
scene.frame_end=73
scene.frame_set(1)

# Self-contained studio presentation, excluded from GLB and material budget.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015))
ground=bpy.context.object
ground.name='PREVIEW_GROUND'
ground.data.materials.append(accent)
ground_colors=ground.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='CORNER')
for value in ground_colors.data:
    value.color=(.87,.84,.75,1)
for col in list(ground.users_collection):
    col.objects.unlink(ground)
presentation.objects.link(ground)
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=32
scene.cycles.use_denoising=True
scene.render.resolution_x=1200
scene.render.resolution_y=1200
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.55,.72,.66,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.55
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=.45
for name,pos,power,color,size in [
    ('KEY',(-3,-4,6),380,(1,.85,.75),4),('FILL',(4,-1,3),170,(.65,.73,1),3),
    ('RIM',(1,4,5),350,(.6,1,.8),3)]:
    light=bpy.data.lights.new('PREVIEW_'+name,'AREA')
    light.energy=power
    light.color=color
    light.shape='DISK'
    light.size=size
    obj=bpy.data.objects.new(light.name,light)
    presentation.objects.link(obj)
    obj.location=pos
    obj.rotation_euler=(Vector((0,0,.85))-obj.location).to_track_quat('-Z','Y').to_euler()

views=[('01_front',(0,-6,1.15),(0,0,.84),2.18),
       ('02_side',(6,0,1.10),(0,0,.84),2.18),
       ('03_game_three_quarter',(3.4,-5,5.2),(0,0,.82),2.45)]
for name,pos,target,scale in views:
    cam=bpy.data.cameras.new('CAM_'+name)
    cam.type='ORTHO'
    cam.ortho_scale=scale
    obj=bpy.data.objects.new(cam.name,cam)
    presentation.objects.link(obj)
    obj.location=pos
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=obj
    if not args.skip_renders:
        scene.render.filepath=str(OUT/'previews'/(name+'.png'))
        bpy.ops.render.render(write_still=True)

scene.camera=bpy.data.objects['CAM_03_game_three_quarter']
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'echo-player.blend'))
raw=(OUT/'echo-player.glb').read_bytes()
length=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+length])
animation_info={}
for animation in doc.get('animations',[]):
    times=[doc['accessors'][s['input']] for s in animation['samplers']]
    animation_info[animation['name']]={'duration_s':max(t['max'][0] for t in times)-min(t['min'][0] for t in times),
                                      'channels':len(animation['channels'])}
assert set(animation_info)=={'Idle','Walk','Interact'},animation_info
assert len(doc['materials'])==4,len(doc['materials'])
assert not doc.get('textures') and not doc.get('images')
assert doc.get('skins')
assert not any(n.get('camera') is not None for n in doc['nodes'])
report={'name':'ECHO wandering memory keeper','triangles':triangle_count,
    'materials':[m['name'] for m in doc['materials']],'material_count':len(doc['materials']),
    'glb_bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),'blender_version':bpy.app.version_string,
    'dimensions_blender_xyz_m':dimensions,'bounds_min_blender_m':minimum,'bounds_max_blender_m':maximum,
    'forward_blender':'-Y','forward_gltf':'+Z','up_blender':'+Z','up_gltf':'+Y',
    'origin':'ground between feet, (0,0,0)','animations':animation_info,'pose_checks':pose_checks,'bones':[b.name for b in rig.data.bones],
    'nodes':[n['name'] for n in doc['nodes']],'units':'meters',
    'warm_accent_colors':{'scarf':PEACH,'lantern_brass':BRASS,'lantern_core':LANTERN_CORE},
    'files':{str(p.relative_to(OUT)):p.stat().st_size for p in sorted(OUT.rglob('*')) if p.is_file() and p.suffix in ['.py','.blend','.glb','.png']}}
(OUT/'player_report.json').write_text(json.dumps(report,indent=2)+'\n')
print('ECHO_PLAYER_OK',json.dumps({k:report[k] for k in ['triangles','material_count','glb_bytes','dimensions_blender_xyz_m','animations']}))
