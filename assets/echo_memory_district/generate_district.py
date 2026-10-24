"""ECHO district: detailed asset using the approved layout, Blender 4.5 LTS.

blender --background --factory-startup --python generate_district.py -- --output DIR
No application imports, downloads, randomness, textures, or external add-ons.
"""
import argparse
import json
import math
import hashlib
from pathlib import Path
import struct
import sys

import bpy
import bmesh
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
             'COLLISION', 'DECOR_OFF_ROUTE', 'REVIEW_LABELS', 'PRESENTATION', 'EXPORT_BATCHES']:
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
brass = material('MAT_Brass', (0.63, 0.40, 0.17))
brass.node_tree.nodes['Principled BSDF'].inputs['Metallic'].default_value = 0.35
glow = material('MAT_Memory_Glow', (0.68, 0.96, 0.82))
glow_bsdf = glow.node_tree.nodes['Principled BSDF']
glow_bsdf.inputs['Emission Color'].default_value = (0.40, 0.87, 0.70, 1)
glow_bsdf.inputs['Emission Strength'].default_value = 0.65
MATERIALS = [ivory, peach, lilac, mint, ink, brass, glow]
root = bpy.data.objects.new('ECHO_DISTRICT_ROOT', None)
collections['STATIC_WALK'].objects.link(root)
root['asset_stage'] = 'DETAILED_ASSET_LAYOUT_APPROVED'
root['layout_approval'] = 'User approved blockout e8effb8; positions and heights preserved'
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


component_meshes = {}


def box(name, center, size, mat, collection='ARCHITECTURE', parent=root):
    key = ('box', tuple(round(v, 6) for v in size), mat.name)
    if key not in component_meshes:
        sx, sy, sz = (v/2 for v in size)
        verts = [(x*sx,y*sy,z*sz) for x,y,z in
                 [(-1,-1,-1),(-1,-1,1),(-1,1,-1),(-1,1,1),
                  (1,-1,-1),(1,-1,1),(1,1,-1),(1,1,1)]]
        faces = [(0,2,6,4),(1,5,7,3),(0,4,5,1),
                 (2,3,7,6),(0,1,3,2),(4,6,7,5)]
        obj = mesh(name, verts, faces, mat, collection, parent)
        component_meshes[key] = obj.data
    else:
        obj = bpy.data.objects.new(name, component_meshes[key])
        collections[collection].objects.link(obj)
        obj.parent = parent
    obj.location = center
    return obj


def mesh(name, verts, faces, mat, collection, parent=root):
    data = bpy.data.meshes.new(name + '_mesh')
    data.from_pydata(verts, [], faces)
    data.update()
    bm=bmesh.new()
    bm.from_mesh(data)
    if all(edge.is_manifold for edge in bm.edges):
        bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
        bm.to_mesh(data)
    bm.free()
    obj = bpy.data.objects.new(name, data)
    collections[collection].objects.link(obj)
    obj.parent = parent
    data.materials.append(mat)
    return obj


def cylinder(name, center, radius, depth, mat, vertices=16, collection='ARCHITECTURE'):
    key = ('cylinder', radius, depth, vertices, mat.name)
    if key not in component_meshes:
        bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=center)
        obj = place(bpy.context.object, name, collection, mat)
        component_meshes[key] = obj.data
    else:
        obj = bpy.data.objects.new(name, component_meshes[key])
        collections[collection].objects.link(obj)
        obj.parent = root
        obj.location = center
    return obj


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


def beam(name, a, b, thickness, mat, collection='ARCHITECTURE', parent=root):
    a, b = Vector(a), Vector(b)
    obj = box(name, (a+b)/2, ((b-a).length, thickness, thickness), mat, collection, parent)
    obj.rotation_euler = (b-a).to_track_quat('X', 'Z').to_euler()
    return obj


def ring(name, center, inner, outer, mat, segments=32, collection='ARCHITECTURE'):
    verts = [(r*math.cos(i*math.tau/segments), r*math.sin(i*math.tau/segments), 0)
             for i in range(segments) for r in (inner, outer)]
    faces = [(2*i,2*i+1,2*((i+1)%segments)+1,2*((i+1)%segments)) for i in range(segments)]
    obj = mesh(name, verts, faces, mat, collection)
    obj.location = center
    return obj


rail_post_positions=set()


