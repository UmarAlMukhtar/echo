"use client";
import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import { Mesh } from "three";
import { createKeeperAnimation } from "@/lib/game/keeper-animation";
import { playerRuntime, useGameStore } from "@/lib/game/store";

export default function Keeper() {
  const gltf = useGLTF("/models/echo-player.glb");
  const scene = useMemo(() => {
    const model = clone(gltf.scene);
    model.traverse((o) => {
      if (o instanceof Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    return model;
  }, [gltf.scene]);
  const animation = useRef<ReturnType<typeof createKeeperAnimation> | null>(
    null,
  );
  const previous = useRef({ ...playerRuntime.pos });
  useEffect(() => {
    const player = createKeeperAnimation(scene, gltf.animations);
    animation.current = player;
    return () => {
      animation.current = null;
      player.dispose();
    };
  }, [scene, gltf.animations]);
  useFrame((_, dt) => {
    const p = playerRuntime.pos;
    const state = useGameStore.getState();
    const moving =
      Math.hypot(p.x - previous.current.x, p.z - previous.current.z) > 0.001;
    animation.current?.update(
      moving && !state.overlay,
      playerRuntime.interaction,
      state.reducedMotion,
      Math.min(dt, 0.05),
    );
    previous.current.x = p.x;
    previous.current.z = p.z;
  });
  return <primitive object={scene} dispose={null} />;
}
