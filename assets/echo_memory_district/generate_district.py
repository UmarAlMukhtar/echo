"""ECHO district: deterministic layout-review blockout, Blender 4.5 LTS.

blender --background --factory-startup --python generate_district.py -- --output DIR
No application imports, downloads, randomness, textures, or external add-ons.
"""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent)
parser.add_argument('--skip-renders', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT = args.output.resolve()
OUT.mkdir(parents=True, exist_ok=True)
(OUT / 'previews').mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for data in (bpy.data.meshes, bpy.data.materials, bpy.data.cameras, bpy.data.lights, bpy.data.curves):
    for item in list(data):
        if item.users == 0:
            data.remove(item)

scene = bpy.context.scene
bpy.context.preferences.filepaths.save_version = 0
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
collections = {}
for name in ['STATIC_WALK', 'PUZZLE_PARTS', 'ARCHITECTURE', 'NPC_PLACEHOLDERS',
             'COLLISION', 'DECOR_OFF_ROUTE', 'REVIEW_LABELS', 'PRESENTATION']:
    col = bpy.data.collections.new(name)
    scene.collection.children.link(col)
    collections[name] = col


def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = 0.88
    return mat


ivory = material('MAT_Ivory', (0.94, 0.90, 0.80))
peach = material('MAT_Peach', (0.93, 0.64, 0.53))
lilac = material('MAT_Lilac', (0.50, 0.40, 0.67))
mint = material('MAT_Mint', (0.48, 0.75, 0.65))
ink = material('MAT_Ink', (0.13, 0.19, 0.24))
MATERIALS = [ivory, peach, lilac, mint, ink]
root = bpy.data.objects.new('ECHO_DISTRICT_ROOT', None)
collections['STATIC_WALK'].objects.link(root)
root['asset_stage'] = 'BLOCKOUT_REVIEW_REQUIRED'
root['meters_per_unit'] = 1.0
root['blender_axes'] = 'X east, Y north, Z up; origin plaza walking surface'
root['gltf_axes'] = 'X east, Y up, -Z north; (x,y,z) -> (x,z,-y)'
root['puzzle_state'] = 'All three bridges docked; disconnected states are intentional gameplay gates'


def place(obj, name, collection, mat=None, parent=root):
    obj.name = name
    for col in list(obj.users_collection):
        col.objects.unlink(obj)
    collections[collection].objects.link(obj)
    obj.parent = parent
    if mat:
        obj.data.materials.append(mat)
    return obj


def box(name, center, size, mat, collection='ARCHITECTURE', parent=root):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = place(bpy.context.object, name, collection, mat, parent)
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return obj


def mesh(name, verts, faces, mat, collection, parent=root):
    data = bpy.data.meshes.new(name + '_mesh')
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    collections[collection].objects.link(obj)
    obj.parent = parent
    data.materials.append(mat)
    return obj


def cylinder(name, center, radius, depth, mat, vertices=16, collection='ARCHITECTURE'):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=center)
    return place(bpy.context.object, name, collection, mat)


def collider(obj):
    obj.hide_render = True
    obj.display_type = 'WIRE'
    obj['role'] = 'collision_proxy'
    return obj


walk_surfaces = []


def floor(name, cx, cy, sx, sy, top, mat):
    obj = box(name, (cx, cy, top - 0.4), (sx, sy, 0.8), mat, 'STATIC_WALK')
    collider(box('COL_' + name, (cx, cy, top - 0.4), (sx, sy, 0.8), ink, 'COLLISION'))
    walk_surfaces.append((cx-sx/2, cx+sx/2, cy-sy/2, cy+sy/2, top))
    return obj


floor('WALK_PLAZA', 0, 0, 12, 10, 0, ivory)
floor('MEMORY_01_GARDEN', -13, 0, 6, 6, 0.6, peach)
floor('MEMORY_02_DOCK', 12, -1, 6, 7, 0, ivory)
floor('MEMORY_03_ARCHIVE', 0, 12, 6, 5, 1.5, peach)


def stairs(name, start, direction, length, width, rise, count):
    x, y, z = start
    dx, dy = direction
    tread = length / count
    for i in range(count):
        top = z + rise * (i+1)/count
        cx, cy = x + dx*tread*(i+0.5), y + dy*tread*(i+0.5)
        sx, sy = (tread+0.002, width) if dx else (width, tread+0.002)
        box(f'{name}_STEP_{i+1:02}', (cx, cy, (z-0.3+top)/2),
            (sx, sy, top-z+0.3), ivory, 'STATIC_WALK')
        walk_surfaces.append((cx-sx/2, cx+sx/2, cy-sy/2, cy+sy/2, top))
    # Closed wedge provides a smooth physics surface; visible risers are 0.15 m.
    verts = []
    for along, height in [(0, -0.3), (length, -0.3), (length, rise), (0, 0)]:
        for side in [-width/2, width/2]:
            verts.append((x+dx*along-dy*side, y+dy*along+dx*side, z+height))
    faces = [(0,2,3,1), (2,4,5,3), (4,6,7,5), (6,0,1,7), (0,6,4,2), (1,3,5,7)]
    collider(mesh('COL_'+name+'_RAMP', verts, faces, ink, 'COLLISION'))


