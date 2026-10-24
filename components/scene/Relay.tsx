"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/lib/game/store";

const SIGNAL = "#2fd8c2";
const ACCENT = "#e0453a";

/** The relay spire — the district's unmistakable focal structure. */
export default function Relay() {
  const rings = useRef<THREE.Group>(null!);
  const coreMat = useRef<THREE.MeshStandardMaterial>(null!);
  const ringMat = useRef<THREE.MeshStandardMaterial>(null!);
  const finMat = useRef<THREE.MeshStandardMaterial>(null!);
  const crown = useRef<THREE.Mesh>(null!);

  useFrame((state, dt) => {
    const s = useGameStore.getState();
    const feed = s.decisions.serve === false;
    const sealed = s.decisions.control === false;
    const shared = s.decisions.control === true;
    if (!s.reducedMotion && rings.current) {
      rings.current.rotation.y += dt * (feed ? 0.6 : 0.22);
    }
    const core = coreMat.current;
    if (core) {
      const target = sealed ? 3.4 : shared ? 1.2 : feed ? 2.4 : 1.7;
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
        feed ? 2.8 : 1.5,
        Math.min(1, dt * 2)
      );
    }
    const fin = finMat.current;
    if (fin && !s.reducedMotion) {
      fin.emissiveIntensity = 0.9 + Math.sin(state.clock.elapsedTime * 1.8) * 0.3;
    }
    if (crown.current) crown.current.visible = sealed;
  });

  return (
    <group position={[0, 0, 0]}>
      {/* stepped plinth */}
      <mesh position={[0, 0.3, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.5, 2.9, 0.6, 8]} />
        <meshStandardMaterial color="#d9cbb6" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.8, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[1.8, 2.3, 0.5, 8]} />
        <meshStandardMaterial color="#efe6d2" roughness={0.75} />
      </mesh>
      {/* ivory shaft — stacked tiers */}
      <mesh position={[0, 3.2, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.4, 4.4, 8]} />
        <meshStandardMaterial color="#f2e9d8" roughness={0.7} />
      </mesh>
      <mesh position={[0, 6.2, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.95, 2.2, 8]} />
        <meshStandardMaterial color="#eccfae" roughness={0.7} />
      </mesh>
      <mesh position={[0, 8.2, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.62, 2, 8]} />
        <meshStandardMaterial color="#f2e9d8" roughness={0.7} />
      </mesh>
      {/* red accent fins — the signature saturated marker */}
      {[0.7, Math.PI * 0.7, -Math.PI * 0.3].map((a, i) => (
        <mesh
          key={i}
          position={[Math.sin(a) * 1.05, 5.4, Math.cos(a) * 1.05]}
          rotation={[0, a, 0]}
          castShadow
        >
          <boxGeometry args={[0.16, 4.6, 0.16]} />
          <meshStandardMaterial
            ref={i === 0 ? finMat : undefined}
            color={ACCENT}
            emissive={ACCENT}
            emissiveIntensity={0.9}
            roughness={0.5}
          />
        </mesh>
      ))}
      {/* slow signal rings */}
      <group ref={rings}>
        {[3.6, 5.6, 7.4].map((y, i) => (
          <mesh key={i} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.35 + i * 0.5, 0.06, 8, 40]} />
            <meshStandardMaterial
              ref={i === 0 ? ringMat : undefined}
              color="#0d4f47"
              emissive={SIGNAL}
              emissiveIntensity={1.5}
              roughness={0.3}
            />
          </mesh>
        ))}
      </group>
      {/* memory core */}
      <mesh position={[0, 9.8, 0]}>
        <icosahedronGeometry args={[0.66, 1]} />
        <meshStandardMaterial
          ref={coreMat}
          color="#0d4f47"
          emissive="#5be0d4"
          emissiveIntensity={1.7}
          roughness={0.2}
        />
      </mesh>
      {/* sealed-archive crown star */}
      <mesh ref={crown} position={[0, 11.6, 0]} visible={false}>
        <icosahedronGeometry args={[0.42, 2]} />
        <meshStandardMaterial
          color="#dffcff"
          emissive="#bfeeff"
          emissiveIntensity={4}
        />
      </mesh>
      <pointLight
        position={[0, 9.8, 0]}
        color={SIGNAL}
        intensity={16}
        distance={28}
        decay={1.6}
      />
    </group>
  );
}
