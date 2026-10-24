// Run from the repository after npm install; uses the game's existing Three.js.
// ECHO_THREE_PACKAGE may point to an isolated package.json for verification.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const base=path.dirname(fileURLToPath(import.meta.url));
const require=createRequire(process.env.ECHO_THREE_PACKAGE||path.join(process.cwd(),'package.json'));
const threeRoot=path.resolve(path.dirname(require.resolve('three')),'..');
const THREE=await import(pathToFileURL(path.join(threeRoot,'build/three.module.js')));
const {GLTFLoader}=await import(pathToFileURL(path.join(threeRoot,'examples/jsm/loaders/GLTFLoader.js')));
const bytes=await fs.readFile(path.join(base,'echo-player.glb'));
const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
const gltf=await new GLTFLoader().parseAsync(buffer,'');
const meshes=[];
const materials=new Map();
gltf.scene.traverse(o=>{
  if(o.isMesh){
    meshes.push(o);
    assert(o.isSkinnedMesh,'All character primitives must be skinned');
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      materials.set(m.name,m);
      assert(!m.map&&!m.normalMap&&!m.roughnessMap,'No external textures');
    }
  }
});
assert.equal(materials.size,4);
assert.equal(meshes.reduce((n,m)=>n+m.geometry.index.count/3,0),2064);
assert(materials.get('Keeper_WarmAccents').vertexColors);
assert.deepEqual(gltf.animations.map(c=>c.name).sort(),['Idle','Interact','Walk']);
const actor=gltf.scene.getObjectByName('EchoPlayer');
assert(actor);
assert(actor.position.length()<1e-7);
const clips={};
for(const clip of gltf.animations){
  const expected={Idle:2.4,Walk:1,Interact:1.2}[clip.name];
  assert(Math.abs(clip.duration-expected)<1e-5);
  for(const track of clip.tracks){
    const n=track.getValueSize();
    for(let i=0;i<n;i++)assert(Math.abs(track.values[i]-track.values[track.values.length-n+i])<1e-5,
      `${clip.name}: loop/end seam in ${track.name}`);
  }
  const mixer=new THREE.AnimationMixer(gltf.scene);
  const action=mixer.clipAction(clip).setLoop(THREE.LoopOnce,1);
  action.clampWhenFinished=true;
  action.play();
  let low=Infinity;
  const head=gltf.scene.getObjectByName('Head');
  const poses=[];
  for(let i=0;i<=30;i++){
    mixer.setTime(clip.duration*i/30);
    gltf.scene.updateMatrixWorld(true);
    for(const mesh of meshes){
      mesh.skeleton.update();
      const p=new THREE.Vector3();
      for(let j=0;j<mesh.geometry.attributes.position.count;j++){
        mesh.getVertexPosition(j,p).applyMatrix4(mesh.matrixWorld);
        assert(Number.isFinite(p.x+p.y+p.z));
        low=Math.min(low,p.y);
      }
    }
    const p=actor.getWorldPosition(new THREE.Vector3());
    assert(p.length()<1e-6,'Actor root must remain at ground origin');
    poses.push(head.getWorldQuaternion(new THREE.Quaternion()).toArray());
  }
  assert(low>=-.002,`${clip.name}: geometry below floor (${low})`);
  assert(poses.some(p=>p.some((v,i)=>Math.abs(v-poses[0][i])>1e-4)),`${clip.name}: animation did not move`);
  clips[clip.name]={duration_s:clip.duration,tracks:clip.tracks.length,minimum_y_m:low,
    endpoints_match:true,root_motion:false,skinning_evaluated:true};
  action.stop();
  mixer.uncacheRoot(gltf.scene);
}
const report={status:'PASS',loader:'Three.js GLTFLoader',three_revision:THREE.REVISION,
  material_count:materials.size,materials:[...materials.keys()],triangles:2064,
  skinned_primitives:meshes.length,clips,vertex_colors_preserved:true};
await fs.writeFile(path.join(base,'three_validation.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