def railing(name, a, b, z, parent=root, collection='ARCHITECTURE'):
    delta = Vector((b[0]-a[0], b[1]-a[1], 0))
    length = delta.length
    direction = delta.normalized()
    count = max(1, math.ceil(length/0.85))
    for i in range(count+1):
        x,y,_ = Vector((*a,0)) + direction*(length*i/count)
        key=(parent.name,round(x,5),round(y,5),round(z,5))
        if key in rail_post_positions:
            continue
        rail_post_positions.add(key)
        box(f'{name}_POST_{i:02}',(x,y,z+0.46),(.09,.09,.92),ivory,collection,parent)
        box(f'{name}_CAP_{i:02}',(x,y,z+0.95),(.15,.15,.08),peach,collection,parent)
    for h,mat,thickness in [(0.92,brass,0.075),(0.25,ivory,0.06)]:
        beam(name+f'_BAR_{h}',(*a,z+h),(*b,z+h),thickness,mat,collection,parent)
    guard=box('COL_'+name,((a[0]+b[0])/2,(a[1]+b[1])/2,z+0.5),
              (length,.15,1),ink,'COLLISION',parent)
    guard.rotation_euler.z=math.atan2(delta.y,delta.x)
    collider(guard)


def arched_panel(name, center, width, height, mat):
    r=width/2
    spring=height-r
    verts=[(-r,0,0),(r,0,0)]
    verts += [(r*math.cos(i*math.pi/12),0,spring+r*math.sin(i*math.pi/12)) for i in range(13)]
    obj=mesh(name,verts,[tuple(range(len(verts)))],mat,'ARCHITECTURE')
    obj.location=center
    return obj


def planter(name, x, y, z, tree=False):
    box(name+'_PLINTH',(x,y,z+.12),(1.16,1.16,.24),ivory)
    box(name+'_VESSEL',(x,y,z+.38),(1.02,1.02,.32),peach)
    box(name+'_SOIL',(x,y,z+.55),(.84,.84,.03),lilac)
    collider(box('COL_'+name,(x,y,z+.3),(1.16,1.16,.6),ink,'COLLISION'))
    if tree:
        cylinder(name+'_TRUNK',(x,y,z+1.2),.09,1.3,brass,8)
        for j,(ox,oy,oz,radius) in enumerate([(0,0,2.1,.72),(-.3,.06,1.75,.52),(.25,-.1,1.8,.48)]):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=radius,location=(x+ox,y+oy,z+oz))
            place(bpy.context.object,name+f'_CROWN_{j}','ARCHITECTURE',mint)
    else:
        for j,(ox,oy) in enumerate([(-.22,-.18),(.22,-.12),(0,.21)]):
            bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.31,location=(x+ox,y+oy,z+.78))
            place(bpy.context.object,name+f'_SHRUB_{j}','ARCHITECTURE',mint)


# Layered floating foundations keep the approved walking surfaces and footprints.
districts=[('PLAZA',0,0,12,10,0),('GARDEN',-13,0,6,6,.6),
           ('DOCK',12,-1,6,7,0),('ARCHIVE',0,12,6,5,1.5)]
for name,x,y,sx,sy,z in districts:
    box('BASE_'+name+'_CORNICE',(x,y,z-.72),(sx+.08,sy+.08,.18),peach)
    box('BASE_'+name+'_SHADOW',(x,y,z-.94),(sx-.45,sy-.45,.28),lilac)
    box('BASE_'+name+'_CORE',(x,y,z-1.7),(sx-.8,sy-.8,1.3),ivory)
    box('BASE_'+name+'_FOOT',(x,y,z-2.38),(sx-1.15,sy-1.15,.18),peach)
    for j in range(max(2,round(sx/1.6))):
        xx=x-(sx-1.6)/2+j*(sx-1.6)/max(1,round(sx/1.6)-1)
        box(f'BASE_{name}_RIB_{j:02}',(xx,y-sy/2+.43,z-1.7),(.18,.18,1.45),peach)
        arched_panel(f'BASE_{name}_NICHE_{j:02}',(xx+.42,y-sy/2+.32,z-2.13),.36,.88,lilac)

# Shared paving, mosaic rings and signal traces define the plaza without walls.
for i in range(6):
    for j in range(5):
        x,y=-5+i*2,-4+j*2
        for ox in [-.84,.84]:
            box(f'PAVE_JOINT_{i}_{j}_{ox}',(x+ox,y,.006),(.014,1.74,.012),peach)
        box(f'PAVE_JOINT_H_{i}_{j}',(x,y+.87,.006),(1.7,.014,.012),peach)
