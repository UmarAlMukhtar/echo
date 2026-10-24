"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BUILDINGS, SKYLINE } from "@/lib/game/city";
import { useGameStore } from "@/lib/game/store";

const PALETTE = {
  limestone: "#8a7a5e",
  concrete: "#2b3138",
  mixed: "#4c4436",
  skyline: "#0d1319",
};

const WARM_WINDOW = new THREE.Color("#f2b84b");
const COOL_WINDOW = new THREE.Color("#5fb4c9");
const DIM_WINDOW = new THREE.Color("#223743");

function windowPlacements() {
  const mats: THREE.Matrix4[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const eu = new THREE.Euler();
  const pos = new THREE.Vector3();
  const scale = new THREE.Vector3(0.28, 0.34, 1);
  for (const b of BUILDINGS) {
    const floors = Math.max(1, Math.floor(b.h / 1.6));
    const colsX = Math.max(1, Math.floor(b.w / 0.9));
    const colsZ = Math.max(1, Math.floor(b.d / 0.9));
    for (let f = 0; f < floors; f++) {
      const y = 0.9 + f * 1.55;
      // front/back faces (z)
      for (let c = 0; c < colsX; c++) {
        if ((c + f + b.id.length) % 3 === 0) continue; // sparse pattern
        const x = b.x - b.w / 2 + (c + 0.5) * (b.w / colsX);
        for (const side of [-1, 1]) {
          pos.set(x, y, b.z + (side * b.d) / 2 + side * 0.02);
          eu.set(0, side === 1 ? 0 : Math.PI, 0);
          q.setFromEuler(eu);
          m.compose(pos, q, scale);
          mats.push(m.clone());
        }
      }
      // side faces (x), sparser
      for (let c = 0; c < colsZ; c++) {
        if ((c * 2 + f) % 4 === 0) continue;
        const z = b.z - b.d / 2 + (c + 0.5) * (b.d / colsZ);
        for (const side of [-1, 1]) {
          pos.set(b.x + (side * b.w) / 2 + side * 0.02, y, z);
          eu.set(0, side === 1 ? Math.PI / 2 : -Math.PI / 2, 0);
          q.setFromEuler(eu);
          m.compose(pos, q, scale);
          mats.push(m.clone());
        }
      }
    }
  }
  return mats;
}

export default function Buildings() {
  const windows = useMemo(windowPlacements, []);
  const instRef = useRef<THREE.InstancedMesh>(null!);
  const matRef = useRef<THREE.MeshStandardMaterial>(null!);

  useLayoutEffect(() => {
    const inst = instRef.current;
    windows.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.instanceMatrix.needsUpdate = true;
  }, [windows]);

  // Window mood follows the "serve" decision: amber when people are lit.
  useFrame((_, dt) => {
    const s = useGameStore.getState();
    const mat = matRef.current;
    if (!mat) return;
    const serve = s.decisions.serve;
    const target =
      serve === undefined ? 0.55 : serve ? 1.15 : 0.18;
    mat.emissiveIntensity = THREE.MathUtils.lerp(
      mat.emissiveIntensity,
      target,
      Math.min(1, dt * 2.2)
    );
    const color =
      serve === undefined ? COOL_WINDOW : serve ? WARM_WINDOW : DIM_WINDOW;
    mat.emissive.lerp(color, Math.min(1, dt * 2.2));
  });

  return (
    <group>
      {BUILDINGS.map((b) => (
        <mesh
          key={b.id}
          position={[b.x, b.h / 2, b.z]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color={PALETTE[b.style]}
            roughness={0.85}
            metalness={0.05}
          />
        </mesh>
      ))}
      <instancedMesh
        ref={instRef}
        args={[undefined, undefined, windows.length]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          ref={matRef}
          color="#0a0e12"
          emissive="#5fb4c9"
          emissiveIntensity={0.55}
          roughness={0.4}
          side={THREE.DoubleSide}
        />
      </instancedMesh>
      {SKYLINE.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 1, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial
            color={PALETTE.skyline}
            roughness={1}
            metalness={0}
          />
        </mesh>
      ))}
    </group>
  );
}
