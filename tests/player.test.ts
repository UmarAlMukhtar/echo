import { expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { Vector3 } from "three";
import * as animation from "../lib/game/keeper-animation";
it("plays the actual keeper clips, returns from one-shot Interact, and disposes cleanly", async () => {
  const { root, player, clips } = await keeperFixture();
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
  expect(player.active).toBe("Walk");
  const materials = new Set();
  root.traverse((o) => {
    if ("material" in o) materials.add(o.material);
  });
  expect(materials.size).toBe(4);
  expect(clips.map((c) => c.name).sort()).toEqual([
    "Idle",
    "Interact",
    "Walk",
  ]);
  expect(root.position.length()).toBe(0);
  const walk = player.mixer.clipAction(
    clips.find((c) => c.name === "Walk")!,
  );
  player.dispose();
  expect(walk.isRunning()).toBe(false);
});

async function keeperFixture() {
  const bytes = await readFile("public/models/echo-player.glb");
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    "",
  );
  const root = clone(gltf.scene);
  const player = animation.createKeeperAnimation(root, gltf.animations);
  return { root, player, clips: gltf.animations };
}

it("keeps both feet stepping and arms swinging when reduced motion is enabled", async () => {
  const { root, player } = await keeperFixture();
  const feet = [root.getObjectByName("FootL")!, root.getObjectByName("FootR")!];
  const arm = root.getObjectByName("UpperArmL")!;
  player.update(false, 0, true, 0);
  const restArm = arm.quaternion.clone();
  const samples: number[][] = [[], []];
  let armSwing = 0;
  for (let frame = 0; frame < 60; frame++) {
    player.update(true, 0, true, 1 / 60);
    root.updateMatrixWorld(true);
    feet.forEach((foot, i) => {
      samples[i].push(foot.getWorldPosition(new Vector3()).z);
    });
    armSwing = Math.max(armSwing, restArm.angleTo(arm.quaternion));
  }
  expect(player.active).toBe("Walk");
  for (const positions of samples) {
    expect(Math.max(...positions) - Math.min(...positions)).toBeGreaterThan(0.15);
  }
  expect(armSwing).toBeGreaterThan(0.1);
  expect(root.position.length()).toBe(0);
  player.dispose();
});

it("uses a brisk normal walk and a calmer reduced-motion step rhythm", async () => {
  const normal = await keeperFixture();
  const reduced = await keeperFixture();
  normal.player.update(true, 0, false, 0.2);
  reduced.player.update(true, 0, true, 0.2);
  const normalTime = normal.player.mixer.clipAction(
    normal.clips.find((c) => c.name === "Walk")!,
  ).time;
  const reducedTime = reduced.player.mixer.clipAction(
    reduced.clips.find((c) => c.name === "Walk")!,
  ).time;
  expect(reducedTime).toBeGreaterThan(0.1);
  expect(normalTime).toBeGreaterThan(reducedTime * 1.4);
  normal.player.dispose();
  reduced.player.dispose();
});

it("settles to a quiet stance after walking and resumes breathing only in normal motion", async () => {
  const { root, player } = await keeperFixture();
  for (let frame = 0; frame < 20; frame++) {
    player.update(true, 0, true, 1 / 60);
  }
  player.update(false, 0, true, 0.2);
  const foot = root.getObjectByName("FootL")!;
  const lantern = root.getObjectByName("LanternR")!;
  root.updateMatrixWorld(true);
  const quietFoot = foot.getWorldPosition(new Vector3());
  const quietLantern = lantern.quaternion.clone();
  player.update(false, 1, true, 1);
  root.updateMatrixWorld(true);
  expect(player.active).toBe("Idle");
  expect(foot.getWorldPosition(new Vector3()).distanceTo(quietFoot)).toBeLessThan(
    1e-6,
  );
  lantern.quaternion.toArray().forEach((value, i) => {
    expect(value).toBeCloseTo(quietLantern.toArray()[i], 7);
  });
  player.update(false, 1, false, 0.5);
  expect(player.active).toBe("Idle");
  expect(lantern.quaternion.angleTo(quietLantern)).toBeGreaterThan(0.01);
  expect(root.position.length()).toBe(0);
  player.dispose();
});
it("does not replay an old interaction when a view remounts", async () => {
  const { player } = await keeperFixture();
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