ring('PLAZA_MOSAIC_OUTER',(0,0,.016),2.08,2.16,peach,48)
ring('PLAZA_MOSAIC_INNER',(0,0,.018),1.42,1.47,brass,48)
for i in range(12):
    angle=i*math.tau/12
    tile=box(f'PLAZA_MOSAIC_TILE_{i:02}',(1.8*math.cos(angle),1.8*math.sin(angle),.014),
             (.22,.22,.025),mint if i%3 else lilac)
    tile.rotation_euler.z=angle+math.pi/4
for suffix,points in [('WEST',[(-x,0) for x in [2.6,3.3,4,4.7,5.4]]),
                      ('EAST',[(x,-1) for x in [2.6,3.3,4,4.7,5.4]]),
                      ('NORTH',[(0,y) for y in [2.6,3.3,4,4.7]])]:
    for i,(x,y) in enumerate(points):
        box(f'TRACE_{suffix}_{i}',(x,y,.019),(.23,.23,.028),mint)

# The relay is a compact astrolabe, keeping its original solid footprint.
cylinder('RELAY_BASE_RING',(0,0,.12),.79,.24,peach,24)
ring('RELAY_TOP_RIM',(0,0,1.12),.6,.8,brass,32)
orb=ring('RELAY_ASTROLABE',(0,0,1.58),.64,.7,brass,32)
orb.rotation_euler=(math.radians(65),0,math.radians(-25))
bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=.3,location=(0,0,1.55))
place(bpy.context.object,'RELAY_MEMORY_CORE','ARCHITECTURE',glow)
for i in range(8):
    angle=i*math.tau/8
    cylinder(f'RELAY_INLAY_{i}',(.805*math.cos(angle),.805*math.sin(angle),.54),.035,.5,brass,6)
collider(box('COL_RELAY_UPPER',(0,0,1.42),(1.5,1.5,.84),ink,'COLLISION'))

# Open rails stop at every route opening; bridge rails stay under their joint.
for name,a,b in [
    ('PLAZA_SOUTH_L',(-5.85,-4.85),(-1.5,-4.85)),
    ('PLAZA_SOUTH_R',(1.5,-4.85),(5.85,-4.85)),
    ('PLAZA_WEST_S',(-5.85,-4.85),(-5.85,-1.55)),
    ('PLAZA_WEST_N',(-5.85,1.55),(-5.85,4.85)),
    ('PLAZA_EAST_S',(5.85,-4.85),(5.85,-2.55)),
    ('PLAZA_EAST_N',(5.85,.55),(5.85,4.85)),
    ('PLAZA_NORTH_L',(-5.85,4.85),(-1.55,4.85)),
    ('PLAZA_NORTH_R',(1.55,4.85),(5.85,4.85))]:
    railing('RAIL_'+name,a,b,0)
for suffix,start,direction,length in bridge_specs:
    joint=bpy.data.objects['PUZZLE_BRIDGE_'+suffix]
    dx,dy=direction
    for side in [-1,1]:
        a=(dx*.07-dy*side*1.31,dy*.07+dx*side*1.31)
        b=(dx*(length-.08)-dy*side*1.31,dy*(length-.08)+dx*side*1.31)
        railing('RAIL_BRIDGE_'+suffix+str(side),a,b,0,joint,'PUZZLE_PARTS')
    for i in range(max(1,int(length/.45))):
        dist=.22+i*.45
        size=(.025,2.5,.012) if dx else (2.5,.025,.012)
        box(f'BRIDGE_JOINT_{suffix}_{i}',(dx*dist,dy*dist,.009),size,peach,'PUZZLE_PARTS',joint)
    # Roman numeral inlays identify the bridges without exported text.
    for i in range(int(suffix[:2])):
        side=(i-(int(suffix[:2])-1)/2)*.16
        size=(.35,.055,.015) if dx else (.055,.35,.015)
        box(f'BRIDGE_ID_{suffix}_{i}',(dx*length/2-dy*side,dy*length/2+dx*side,.03),
            size,brass,'PUZZLE_PARTS',joint)

