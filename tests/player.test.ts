import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as animation from "../lib/game/keeper-animation";
it("plays the actual keeper clips, returns from one-shot Interact, and disposes cleanly", async () => {
  const bytes = await readFile("public/models/echo-player.glb");
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const root = clone(gltf.scene);
  const player = animation.createKeeperAnimation(root, gltf.animations);
  player.update(false, 0, false, 0.1);
  expect(player.active).toBe("Idle");
  player.update(true, 0, false, 0.2);
  expect(player.active).toBe("Walk");
  player.update(false, 1, false, 0.1);
  expect(player.active).toBe("Interact");
  player.update(false, 1, false, 1.3);
  player.update(false, 1, false, 0.1);
  expect(player.active).toBe("Idle");
  player.update(true, 1, true, 0.1);
  expect(player.active).toBe("Idle");
  const materials = new Set();
  root.traverse((o) => {
    if ("material" in o) materials.add(o.material);
  });
  expect(materials.size).toBe(4);
  expect(gltf.animations.map((c) => c.name).sort()).toEqual([
    "Idle",
    "Interact",
    "Walk",
  ]);
  expect(root.position.length()).toBe(0);
  const walk = player.mixer.clipAction(
    gltf.animations.find((c) => c.name === "Walk")!,
  );
  player.dispose();
  expect(walk.isRunning()).toBe(false);
});
it("does not replay an old interaction when a view remounts", async () => {
  const bytes = await readFile("public/models/echo-player.glb");
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const player = animation.createKeeperAnimation(
    clone(gltf.scene),
    gltf.animations,
  );
  player.update(false, 7, false, 0.1);
  expect(player.active).toBe("Idle");
  player.update(false, 8, false, 0.1);
  expect(player.active).toBe("Interact");
  player.dispose();
});
it("loads the delivered district with separate movable parents and matching NPC spawns", async () => {
  const bytes = await readFile("public/models/echo-district.glb");
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  gltf.scene.updateMatrixWorld(true);
  const { Vector3 } = await import("three");
  for (const [name, expected] of [
    ["NPC_SPAWN_01_MIRAI", [-12.9, 0.6, 0.8]],
    ["NPC_SPAWN_02_DEVI", [12, 0, 1]],
    ["NPC_SPAWN_03_ILYAS", [0, 1.5, -11.5]],
    ["PUZZLE_BRIDGE_01_GARDEN", [-8, 0.6, 0]],
    ["PUZZLE_BRIDGE_02_DOCK", [6, 0, 1]],
    ["PUZZLE_BRIDGE_03_ARCHIVE", [0, 1.5, -8]],
  ] as [string, number[]][]) {
    const object = gltf.scene.getObjectByName(name);
    expect(object, `runtime node ${name}`).toBeDefined();
    const pos = object!.getWorldPosition(new Vector3()).toArray();
    pos.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 4));
  }
  expect(gltf.scene.getObjectByName("COL_WALK_PLAZA")).toBeUndefined();
});
