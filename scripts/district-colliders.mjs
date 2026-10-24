// Rebuild navigation data from the delivered collision GLB, never the visual mesh.
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Box3, Vector3 } from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
const bytes = await readFile(
  new URL("../public/models/echo-district-collision.glb", import.meta.url),
);
const hash = createHash("sha256").update(bytes).digest("hex");
if (hash !== "43f03fd8c91155327f6c0364a721e402d9cac337af92f8f556155e043a318835")
  throw Error("Unexpected collision asset");
const gltf = await new GLTFLoader().parseAsync(
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  "",
);
gltf.scene.updateMatrixWorld(true);
const round = (n) => Math.round(n * 10000) / 10000;
const colliders = [];
gltf.scene.traverse((o) => {
  if (!o.isMesh) return;
  const box = new Box3().setFromObject(o);
  let parent = o.parent;
  while (parent && !parent.name.startsWith("PUZZLE_BRIDGE_"))
    parent = parent.parent;
  const shape = {
    name: o.name,
    x0: round(box.min.x),
    z0: round(box.min.z),
    x1: round(box.max.x),
    z1: round(box.max.z),
    y0: round(box.min.y),
    y1: round(box.max.y),
    bridge: parent?.name ?? null,
  };
  const floor = /^COL_(WALK_|MEMORY_|BRIDGE_)/.test(o.name);
  if (floor) {
    const geo = o.geometry,
      pos = geo.attributes.position,
      idx = geo.index;
    for (let i = 0; i < (idx?.count ?? pos.count); i += 3) {
      const pts = [0, 1, 2].map((k) =>
        new Vector3()
          .fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k)
          .applyMatrix4(o.matrixWorld),
      );
      const normal = new Vector3()
        .subVectors(pts[1], pts[0])
        .cross(new Vector3().subVectors(pts[2], pts[0]))
        .normalize();
      if (normal.y > 0.5) {
        const a = -normal.x / normal.y,
          b = -normal.z / normal.y,
          c = pts[0].y - a * pts[0].x - b * pts[0].z;
        shape.plane = [round(a), round(b), round(c)];
        break;
      }
    }
    if (!shape.plane) throw Error(`Missing top plane ${o.name}`);
  }
  colliders.push(shape);
});
if (colliders.length !== 64) throw Error("Expected all 64 collision proxies");
const out = JSON.stringify({ sourceSha256: hash, colliders }, null, 2) + "\n";
const target = new URL("../lib/game/district-colliders.json", import.meta.url);
if (process.argv.includes("--check")) {
  if ((await readFile(target, "utf8")) !== out)
    throw Error("Collision manifest is stale; regenerate it");
} else await writeFile(target, out);
console.log(
  `Derived ${colliders.length} proxies, ${colliders.filter((c) => c.plane).length} walking surfaces`,
);