# Fixed stair guards are closed wedges, following the continuous ramp proxies.
for name,start,direction,length,rise,count in [
    ('GARDEN',(-6,0,0),(-1,0),2,.6,4),
    ('ARCHIVE',(0,5,0),(0,1),3,1.5,10)]:
    dx,dy=direction
    x,y,z=start
    for side in [-1,1]:
        a=(x-dy*side*1.31,y+dx*side*1.31,z+.98)
        b=(a[0]+dx*length,a[1]+dy*length,z+rise+.98)
        beam(f'STAIR_{name}_HANDRAIL_{side}',a,b,.075,brass)
        for i in range(count+1):
            t=i/count
            box(f'STAIR_{name}_POST_{side}_{i}',
                (a[0]+dx*length*t,a[1]+dy*length*t,z+rise*t+.49),(.075,.075,.98),ivory)
        verts=[]
        for along,h in [(0,0),(length,rise),(length,rise+1),(0,1)]:
            for across in [-.075,.075]:
                verts.append((a[0]+dx*along-dy*across,a[1]+dy*along+dx*across,z+h))
        collider(mesh(f'COL_STAIR_{name}_GUARD_{side}',verts,
            [(0,2,3,1),(2,4,5,3),(4,6,7,5),(6,0,1,7),(0,6,4,2),(1,3,5,7)],ink,'COLLISION'))

for name,x,y,sx,sy,z in districts[1:]:
    x0,x1,y0,y1=x-sx/2+.14,x+sx/2-.14,y-sy/2+.14,y+sy/2-.14
    if name=='GARDEN':
        segments=[((x0,y0),(x0,y1)),((x0,y0),(x1,y0)),((x0,y1),(x1,y1)),
                  ((x1,y0),(x1,-1.55)),((x1,1.55),(x1,y1))]
    elif name=='DOCK':
        segments=[((x1,y0),(x1,y1)),((x0,y0),(x1,y0)),((x0,y1),(x1,y1)),
                  ((x0,y0),(x0,-2.55)),((x0,.55),(x0,y1))]
    else:
        segments=[((x0,y0),(x0,y1)),((x1,y0),(x1,y1)),((x0,y1),(x1,y1)),
                  ((x0,y0),(-1.55,y0)),((1.55,y0),(x1,y0))]
    for i,(a,b) in enumerate(segments):
        railing(f'RAIL_{name}_{i}',a,b,z)

# Tower cornices, inset arch windows and faceted roofs reuse simple components.
for name,x,y,z,h in [('GARDEN',-15.2,1.8,.6,3.4),('DOCK',14.1,1.3,0,4.2),
                    ('ARCHIVE',2.25,13.5,1.5,4.4)]:
    for dz,width in [(.12,1.4),(h-.24,1.32),(h+.34,1.65)]:
        box(f'TOWER_{name}_CORNICE_{dz}',(x,y,z+dz),(width,width,.14),ivory)
    for i in range(2):
        arched_panel(f'TOWER_{name}_WINDOW_{i}',(x,y-.606,z+.65+i*1.45),.48,1.12,lilac)
        box(f'TOWER_{name}_SILL_{i}',(x,y-.66,z+.62+i*1.45),(.65,.22,.1),peach)
        box(f'TOWER_{name}_MULLION_{i}',(x,y-.62,z+1.05+i*1.45),(.035,.035,.7),mint)
    verts=[(-.82,-.82,0),(.82,-.82,0),(.82,.82,0),(-.82,.82,0),
           (-.19,-.19,.78),(.19,-.19,.78),(.19,.19,.78),(-.19,.19,.78)]
    roof=mesh('TOWER_'+name+'_ROOF',verts,
        [(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)],peach,'ARCHITECTURE')
    roof.location=(x,y,z+h+.4)
    cylinder('TOWER_'+name+'_FINIAL',(x,y,z+h+1.3),.075,.33,brass,8)

for name,cx,cy,z,opening,spring,t in [
    ('GARDEN',-13,1.6,.6,2.6,1.9,.45),('ARCHIVE',0,13.3,1.5,2.8,2.7,.55)]:
    radius=opening/2
    for side in [-1,1]:
        x=cx+side*(radius+t/2)
        box(f'ARCH_{name}_BASE_{side}',(x,cy,z+.14),(t+.18,.8,.28),peach)
        box(f'ARCH_{name}_CAPITAL_{side}',(x,cy,z+spring-.07),(t+.18,.8,.18),peach)
        collider(box(f'COL_ARCH_{name}_POST_{side}',(x,cy,z+spring/2),(t,.65,spring),ink,'COLLISION'))
    for i in range(13):
        angle=i*math.pi/12
        stone=box(f'ARCH_{name}_RADIAL_STONE_{i:02}',
            (cx+(radius+t/2)*math.cos(angle),cy-.38,z+spring+(radius+t/2)*math.sin(angle)),
            (.11,.1,t+.04),peach)
        stone.rotation_euler.y=math.pi/2-angle

