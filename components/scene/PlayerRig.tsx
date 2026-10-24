"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { resolveCollisions, staticColliders } from "@/lib/game/city";
import { activeInteractables, playerRuntime, useGameStore } from "@/lib/game/store";
import { PlayerAvatar } from "./Characters";
import { QuestMarker } from "./Characters";
import {
  LOCK_INTERACTABLE,
  OVERLOOK_INTERACTABLE,
  RELAY_INTERACTABLE,
  VAULT_INTERACTABLE,
  WORLD_BOUNDS,
} from "@/lib/game/story";

const SPEED = 5.2;
const CAM_DIST_DEFAULT = 8.5;

export default function PlayerRig() {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null!);
  const keys = useRef<Set<string>>(new Set());
  const drag = useRef<{ on: boolean; x: number; y: number }>({
    on: false,
    x: 0,
    y: 0,
  });
  const cam = useRef({ yaw: Math.PI, pitch: 0.42, dist: CAM_DIST_DEFAULT });
  const vel = useRef({ x: 0, z: 0 });
  const facing = useRef(0);
  const colliders = useMemo(staticColliders, []);
  const interactables = useMemo(
    () => [RELAY_INTERACTABLE, LOCK_INTERACTABLE, VAULT_INTERACTABLE, OVERLOOK_INTERACTABLE],
    []
  );

  // Input listeners — keys cleared on blur; E/Enter interacts; camera drag.
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      keys.current.add(k);
      const s = useGameStore.getState();
      if ((k === "e" || k === "enter") && s.phase === "playing" && !s.overlay) {
        const near = s.nearby;
        if (near) s.interact(near);
      }
      if (k === " ") e.preventDefault();
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    const pdown = (e: PointerEvent) => {
      drag.current.on = true;
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    };
    const pmove = (e: PointerEvent) => {
      if (!drag.current.on) return;
      cam.current.yaw -= (e.clientX - drag.current.x) * 0.005;
      cam.current.pitch = THREE.MathUtils.clamp(
        cam.current.pitch + (e.clientY - drag.current.y) * 0.004,
        0.12,
        1.2
      );
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    };
    const pup = () => (drag.current.on = false);
    const wheel = (e: WheelEvent) => {
      cam.current.dist = THREE.MathUtils.clamp(
        cam.current.dist + e.deltaY * 0.01,
        4.5,
        14
      );
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    el.addEventListener("pointerdown", pdown);
    window.addEventListener("pointermove", pmove);
    window.addEventListener("pointerup", pup);
    el.addEventListener("wheel", wheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      el.removeEventListener("pointerdown", pdown);
      window.removeEventListener("pointermove", pmove);
      window.removeEventListener("pointerup", pup);
      el.removeEventListener("wheel", wheel);
    };
  }, [gl]);

  useFrame((state, dt) => {
    const s = useGameStore.getState();
    const playing = s.phase === "playing" && !s.overlay;
    const clamped = Math.min(dt, 0.05);

    /* --- movement --- */
    let mx = 0;
    let mz = 0;
    const k = keys.current;
    if (playing) {
      if (k.has("w") || k.has("arrowup")) mz -= 1;
      if (k.has("s") || k.has("arrowdown")) mz += 1;
      if (k.has("a") || k.has("arrowleft")) mx -= 1;
      if (k.has("d") || k.has("arrowright")) mx += 1;
    }
    if (mx !== 0 || mz !== 0) {
      const len = Math.hypot(mx, mz);
      const yaw = cam.current.yaw;
      const dx = ((mx / len) * Math.cos(yaw) - (mz / len) * Math.sin(yaw)) * -1;
      const dz = ((mx / len) * Math.sin(yaw) + (mz / len) * Math.cos(yaw)) * -1;
      vel.current.x = dx * SPEED;
      vel.current.z = dz * SPEED;
      facing.current = Math.atan2(dx, dz);
    } else {
      vel.current.x *= 0.8;
      vel.current.z *= 0.8;
    }
    const p = playerRuntime.pos;
    p.x += vel.current.x * clamped;
    p.z += vel.current.z * clamped;
    resolveCollisions(p, 0.55, colliders, WORLD_BOUNDS);

    if (group.current) {
      group.current.position.set(p.x, 0, p.z);
      let rot = facing.current - group.current.rotation.y;
      rot = Math.atan2(Math.sin(rot), Math.cos(rot));
      group.current.rotation.y += rot * Math.min(1, clamped * 12);
    }

    /* --- proximity prompt --- */
    const active = activeInteractables(s);
    let nearest: (typeof active)[number] | null = null;
    let best = Infinity;
    for (const it of active) {
      const d = Math.hypot(p.x - it.position[0], p.z - it.position[1]);
      if (d < it.radius && d < best) {
        best = d;
        nearest = it;
      }
    }
    s.setNearby(nearest);

    /* --- camera --- */
    if (s.phase === "title") {
      const t = state.clock.elapsedTime * 0.07;
      camera.position.set(Math.sin(t) * 15, 7.5, Math.cos(t) * 15);
      camera.lookAt(0, 4.5, 0);
    } else {
      const { yaw, pitch, dist } = cam.current;
      const cx = p.x + Math.sin(yaw) * Math.cos(pitch) * dist;
      const cz = p.z + Math.cos(yaw) * Math.cos(pitch) * dist;
      const cy = 1.2 + Math.sin(pitch) * dist;
      const lerp = s.reducedMotion ? 1 : Math.min(1, clamped * 6);
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), lerp);
      camera.lookAt(p.x, 1.3, p.z);
    }
  });

  return (
    <group>
      <group ref={group} position={[playerRuntime.pos.x, 0, playerRuntime.pos.z]}>
        <PlayerAvatar />
      </group>
      {/* world interactable markers */}
      {interactables.map((it) => (
        <group key={it.id} position={[it.position[0], 0, it.position[1]]}>
          <QuestMarker id={it.id} />
        </group>
      ))}
    </group>
  );
}
