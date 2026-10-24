"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Sparkles } from "@react-three/drei";
import {
  GHOST_FIGURES,
  GHOST_QUARTER,
  LAMP_POSTS,
  WALKWAYS,
} from "@/lib/game/city";
import { useGameStore } from "@/lib/game/store";

/** Ground, canal water, dock, walkways, lamps, ghost quarter, shards, floodlights. */
export default function District() {
  const waterMat = useRef<THREE.MeshStandardMaterial>(null!);
  const water = useRef<THREE.Mesh>(null!);
  const lampMat = useRef<THREE.MeshStandardMaterial>(null!);
  const ghostMat = useRef<THREE.MeshStandardMaterial>(null!);
  const floodL = useRef<THREE.SpotLight>(null!);
  const floodR = useRef<THREE.SpotLight>(null!);
  const cones = useRef<THREE.Group>(null!);
  const ghosts = useRef<THREE.Group>(null!);
  const shards = useRef<THREE.Group>(null!);
  const dockLight = useRef<THREE.PointLight>(null!);

  const shardSpots = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        x: (Math.sin(i * 2.7) * 0.5 + 0.02) * 26 - i * 0.18,
        z: (Math.cos(i * 1.9) * 0.5) * 26,
        y: 2.2 + ((i * 37) % 50) / 10,
        s: 0.1 + ((i * 13) % 10) / 90,
      })),
    []
  );

  useFrame((state, dt) => {
    const s = useGameStore.getState();
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 2);

    if (waterMat.current && !s.reducedMotion) {
      waterMat.current.emissiveIntensity = 0.35 + Math.sin(t * 0.8) * 0.08;
    }
    if (water.current && !s.reducedMotion) {
      water.current.position.y = -0.35 + Math.sin(t * 0.5) * 0.05;
    }

    const serve = s.decisions.serve;
    if (lampMat.current) {
      lampMat.current.emissiveIntensity = THREE.MathUtils.lerp(
        lampMat.current.emissiveIntensity,
        serve === true ? 2.6 : 0.25,
        k
      );
    }
    if (dockLight.current) {
      dockLight.current.intensity = THREE.MathUtils.lerp(
        dockLight.current.intensity,
        serve === true ? 10 : 0,
        k
      );
    }
    const floodOn = serve === false;
    if (cones.current) cones.current.visible = floodOn;
    if (floodL.current)
      floodL.current.intensity = THREE.MathUtils.lerp(
        floodL.current.intensity,
        floodOn ? 60 : 0,
        k
      );
    if (floodR.current)
      floodR.current.intensity = THREE.MathUtils.lerp(
        floodR.current.intensity,
        floodOn ? 60 : 0,
        k
      );

    const ghostsOn = s.decisions.retain === true;
    if (ghosts.current) {
      ghosts.current.visible = ghostsOn;
      if (ghostsOn && ghostMat.current && !s.reducedMotion) {
        ghostMat.current.opacity = 0.24 + Math.sin(t * 1.4) * 0.05;
      }
    }

    const shared = s.decisions.control === true;
    if (shards.current) {
      shards.current.visible = shared;
      if (shared && !s.reducedMotion) shards.current.rotation.y += dt * 0.05;
    }
  });

  const controlShared = useGameStore((s) => s.decisions.control === true);
  const reduced = useGameStore((s) => s.reducedMotion);

  return (
    <group>
      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color="#171c22" roughness={0.95} />
      </mesh>
      {/* plaza disc */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]} receiveShadow>
        <circleGeometry args={[7.5, 40]} />
        <meshStandardMaterial color="#23282f" roughness={0.9} />
      </mesh>
      {/* limestone promenade strips */}
      {[
        { x: 0, z: 10, w: 26, d: 4 },
        { x: -9, z: -3, w: 3.4, d: 16 },
      ].map((r, i) => (
        <mesh
          key={i}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[r.x, 0.005, r.z]}
          receiveShadow
        >
          <planeGeometry args={[r.w, r.d]} />
          <meshStandardMaterial color="#3a3529" roughness={0.9} />
        </mesh>
      ))}

      {/* canal water */}
      <mesh
        ref={water}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-16, -0.35, -2]}
      >
        <planeGeometry args={[9, 32]} />
        <meshStandardMaterial
          ref={waterMat}
          color="#0e3f49"
          emissive="#1a7a86"
          emissiveIntensity={0.35}
          roughness={0.25}
          metalness={0.6}
        />
      </mesh>
      {/* canal edge wall */}
      <mesh position={[-12.2, 0.3, -2]}>
        <boxGeometry args={[0.4, 0.7, 32]} />
        <meshStandardMaterial color="#2b3138" roughness={0.85} />
      </mesh>
      {/* dock bridge to ferry platform */}
      <mesh position={[-14.4, 0.06, 0.7]} receiveShadow>
        <boxGeometry args={[5, 0.12, 4.6]} />
        <meshStandardMaterial color="#3d3226" roughness={0.8} />
      </mesh>
      {[-16.2, -14, -12.8].map((x, i) => (
        <mesh key={i} position={[x, 0.9, -1.4]}>
          <cylinderGeometry args={[0.07, 0.07, 1.8, 6]} />
          <meshStandardMaterial color="#2b3138" roughness={0.8} />
        </mesh>
      ))}
      {/* Devi's lantern on the dock */}
      <mesh position={[-16.2, 1.95, -1.4]}>
        <boxGeometry args={[0.22, 0.3, 0.22]} />
        <meshStandardMaterial
          color="#2a1f10"
          emissive="#f2b84b"
          emissiveIntensity={0.7}
        />
      </mesh>
      <pointLight
        ref={dockLight}
        position={[-16.2, 2.2, -1.4]}
        color="#f2b84b"
        intensity={0}
        distance={12}
        decay={1.8}
      />
      {/* canal lock mechanism (decision site) */}
      <mesh position={[-15, 0.5, 2.5]} castShadow>
        <boxGeometry args={[0.9, 1, 0.6]} />
        <meshStandardMaterial color="#31404c" roughness={0.6} metalness={0.3} />
      </mesh>
      <mesh position={[-15, 1.2, 2.5]} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[0.35, 0.05, 8, 20]} />
        <meshStandardMaterial
          color="#12262b"
          emissive="#4fd1c5"
          emissiveIntensity={0.9}
        />
      </mesh>

      {/* archive vault structure (decision site) */}
      <mesh position={[14, 0.6, 9.3]} castShadow>
        <boxGeometry args={[3.2, 1.2, 2.2]} />
        <meshStandardMaterial color="#4c4436" roughness={0.8} />
      </mesh>
      <mesh position={[14, 1.5, 9.3]}>
        <cylinderGeometry args={[1.2, 1.5, 0.5, 8]} />
        <meshStandardMaterial color="#8a7a5e" roughness={0.7} />
      </mesh>
      <mesh position={[14, 2.1, 9.3]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.07, 8, 28]} />
        <meshStandardMaterial
          color="#12262b"
          emissive="#4fd1c5"
          emissiveIntensity={1}
        />
      </mesh>

      {/* overlook beacon platform */}
      <mesh position={[0, 0.25, 16.2]} receiveShadow castShadow>
        <cylinderGeometry args={[2.4, 2.8, 0.5, 20]} />
        <meshStandardMaterial color="#2b3138" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.15, 16.9]}>
        <boxGeometry args={[2.6, 0.5, 0.12]} />
        <meshStandardMaterial color="#8a7a5e" roughness={0.7} />
      </mesh>

      {/* elevated walkways */}
      {WALKWAYS.map((w, i) => (
        <group key={i}>
          <mesh position={[w.x, w.y, w.z]} castShadow>
            <boxGeometry args={[w.w, 0.18, w.d]} />
            <meshStandardMaterial color="#2b3138" roughness={0.7} />
          </mesh>
          <mesh position={[w.x, w.y + 0.5, w.z]}>
            <boxGeometry args={[w.w, 0.04, w.d]} />
            <meshStandardMaterial
              color="#12262b"
              emissive="#4fd1c5"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}

      {/* lamp posts */}
      {LAMP_POSTS.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <mesh position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 2.8, 6]} />
            <meshStandardMaterial color="#242b33" roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.85, 0]}>
            <sphereGeometry args={[0.14, 10, 10]} />
            <meshStandardMaterial
              ref={i === 0 ? lampMat : undefined}
              color="#33270f"
              emissive="#f2b84b"
              emissiveIntensity={0.25}
            />
          </mesh>
        </group>
      ))}

      {/* floodlight cones (serve → relay) */}
      <group ref={cones} visible={false}>
        {[
          [-2.6, 0, -2.6, Math.PI / 6],
          [2.6, 0, -2.6, -Math.PI / 6],
        ].map(([x, , z, tilt], i) => (
          <group key={i} position={[x as number, 0, z as number]}>
            <mesh
              position={[0, 3.4, 1.2]}
              rotation={[Math.PI * 0.38, 0, tilt as number]}
            >
              <coneGeometry args={[1.5, 7, 16, 1, true]} />
              <meshStandardMaterial
                color="#4fd1c5"
                transparent
                opacity={0.09}
                side={THREE.DoubleSide}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
        <spotLight
          ref={floodL}
          position={[-2.6, 0.6, -2.6]}
          angle={0.6}
          penumbra={0.6}
          color="#7ce8dd"
          intensity={0}
          distance={20}
          target-position={[0, 8, 0]}
        />
        <spotLight
          ref={floodR}
          position={[2.6, 0.6, -2.6]}
          angle={0.6}
          penumbra={0.6}
          color="#7ce8dd"
          intensity={0}
          distance={20}
          target-position={[0, 8, 0]}
        />
      </group>

      {/* ghost quarter (retain → echoes) */}
      <group ref={ghosts} visible={false}>
        {GHOST_QUARTER.map((g, i) => (
          <mesh key={i} position={[g.x, g.h / 2 + 0.1, g.z]}>
            <boxGeometry args={[g.w, g.h, g.d]} />
            <meshStandardMaterial
              ref={i === 0 ? ghostMat : undefined}
              color="#7ad9ff"
              emissive="#7ad9ff"
              emissiveIntensity={0.55}
              transparent
              opacity={0.24}
              depthWrite={false}
            />
          </mesh>
        ))}
        {GHOST_FIGURES.map((f, i) => (
          <mesh key={`f${i}`} position={[f.x, 0.9, f.z]}>
            <capsuleGeometry args={[0.22, 0.9, 4, 8]} />
            <meshStandardMaterial
              color="#a8e6ff"
              emissive="#a8e6ff"
              emissiveIntensity={0.8}
              transparent
              opacity={0.3}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>

      {/* dispersed archive shards (control → shared) */}
      <group ref={shards} visible={false}>
        {shardSpots.map((sp, i) => (
          <mesh key={i} position={[sp.x, sp.y, sp.z]} rotation={[i, i * 2, 0]}>
            <tetrahedronGeometry args={[sp.s]} />
            <meshStandardMaterial
              color="#0d3a3a"
              emissive="#4fd1c5"
              emissiveIntensity={2.2}
            />
          </mesh>
        ))}
        {controlShared && !reduced && (
          <Sparkles count={90} scale={[30, 10, 30]} size={2.4} speed={0.4} color="#7ce8dd" />
        )}
      </group>
    </group>
  );
}