planter('GARDEN_TREE',-15,-1.6,.6,True)
planter('GARDEN_HERBS',-11.1,-2.1,.6)
planter('GARDEN_COURT',-11.1,2.25,.6)
for side in [-1,1]:
    box(f'GARDEN_BENCH_LEG_{side}',(-15.05+side*.45,.1,.84),(.15,.42,.48),lilac)
box('GARDEN_BENCH_SEAT',(-15.05,.1,1.11),(1.32,.48,.14),ivory)
collider(box('COL_GARDEN_BENCH',(-15.05,.1,.9),(1.32,.48,.6),ink,'COLLISION'))

# Dock paving, mooring posts and a small open-front station distinguish Devi's area.
for i in range(13):
    box(f'DOCK_DECK_SEAM_{i:02}',(12,-4.15+i*.49,.008),(5.65,.018,.016),peach)
for i,x in enumerate([9.7,12,14.3]):
    cylinder(f'DOCK_BOLLARD_{i}',(x,-3.9,.3),.14,.6,lilac,10)
    cylinder(f'DOCK_BOLLARD_CAP_{i}',(x,-3.9,.59),.2,.09,brass,10)
    collider(box(f'COL_DOCK_BOLLARD_{i}',(x,-3.9,.34),(.4,.4,.68),ink,'COLLISION'))
arch('ARCH_DOCK_STATION',(11.05,1.9,0),1.9,1.9,.3,.45,ivory)
for side in [-1,1]:
    collider(box(f'COL_DOCK_STATION_{side}',(11.05+side*1.1,1.9,.95),(.3,.45,1.9),ink,'COLLISION'))
box('DOCK_STATION_ENTABLATURE',(11.05,1.9,3.2),(3,.8,.26),peach)
box('DOCK_STATION_CANOPY',(11.05,1.75,3.42),(3.25,1.1,.18),ivory)
for i in range(3):
    box(f'DOCK_HANGING_TOKEN_{i}',(10.6+i*.45,1.6,2.75),(.13,.065,.4),mint)

# Archive shelf bays sit outside the NPC interaction circle and approach lane.
for side in [-1,1]:
    x=side*2.2
    box(f'ARCHIVE_SHELF_BACK_{side}',(x,12.25,2.56),(1.0,.22,2.12),lilac)
    for level in range(4):
        box(f'ARCHIVE_SHELF_{side}_{level}',(x,12.0,1.62+level*.58),(1.08,.62,.085),ivory)
        if level<3:
            for j in range(5):
                height=.29+(j%3)*.075
                box(f'ARCHIVE_VOLUME_{side}_{level}_{j}',
                    (x-.37+j*.18,11.98,1.68+level*.58+height/2),(.105,.28,height),
                    [peach,mint,brass][(j+level)%3])
    collider(box(f'COL_ARCHIVE_SHELF_{side}',(x,12.1,2.56),(1.08,.64,2.12),ink,'COLLISION'))
    box(f'ARCHIVE_SEAT_{side}',(side*2.1,10.3,1.78),(1.0,.45,.56),ivory)
    collider(box(f'COL_ARCHIVE_SEAT_{side}',(side*2.1,10.3,1.78),(1.0,.45,.56),ink,'COLLISION'))
ring('ARCHIVE_MEMORY_HALO',(0,13.29,4.6),.32,.39,brass,24).rotation_euler.x=math.pi/2