stairs('WALK_GARDEN_STAIR', (-6, 0, 0), (-1, 0), 2, 2.8, 0.6, 4)
stairs('WALK_ARCHIVE_STAIR', (0, 5, 0), (0, 1), 3, 2.8, 1.5, 10)

bridge_specs = [
    ('01_GARDEN', (-8, 0, 0.6), (-1, 0), 2.02),
    ('02_DOCK', (6, -1, 0), (1, 0), 3.02),
    ('03_ARCHIVE', (0, 8, 1.5), (0, 1), 1.52),
]
bridge_roots = []
for suffix, start, direction, length in bridge_specs:
    joint = bpy.data.objects.new('PUZZLE_BRIDGE_'+suffix, None)
    collections['PUZZLE_PARTS'].objects.link(joint)
    joint.parent = root
    joint.location = start
    joint['role'] = 'independently_movable_bridge'
    joint['pivot'] = 'near bank, deck surface, centerline'
    joint['local_motion_axis'] = 'rotate local Z (glTF local Y), or translate as one parent'
    joint['state'] = 'DOCKED'
    joint.empty_display_type = 'ARROWS'
    bridge_roots.append(joint)
    dx, dy = direction
    size = (length, 2.8, 0.3) if dx else (2.8, length, 0.3)
    # One centimeter overlap at each bank avoids floating-point cracks.
    local = (dx*(length/2-0.01), dy*(length/2-0.01), -0.15)
    deck = box('BRIDGE_DECK_'+suffix, local, size, lilac, 'PUZZLE_PARTS', joint)
    deck['walkable'] = True
    collider(box('COL_BRIDGE_'+suffix, local, size, ink, 'COLLISION', joint))
    # Mint stripe signals an interactive part without adding a separate material.
    stripe_size = (length, 0.14, 0.015) if dx else (0.14, length, 0.015)
    box('BRIDGE_STRIPE_'+suffix, (local[0], local[1], 0.0075), stripe_size,
        mint, 'PUZZLE_PARTS', joint)
    cx, cy = start[0]+local[0], start[1]+local[1]
    walk_surfaces.append((cx-size[0]/2,cx+size[0]/2,cy-size[1]/2,cy+size[1]/2,start[2]))


def arch(name, center, opening, spring, thickness, depth, mat):
    cx, cy, base = center
    r = opening/2
    # Two posts plus a faceted curved lintel. Opening remains truly empty.
    for side in [-1, 1]:
        box(name+('_LEFT' if side<0 else '_RIGHT'),
            (cx+side*(r+thickness/2),cy,base+spring/2), (thickness,depth,spring), mat)
    verts, faces = [], []
    for i in range(13):
        angle = math.pi*i/12
        for yy in [-depth/2, depth/2]:
            for radius in [r, r+thickness]:
                verts.append((cx+radius*math.cos(angle),cy+yy,base+spring+radius*math.sin(angle)))
    for i in range(12):
        a, b = 4*i, 4*(i+1)
        faces += [(a,b,b+1,a+1),(a+2,a+3,b+3,b+2),
                  (a,a+2,b+2,b),(a+1,b+1,b+3,a+3)]
    faces += [(0,1,3,2),(48,50,51,49)]
    mesh(name+'_VAULT', verts, faces, mat, 'ARCHITECTURE')


# Simple silhouettes establish spatial hierarchy, with uncluttered travel lanes.
arch('ARCH_ARCHIVE', (0,13.3,1.5), 2.8, 2.7, 0.55, 0.65, ivory)
arch('ARCH_GARDEN', (-13,1.6,0.6), 2.6, 1.9, 0.45, 0.55, ivory)
for suffix, x,y,z, h in [('GARDEN',-15.2,1.8,0.6,3.4),('DOCK',14.1,1.3,0,4.2),
                       ('ARCHIVE',2.25,13.5,1.5,4.4)]:
    box('MASS_'+suffix+'_TOWER', (x,y,z+h/2), (1.2,1.2,h), ivory)
    box('MASS_'+suffix+'_CAP', (x,y,z+h+0.15), (1.5,1.5,0.3), peach)
    collider(box('COL_MASS_'+suffix, (x,y,z+h/2), (1.5,1.5,h+0.3), ink, 'COLLISION'))

