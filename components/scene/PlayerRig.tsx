"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  CAMERA_TALL,
  slideMove,
} from "@/lib/game/city";
import { activeInteractables, playerRuntime, useGameStore } from "@/lib/game/store";
import { PlayerAvatar } from "./Characters";
import { QuestMarker } from "./Characters";
import {
  JOINT_INTERACTABLES,
  OVERLOOK_INTERACTABLE,
} from "@/lib/game/story";

const SPEED = 5.2;
const CAM_DIST_DEFAULT = 11;
const PITCH_MIN = 0.5;
const PITCH_MAX = 1.15;

/** Shrink camera distance when a tall structure sits on the look segment. */
function clearanceDist(
  px: number,
  pz: number,
  yaw: number,
  pitch: number,
  dist: number
): number {
  const sinY = Math.sin(yaw);
  const cosY = Math.cos(yaw);
  const cosP = Math.cos(pitch);
  const baseY = 1.2;
  for (let t = 0.22; t < 0.98; t += 0.06) {
    const x = px + sinY * cosP * dist * t;
    const z = pz + cosY * cosP * dist * t;
    const y = baseY + Math.sin(pitch) * dist * t;
    for (const b of CAMERA_TALL) {
      if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && y < b.h) {
        return Math.max(4, dist * t * 0.88);
      }
    }
  }
  return dist;
}

export default function PlayerRig() {
  const { camera, gl } = useThree();
  const group = useRef<THREE.Group>(null!);
  const keys = useRef<Set<string>>(new Set());
  const drag = useRef<{ on: boolean; x: number; y: number }>({
    on: false,
    x: 0,
    y: 0,
  });
  // Elevated three-quarter view: yaw 0 places the camera south of the
  // spawn platform looking north toward the relay — avatar never hidden.
  const cam = useRef({ yaw: 0, pitch: 0.72, dist: CAM_DIST_DEFAULT });
  const vel = useRef({ x: 0, z: 0 });
  const facing = useRef(Math.PI);
  const lookAt = useRef(new THREE.Vector3(0, 1.3, 0));

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
        PITCH_MIN,
        PITCH_MAX
      );
      drag.current.x = e.clientX;
      drag.current.y = e.clientY;
    };
    const pup = () => (drag.current.on = false);
    const wheel = (e: WheelEvent) => {
      cam.current.dist = THREE.MathUtils.clamp(
        cam.current.dist + e.deltaY * 0.01,
        7,
        16
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

    /* --- movement: camera-relative, conventional --- */
    const k = keys.current;
    let f = 0;
    let r = 0;
    if (playing) {
      if (k.has("w") || k.has("arrowup")) f += 1;
      if (k.has("s") || k.has("arrowdown")) f -= 1;
      if (k.has("d") || k.has("arrowright")) r += 1;
      if (k.has("a") || k.has("arrowleft")) r -= 1;
    }
    if (f !== 0 || r !== 0) {
      const len = Math.hypot(f, r);
      const yaw = cam.current.yaw;
      // Camera looks at the player along (-sin yaw, -cos yaw); W moves
      // away from the camera, D moves screen-right at every orbit angle.
      const dx = (-Math.sin(yaw) * (f / len)) + Math.cos(yaw) * (r / len);
      const dz = (-Math.cos(yaw) * (f / len)) - Math.sin(yaw) * (r / len);
      vel.current.x = dx * SPEED;
      vel.current.z = dz * SPEED;
      facing.current = Math.atan2(dx, dz);
    } else if (playing) {
      vel.current.x *= 0.75;
      vel.current.z *= 0.75;
    } else {
      // Dialogue/pause/endings: stop dead, don't drift.
      vel.current.x = 0;
      vel.current.z = 0;
    }
    const p = playerRuntime.pos;
    slideMove(p, vel.current.x * clamped, vel.current.z * clamped, s.joints);

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
      const t = s.reducedMotion ? 0.6 : state.clock.elapsedTime * 0.07;
      camera.position.set(Math.sin(t) * 17, 11.5, Math.cos(t) * 17);
      camera.lookAt(0, 1.5, 0);
    } else {
      const { yaw, pitch } = cam.current;
      const dist = clearanceDist(p.x, p.z, yaw, pitch, cam.current.dist);
      const cx = p.x + Math.sin(yaw) * Math.cos(pitch) * dist;
      const cz = p.z + Math.cos(yaw) * Math.cos(pitch) * dist;
      const cy = 1.2 + Math.sin(pitch) * dist;
      const lerp = s.reducedMotion ? 1 : Math.min(1, clamped * 6);
      camera.position.lerp(new THREE.Vector3(cx, cy, cz), lerp);
      lookAt.current.lerp(new THREE.Vector3(p.x, 1.3, p.z), lerp);
      camera.lookAt(lookAt.current);
    }
  });

  return (
    <group>
      <group ref={group} position={[playerRuntime.pos.x, 0, playerRuntime.pos.z]}>
        <PlayerAvatar />
      </group>
      {/* joint + overlook markers */}
      {[...JOINT_INTERACTABLES, OVERLOOK_INTERACTABLE].map((it) => (
        <group key={it.id} position={[it.position[0], 0, it.position[1]]}>
          <QuestMarker id={it.id} />
        </group>
      ))}
    </group>
  );
}