# Shared data links repeated mesh components in the editable source.
mesh_cache={}
for obj in list(bpy.data.objects):
    if obj.type!='MESH':
        continue
    key=(tuple(tuple(round(v,6) for v in vert.co) for vert in obj.data.vertices),
         tuple(tuple(poly.vertices) for poly in obj.data.polygons),
         tuple(mat.name for mat in obj.data.materials))
    if key in mesh_cache:
        obj.data=mesh_cache[key]
    else:
        mesh_cache[key]=obj.data


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
    # Check the approved routes and new props with a 0.3 m-radius character.
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
        for offset in [-0.9,-0.3,0,0.3,0.9]:
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
                for obstacle in collections['COLLISION'].objects:
                    if obstacle.name.startswith(('COL_WALK_', 'COL_MEMORY_', 'COL_BRIDGE_')):
                        continue
                    corners=[obstacle.matrix_world@Vector(v) for v in obstacle.bound_box]
                    low=Vector(tuple(min(v[j] for v in corners) for j in range(3)))
                    high=Vector(tuple(max(v[j] for v in corners) for j in range(3)))
                    if high.z<=height+.10 or low.z>=height+1.7:
                        continue
                    distance=math.hypot(max(low.x-point.x,0,point.x-high.x),
                                        max(low.y-point.y,0,point.y-high.y))
                    assert distance>=.299, f'{name}: blocked by {obstacle.name} at {tuple(point)}'
                if last is not None:
                    max_step=max(max_step,abs(height-last))
                last=height
        assert max_step<=0.151, (name,max_step)
        checks[name]={'connected_docked':True,'sample_interval_m':0.05,
                      'corridor_width_checked_m':1.8,'character_radius_m':0.3,
                      'obstacle_clearance_checked':True,'max_visual_riser_m':round(max_step,3)}
    assert len(bridge_roots)==3 and len(npcs)==3
    for joint in bridge_roots:
        assert len([o for o in joint.children if o.name.startswith('COL_')])==3
        assert joint.scale==Vector((1,1,1))
        before={o.name:o.matrix_world.copy() for o in bpy.data.objects if o.parent!=joint and o!=joint}
        deck=bpy.data.objects['BRIDGE_DECK_'+joint.name.removeprefix('PUZZLE_BRIDGE_')]
        old=deck.matrix_world.translation.copy()
        joint.rotation_euler.z=math.pi/2
        scene.view_layers[0].update()
        assert (deck.matrix_world.translation-old).length>.5
        assert all(all(abs(o.matrix_world[r][c]-before[o.name][r][c])<1e-6
                   for r in range(4) for c in range(4))
                   for o in bpy.data.objects if o.name in before)
        joint.rotation_euler.z=0
        scene.view_layers[0].update()
    for name,x,y,z in npcs:
        for obstacle in collections['COLLISION'].objects:
            if obstacle.name.startswith(('COL_WALK_','COL_MEMORY_','COL_BRIDGE_')):
                continue
            corners=[obstacle.matrix_world@Vector(v) for v in obstacle.bound_box]
            low=[min(v[j] for v in corners) for j in range(3)]
            high=[max(v[j] for v in corners) for j in range(3)]
            if high[2]<=z+.1 or low[2]>=z+1.7:
                continue
            distance=math.hypot(max(low[0]-x,0,x-high[0]),max(low[1]-y,0,y-high[1]))
            assert distance>=1.2, f'{name}: interaction space blocked by {obstacle.name}'
    return checks


route_checks=validate_routes()

