"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CABLES } from "@/lib/game/city";
import { useGameStore } from "@/lib/game/store";
import { Line } from "@react-three/drei";

function catenary(
  a: [number, number, number],
  b: [number, number, number],
  sag = 1.4
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const n = 16;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = a[0] + (b[0] - a[0]) * t;
    const z = a[2] + (b[2] - a[2]) * t;
    const y =
      a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * sag;
    pts.push([x, y, z]);
  }
  return pts;
}

export default function Relay() {
  const rings = useRef<THREE.Group>(null!);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null!);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null!);
  const crown = useRef<THREE.Mesh>(null!);

  const cables = useMemo(
    () =>
      CABLES.map((c) =>
        catenary([c[0], c[1], c[2]], [c[3], c[4], c[5]])
      ),
    []
  );

  useFrame((state, dt) => {
    const s = useGameStore.getState();
    const feed = s.decisions.serve === false;
    const sealed = s.decisions.control === false;
    const shared = s.decisions.control === true;
    if (!s.reducedMotion && rings.current) {
      rings.current.rotation.y += dt * (feed ? 0.55 : 0.18);
      rings.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.06;
    }
    const core = coreMat.current;
    if (core) {
      const target = sealed ? 3.2 : shared ? 1.1 : feed ? 2.0 : 1.4;
      core.emissiveIntensity = THREE.MathUtils.lerp(
        core.emissiveIntensity,
        target,
        Math.min(1, dt * 2)
      );
    }
    const ring = ringMat.current;
    if (ring) {
      ring.emissiveIntensity = THREE.MathUtils.lerp(
        ring.emissiveIntensity,
        feed ? 2.4 : 1.2,
        Math.min(1, dt * 2)
      );
    }
    if (crown.current) crown.current.visible = sealed;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* plinth */}
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.6, 3.1, 0.7, 24]} />
        <meshStandardMaterial color="#2b3138" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.75, 0]} receiveShadow>
        <cylinderGeometry args={[1.9, 2.5, 0.3, 24]} />
        <meshStandardMaterial color="#8a7a5e" roughness={0.7} />
      </mesh>
      {/* tower */}
      <mesh position={[0, 6.4, 0]} castShadow>
        <cylinderGeometry args={[0.55, 1.15, 11.5, 10]} />
        <meshStandardMaterial color="#242b33" roughness={0.55} metalness={0.4} />
      </mesh>
      {/* signal rings */}
      <group ref={rings}>
        {[3.4, 5.6, 7.8].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.35 + i * 0.45, 0.06, 8, 40]} />
            <meshStandardMaterial
              ref={i === 0 ? ringMat : undefined}
              color="#12262b"
              emissive="#4fd1c5"
              emissiveIntensity={1.2}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
      {/* memory core */}
      <mesh position={[0, 9.6, 0]}>
        <icosahedronGeometry args={[0.62, 1]} />
        <meshStandardMaterial
          ref={coreMat}
          color="#0d2b2b"
          emissive="#5be0d4"
          emissiveIntensity={1.4}
          roughness={0.2}
        />
      </mesh>
      {/* sealed-archive crown star */}
      <mesh ref={crown} position={[0, 11.4, 0]} visible={false}>
        <icosahedronGeometry args={[0.4, 2]} />
        <meshStandardMaterial
          color="#dffcff"
          emissive="#bfeeff"
          emissiveIntensity={4}
        />
      </mesh>
      {/* cables */}
      {cables.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#1a3a3f"
          lineWidth={1.4}
          transparent
          opacity={0.85}
        />
      ))}
      <pointLight
        position={[0, 9.6, 0]}
        color="#4fd1c5"
        intensity={14}
        distance={26}
        decay={1.6}
      />
    </group>
  );
}
