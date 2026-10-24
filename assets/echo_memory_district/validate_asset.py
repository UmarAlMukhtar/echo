"""Validate exported GLBs with Python's standard library, without Blender."""
from collections import Counter
import json
from pathlib import Path
import struct
import sys


def load(path):
    data=path.read_bytes()
    magic,version,length=struct.unpack_from('<III',data)
    assert (magic,version,length)==(0x46546C67,2,len(data)),path
    n,kind=struct.unpack_from('<II',data,12)
    assert kind==0x4E4F534A
    doc=json.loads(data[20:20+n])
    binary_length,binary_kind=struct.unpack_from('<II',data,20+n)
    assert binary_kind==0x004E4942
    binary=data[28+n:28+n+binary_length]
    return doc,binary


def accessor(doc,binary,index):
    access=doc['accessors'][index]
    view=doc['bufferViews'][access['bufferView']]
    fmt,size={5123:('H',2),5125:('I',4),5126:('f',4)}[access['componentType']]
    components={'SCALAR':1,'VEC3':3}[access['type']]
    start=view.get('byteOffset',0)+access.get('byteOffset',0)
    stride=view.get('byteStride',size*components)
    return [struct.unpack_from('<'+fmt*components,binary,start+i*stride)
            for i in range(access['count'])]


def closed_outward_collision(doc,binary):
    for mesh in doc['meshes']:
        edges=Counter()
        volume=0
        for primitive in mesh['primitives']:
            assert primitive.get('mode',4)==4
            positions=accessor(doc,binary,primitive['attributes']['POSITION'])
            indices=[v[0] for v in accessor(doc,binary,primitive['indices'])]
            for i in range(0,len(indices),3):
                a,b,c=(positions[j] for j in indices[i:i+3])
                # Weld exported normal/UV seams before checking manifold edges.
                keys=[tuple(round(v,5) for v in p) for p in (a,b,c)]
                for p,q in [(keys[0],keys[1]),(keys[1],keys[2]),(keys[2],keys[0])]:
                    edges[tuple(sorted((p,q)))]+=1
                volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+
                         a[1]*(b[2]*c[0]-b[0]*c[2])+
                         a[2]*(b[0]*c[1]-b[1]*c[0]))/6
        assert all(count==2 for count in edges.values()),f'Open collision mesh: {mesh["name"]}'
        assert volume>1e-6,f'Inward or zero-volume collision mesh: {mesh["name"]}'


def main(base):
    report=json.loads((base/'asset_report.json').read_text())
    visual,_=load(base/'echo_district.glb')
    collision,binary=load(base/'echo_district_collision.glb')
    closed_outward_collision(collision,binary)
    by_name={n['name']:n for n in visual['nodes']}
    by_collision={n['name']:n for n in collision['nodes']}
    expected={
        'PUZZLE_BRIDGE_01_GARDEN':(-8,.6,0),
        'PUZZLE_BRIDGE_02_DOCK':(6,0,1),
        'PUZZLE_BRIDGE_03_ARCHIVE':(0,1.5,-8),
        'NPC_SPAWN_01_MIRAI':(-12.9,.6,.8),
        'NPC_SPAWN_02_DEVI':(12,0,1),
        'NPC_SPAWN_03_ILYAS':(0,1.5,-11.5),
    }
    for name,position in expected.items():
        assert name in by_name
        assert all(abs(a-b)<1e-5 for a,b in zip(by_name[name]['translation'],position)),name
        if name.startswith('PUZZLE_'):
            assert name in by_collision
            assert len(by_collision[name]['children'])==3
            assert all(visual['nodes'][i]['name'].startswith('VIS_'+name)
                       for i in by_name[name]['children'])
    assert not any(n.startswith(('COL_','NPC_BODY_','NPC_HEAD_','LABEL_')) for n in by_name)
    assert not any(n.startswith('VIS_') for n in by_collision)
    for kind,doc,filename in [('visual_glb',visual,'echo_district.glb'),
                              ('collision_glb',collision,'echo_district_collision.glb')]:
        triangles=sum(sum(doc['accessors'][p['indices']]['count']//3
                         for p in doc['meshes'][n['mesh']]['primitives'])
                      for n in doc['nodes'] if 'mesh' in n)
        assert triangles==report[kind]['triangles']
        assert len(doc.get('materials',[]))==report[kind]['materials']
        assert (base/filename).stat().st_size==report[kind]['bytes']
    assert visual.get('extensionsRequired',[])==[]
    assert not visual.get('images') and not visual.get('textures')
    assert len(visual['materials'])<=7
    assert report['visual_glb']['triangles']<20000
    assert report['visual_glb']['bytes']<1500000
    assert report['visual_glb']['draw_calls_estimate']<65
    assert all(r['connected_docked'] and r['max_visual_riser_m']<=.15 for r in report['routes'].values())
    print(json.dumps({'status':'PASS','visual':report['visual_glb'],
                      'collision':report['collision_glb'],
                      'collision_manifold_outward':'PASS','approved_pivots_and_spawns':'PASS'},indent=2))


if __name__=='__main__':
    main(Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).resolve().parent)