# Soft mint environment; peach key and lilac fill, with no texture dependencies.
scene.render.engine='CYCLES'
scene.cycles.device='CPU'
scene.cycles.samples=64
scene.cycles.use_denoising=True
scene.render.resolution_x=1920
scene.render.resolution_y=1440
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.world.color=(0.55,0.72,0.66)
scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(0.55,0.72,0.66,1)
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=0.6
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=0.6
box('PRESENTATION_MINT_GROUND',(0,0,-4.1),(200,200,0.2),mint,'PRESENTATION',None)
for name,pos,power,color,size in [
    ('LIGHT_KEY',(-12,-10,26),4500,(1,0.83,0.7),10),
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
        collections['REVIEW_LABELS'].hide_render = name!='02_top_layout'
        scene.render.filepath=str(OUT/'previews'/(name+'.png'))
        bpy.ops.render.render(write_still=True)

# Batch static meshes by sector/material, while keeping the source editable.
scene.view_layers[0].update()
batches={}
sources=[o for group in ['STATIC_WALK','ARCHITECTURE','DECOR_OFF_ROUTE','PUZZLE_PARTS']
         for o in collections[group].objects if o.type=='MESH']
for obj in sources:
    if obj.parent in bridge_roots:
        sector=obj.parent.name
        parent=obj.parent
        origin=Vector((0,0,0))
        transform=parent.matrix_world.inverted()@obj.matrix_world
    else:
        x,y,z=obj.matrix_world.translation
        sector=('DECOR' if obj.users_collection[0].name=='DECOR_OFF_ROUTE' else
                'GARDEN' if x<-7 else 'DOCK' if x>7 else 'ARCHIVE' if y>8 else 'PLAZA')
        parent=root
        origin=Vector({'GARDEN':(-13,0,.6),'DOCK':(12,-1,0),
                       'ARCHIVE':(0,12,1.5),'PLAZA':(0,0,0),'DECOR':(-9,10,0)}[sector])
        transform=obj.matrix_world.copy()
    mat=obj.data.materials[0]
    key=(sector,mat.name)
    group=batches.setdefault(key,{'vertices':[],'faces':[],'sources':[],
                                 'parent':parent,'origin':origin,'mat':mat})
    offset=len(group['vertices'])
    group['vertices'] += [tuple(transform@v.co-origin) for v in obj.data.vertices]
    group['faces'] += [tuple(offset+i for i in poly.vertices) for poly in obj.data.polygons]
    group['sources'].append(obj.name)
export_objects=[root]+bridge_roots+[o for o in collections['NPC_PLACEHOLDERS'].objects if o.type=='EMPTY']
for (sector,mat_name),group in sorted(batches.items()):
    obj=mesh('VIS_'+sector+'_'+mat_name.removeprefix('MAT_'),group['vertices'],
             group['faces'],group['mat'],'EXPORT_BATCHES',group['parent'])
    obj.location=group['origin']
    obj['role']='visual_batch'
    obj['sector']=sector
    obj['source_objects']=group['sources']
    export_objects.append(obj)


def export_glb(path, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,
        export_yup=True,export_extras=True,export_cameras=False,export_lights=False,
        export_materials='EXPORT',export_animations=False,export_skins=False,
        export_morph=False,use_visible=False,use_renderable=False)


export_glb(OUT/'echo_district.glb',export_objects)
collision_objects=list(collections['COLLISION'].objects)
export_glb(OUT/'echo_district_collision.glb',[root]+bridge_roots+collision_objects)


def glb_metrics(path):
    data=path.read_bytes()
    magic,version,length=struct.unpack_from('<III',data)
    assert magic==0x46546C67 and version==2 and length==len(data)
    chunk_length,chunk_type=struct.unpack_from('<II',data,12)
    assert chunk_type==0x4E4F534A
    gltf=json.loads(data[20:20+chunk_length])
    mesh_triangles=[sum(gltf['accessors'][p['indices']]['count']//3 for p in m['primitives'])
                    for m in gltf['meshes']]
    return {'bytes':len(data),'triangles':sum(mesh_triangles[n['mesh']] for n in gltf['nodes'] if 'mesh' in n),
            'unique_geometry_triangles':sum(mesh_triangles),'nodes':len(gltf['nodes']),
            'mesh_count':len(gltf['meshes']),'materials':len(gltf.get('materials',[])),
            'draw_calls_estimate':sum(len(gltf['meshes'][n['mesh']]['primitives']) for n in gltf['nodes'] if 'mesh' in n),
            'sha256':hashlib.sha256(data).hexdigest()},gltf


visual_stats,visual_doc=glb_metrics(OUT/'echo_district.glb')
collision_stats,collision_doc=glb_metrics(OUT/'echo_district_collision.glb')
visual_names={n['name']:n for n in visual_doc['nodes']}
collision_names={n['name']:n for n in collision_doc['nodes']}
for joint in bridge_roots:
    assert joint.name in visual_names and joint.name in collision_names
    v=visual_names[joint.name]
    assert v.get('children')
    assert all(visual_doc['nodes'][i]['name'].startswith('VIS_'+joint.name) for i in v['children'])
    expected=(joint.location.x,joint.location.z,-joint.location.y)
    assert all(abs(a-b)<1e-5 for a,b in zip(v['translation'],expected))
for name,*_ in npcs:
    assert 'NPC_SPAWN_'+name in visual_names
assert not any(name.startswith(('COL_','NPC_BODY_','NPC_HEAD_','LABEL_','PRESENTATION_')) for name in visual_names)
assert len([n for n in collision_names if n.startswith('COL_')])==len(collision_objects)
assert visual_stats['materials']==len({o.data.materials[0].name for o in sources})
assert visual_stats['triangles']<20000 and visual_stats['bytes']<1500000
assert visual_stats['draw_calls_estimate']<65

inventory=[]
for obj in sorted(bpy.data.objects,key=lambda o:o.name):
    triangles=0
    if obj.type=='MESH':
        obj.data.calc_loop_triangles()
        triangles=len(obj.data.loop_triangles)
    inventory.append({'name':obj.name,'collection':obj.users_collection[0].name,
        'type':obj.type,'parent':obj.parent.name if obj.parent else None,
        'origin_local_blender_m':[round(v,4) for v in obj.location],
        'origin_world_blender_m':[round(v,4) for v in obj.matrix_world.translation],
        'triangles':triangles,'materials':[m.name for m in obj.data.materials] if obj.type=='MESH' else []})

scene.camera=bpy.data.objects['CAM_01_game_three_quarter']
collections['COLLISION'].hide_viewport=True
collections['COLLISION'].hide_render=True
collections['EXPORT_BATCHES'].hide_viewport=True
collections['EXPORT_BATCHES'].hide_render=True
collections['REVIEW_LABELS'].hide_viewport=True
collections['REVIEW_LABELS'].hide_render=True
scene['review_status']='Approved blockout detailed; gameplay integration remains a separate task'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'echo_district.blend'))
source_stats={'objects':len(sources),'triangles':sum(len(o.data.loop_triangles) for o in sources),
              'unique_meshes':len({o.data.name for o in sources}),
              'shared_mesh_objects':sum(o.data.users>1 for o in sources)}