# One low relay placeholder leaves broad circulation on every side.
cylinder('MASS_CENTRAL_RELAY', (0,0,0.5), 0.8, 1, lilac)
collider(box('COL_CENTRAL_RELAY',(0,0,0.5),(1.6,1.6,1),ink,'COLLISION'))
cylinder('MASS_RELAY_TOP', (0,0,1.05), 0.62, 0.1, mint)

npcs = [('01_MIRAI', -12.9,-0.8,0.6),('02_DEVI',12,-1,0),('03_ILYAS',0,11.5,1.5)]
for name,x,y,z in npcs:
    marker = bpy.data.objects.new('NPC_SPAWN_'+name,None)
    collections['NPC_PLACEHOLDERS'].objects.link(marker)
    marker.parent=root
    marker.location=(x,y,z)
    marker['clear_interaction_space_m'] = 1.2
    marker['placeholder_height_m'] = 1.7
    cylinder('NPC_BODY_'+name,(x,y,z+0.65),0.25,1.3,ink,12,'NPC_PLACEHOLDERS')
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=0.22,location=(x,y,z+1.48))
    place(bpy.context.object,'NPC_HEAD_'+name,'NPC_PLACEHOLDERS',ink)

# Impossible architecture is visibly detached, behind the district and nonwalkable.
for i in range(7):
    obj=box(f'DECOR_FLOATING_STAIR_{i+1:02}',(-9+i*0.8,9.5,3+i*0.42),
            (0.76,1.6,0.2),ivory,'DECOR_OFF_ROUTE')
    obj['role']='nonplayable_silhouette_no_collider'
arch('ARCH_DISTANT_FRAME',(-11,10.5,-2),3.4,3,0.6,0.7,peach)
for obj in list(collections['ARCHITECTURE'].objects):
    if obj.name.startswith('ARCH_DISTANT'):
        collections['ARCHITECTURE'].objects.unlink(obj)
        collections['DECOR_OFF_ROUTE'].objects.link(obj)
        obj['role']='nonplayable_silhouette_no_collider'


def label(name, text, pos, size=0.52):
    data=bpy.data.curves.new(name,'FONT')
    data.body=text
    data.align_x='CENTER'
    data.align_y='CENTER'
    data.size=size
    data.extrude=0
    obj=bpy.data.objects.new(name,data)
    collections['REVIEW_LABELS'].objects.link(obj)
    obj.location=pos
    data.materials.append(ink)
    return obj


label('LABEL_PLAZA','CENTRAL PLAZA',(0,-3.0,0.018),0.65)
label('LABEL_GARDEN','01 / GARDEN',(-13,-2.25,0.618),0.46)
label('LABEL_DOCK','02 / DOCK',(12,-3.6,0.018),0.48)
label('LABEL_ARCHIVE','03 / ARCHIVE',(0,10.2,1.518),0.45)
label('LABEL_ENTRY','START',(0,-4.3,0.018),0.38)
for suffix,start,direction,length in bridge_specs:
    dx,dy=direction
    label('LABEL_BRIDGE_'+suffix,'B'+suffix[:2],
          (start[0]+dx*length/2,start[1]+dy*length/2,start[2]+0.025),0.34)


def validate_routes():
    # Check a 0.6 m-wide corridor against actual generated floor geometry.
    routes = {
        'garden':[(-3,0),(-12,0)],
        'dock':[(3,-1),(11,-1)],
        'archive':[(0,2),(0,11)],
    }
    scene.view_layers[0].update()
    depsgraph=bpy.context.evaluated_depsgraph_get()
    floor_objects=list(collections['STATIC_WALK'].objects)+[
        obj for obj in collections['PUZZLE_PARTS'].objects if obj.name.startswith('BRIDGE_DECK_')]
    floor_objects=[obj for obj in floor_objects if obj.type=='MESH']
    checks={}
    for name,(a,b) in routes.items():
        delta=Vector((b[0]-a[0],b[1]-a[1],0))
        length=delta.length
        forward=delta.normalized()
        cross=Vector((-forward.y,forward.x,0))
        max_step=0
        for offset in [-0.3,0,0.3]:
            last=None
            for i in range(math.ceil(length/0.05)+1):
                distance=min(i*0.05,length)
                point=Vector((a[0],a[1],5))+forward*distance+cross*offset
                heights=[]
                for obj in floor_objects:
                    inv=obj.matrix_world.inverted()
                    hit,loc,normal,face=obj.ray_cast(inv@point,Vector((0,0,-1)),depsgraph=depsgraph)
                    if hit:
                        heights.append((obj.matrix_world@loc).z)
                assert heights, f'{name}: floor gap at {tuple(point)}'
                height=max(heights)
                if last is not None:
                    max_step=max(max_step,abs(height-last))
                last=height
        assert max_step<=0.151, (name,max_step)
        checks[name]={'connected_docked':True,'sample_interval_m':0.05,
                      'corridor_width_checked_m':0.6,'max_visual_riser_m':round(max_step,3)}
    assert len(bridge_roots)==3 and len(npcs)==3
    for joint in bridge_roots:
        assert len([o for o in joint.children if o.name.startswith('COL_')])==1
        assert joint.scale==Vector((1,1,1))
    return checks


route_checks=validate_routes()

# Soft mint environment; peach key and lilac fill, with no texture dependencies.
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=40
scene.cycles.use_denoising=True
scene.render.resolution_x=1440
scene.render.resolution_y=1080
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.color=(0.55,0.72,0.66)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(0.55,0.72,0.66,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=0.7
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=0.6
box('PRESENTATION_MINT_GROUND',(0,0,-4.1),(200,200,0.2),mint,'PRESENTATION',None)
for name,pos,power,color,size in [
    ('LIGHT_KEY',(-12,-10,26),3100,(1,0.83,0.7),12),
    ('LIGHT_LILAC',(10,8,20),2200,(0.68,0.57,1),14)]:
    data=bpy.data.lights.new(name,'AREA')
    data.energy=power
    data.color=color
    data.shape='DISK'
    data.size=size
    obj=bpy.data.objects.new(name,data)
    collections['PRESENTATION'].objects.link(obj)
    obj.location=pos
    obj.rotation_euler=(Vector((0,2,0))-obj.location).to_track_quat('-Z','Y').to_euler()

views=[('01_game_three_quarter',(30,-38,34),(0,3,0),41),
       ('02_top_layout',(0,3,55),(0,3,0),38),
       ('03_reverse_connections',(-30,-25,23),(0,3,0.8),40)]
for name,pos,target,scale in views:
    data=bpy.data.cameras.new('CAM_'+name)
    data.type='ORTHO'
    data.ortho_scale=scale
    obj=bpy.data.objects.new('CAM_'+name,data)
    collections['PRESENTATION'].objects.link(obj)
    obj.location=pos
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    scene.camera=obj
    if not args.skip_renders:
        scene.render.filepath=str(OUT/'previews'/(name+'.png'))
        bpy.ops.render.render(write_still=True)

# glTF is a review convenience. Final optimization happens only after approval.
export_objects=[o for group in ['STATIC_WALK','PUZZLE_PARTS','ARCHITECTURE',
                 'NPC_PLACEHOLDERS','DECOR_OFF_ROUTE'] for o in collections[group].objects]
bpy.ops.object.select_all(action='DESELECT')
for obj in export_objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'echo_district_blockout.glb'),
    export_format='GLB',use_selection=True,export_yup=True,export_extras=True,
    export_cameras=False,export_lights=False,export_materials='EXPORT')

inventory=[]
for obj in sorted(bpy.data.objects,key=lambda o:o.name):
    triangles=0
    if obj.type=='MESH':
        obj.data.calc_loop_triangles()
        triangles=len(obj.data.loop_triangles)
    inventory.append({'name':obj.name,'collection':obj.users_collection[0].name,
        'type':obj.type,'parent':obj.parent.name if obj.parent else None,
        'origin_blender_m':[round(v,4) for v in obj.location],
        'triangles':triangles,'materials':[m.name for m in obj.data.materials] if obj.type=='MESH' else []})

scene.camera=bpy.data.objects['CAM_01_game_three_quarter']
collections['COLLISION'].hide_viewport=True
collections['COLLISION'].hide_render=True
scene['review_status']='Awaiting user layout approval; no detailing or gameplay integration'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'echo_district_blockout.blend'))
report={'stage':'blockout_pending_layout_approval','blender_version':bpy.app.version_string,
    'background_mode':bpy.app.background,'units':'meters','district_playable_bounds_blender':[-16,15,-5,14.5],
    'visual_glb_triangles':sum(row['triangles'] for row in inventory if row['name'] in {o.name for o in export_objects}),
    'collision_triangles':sum(row['triangles'] for row in inventory if row['collection']=='COLLISION'),
    'material_count':len(MATERIALS),'materials':[m.name for m in MATERIALS],
    'routes':route_checks,'inventory':inventory,
    'files':{str(p.relative_to(OUT)):p.stat().st_size for p in sorted(OUT.rglob('*')) if p.is_file() and p.suffix in ['.blend','.glb','.png','.py']}}
(OUT/'blockout_report.json').write_text(json.dumps(report,indent=2)+'\n')
print('ECHO_BLOCKOUT_OK',json.dumps({k:report[k] for k in ['visual_glb_triangles','collision_triangles','material_count','routes']}))