report={'stage':'detailed_layout_approved','blender_version':bpy.app.version_string,
    'background_mode':bpy.app.background,'units':'meters','district_playable_bounds_blender':[-16,15,-5,14.5],
    'visual_glb':visual_stats,'collision_glb':collision_stats,'editable_source':source_stats,
    'material_count':visual_stats['materials'],'materials':[m['name'] for m in visual_doc['materials']],
    'source_materials':[m.name for m in MATERIALS],
    'routes':route_checks,'inventory':inventory,
    'files':{str(p.relative_to(OUT)):p.stat().st_size for p in sorted(OUT.rglob('*')) if p.is_file() and p.suffix in ['.blend','.glb','.png','.py']}}
(OUT/'asset_report.json').write_text(json.dumps(report,indent=2)+'\n')
validation={'background_generation':'PASS','actual_mesh_route_tests':route_checks,
    'bridge_independent_rotation':'PASS: each bridge rotated 90 degrees; other objects unchanged; restored docked',
    'npc_interaction_clearance':'PASS: 1.2 m radius around each spawn clear of obstacle proxies',
    'glb_structure':'PASS: hierarchy, collision separation, NPC markers, Y-up pivots, budgets',
    'gameplay_integration':'Not performed; existing application and gameplay code unchanged'}
(OUT/'validation_report.json').write_text(json.dumps(validation,indent=2)+'\n')
lines=['# ECHO detailed asset report','','Approved layout preserved; detailed visual and collision exports.','',
       '| Measure | Visual GLB | Collision GLB |','| --- | --- | --- |']
for metric in ['bytes','triangles','unique_geometry_triangles','nodes','mesh_count','materials','draw_calls_estimate']:
    lines.append(f'| {metric} | {visual_stats[metric]:,} | {collision_stats[metric]:,} |')
lines+=['','Triangles count every mesh instance. Draw calls estimate one call per visible primitive; renderer passes may add calls.',
        '',f'Editable source: {source_stats["objects"]} mesh objects, {source_stats["unique_meshes"]} unique meshes, '
        f'{source_stats["shared_mesh_objects"]} objects using shared mesh data.','',
        '## File sizes','','| File | Bytes |','| --- | --- |']
for name,size in report['files'].items():
    lines.append(f'| {name} | {size:,} |')
lines+=['','## Materials','',', '.join(m.name for m in MATERIALS),
        '', 'The visual GLB uses six materials. MAT_Ink is reserved for preview characters and collision geometry.',
        '', '## Named integration objects','']
lines += ['- `'+name+'`' for name in visual_names]
lines += ['','`asset_report.json` contains every editable and export object name, local/world origin, parent, collection, triangle count and material assignment. `README.md` documents scale, axes and pivots.',
          '', 'Visual SHA-256: `'+visual_stats['sha256']+'`',
          '', 'Collision SHA-256: `'+collision_stats['sha256']+'`',
          '', 'No application or gameplay integration performed. The existing controller still requires separate floor-height and collision-map integration.']
(OUT/'ASSET_REPORT.md').write_text('\n'.join(lines)+'\n')
print('ECHO_ASSET_OK',json.dumps({'visual':visual_stats,'collision':collision_stats,'routes':route_checks}))
