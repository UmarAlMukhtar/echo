"use client";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Line, Sparkles } from "@react-three/drei";
import {
  floorHeight,
  GHOST_FIGURES,
  GHOST_QUARTER,
  LAMP_POSTS,
} from "@/lib/game/city";
import { STAGES, computeAllBeams, initialJoints } from "@/lib/game/signal";
import { useGameStore } from "@/lib/game/store";
import DistrictModel from "./DistrictModel";
const EDGE = "#d9cbb6";
const SIGNAL = "#2fd8c2";
const ACCENT = "#e0453a";

function BeamBar({ a, b }: { a: [number, number]; b: [number, number] }) {
  const joints = useGameStore((s) => s.joints);
  const points = Array.from({ length: 21 }, (_, i) => {
    const t = i / 20,
      x = a[0] + (b[0] - a[0]) * t,
      z = a[1] + (b[1] - a[1]) * t;
    return [x, (floorHeight(x, z, joints) ?? 0) + 0.85, z] as [
      number,
      number,
      number,
    ];
  });
  return <Line points={points} color={SIGNAL} lineWidth={4} />;
}

/** A rotating relay joint: octagonal pedestal + signal arm + glyph. */
function Joint({
  id,
  kind,
  pos,
}: {
  id: string;
  kind: "straight" | "elbow";
  pos: [number, number];
}) {
  const arm = useRef<THREE.Group>(null!);
  const markerMat = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame((_, dt) => {
    const s = useGameStore.getState();
    const rot = s.joints[id as keyof typeof s.joints];
    const target = (kind === "straight" ? 1 : -1) * rot * (Math.PI / 2);
    if (arm.current) {
      let d = target - arm.current.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      arm.current.rotation.y += d * (s.reducedMotion ? 1 : Math.min(1, dt * 8));
    }
    if (markerMat.current && !s.reducedMotion) {
      markerMat.current.emissiveIntensity =
        1.4 + Math.sin(_.clock.elapsedTime * 2.2) * 0.35;
    }
  });
  return (
    <group
      position={[pos[0], floorHeight(...pos, initialJoints()) ?? 0, pos[1]]}
      scale={0.65}
    >
      <mesh position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.62, 0.78, 0.44, 8]} />
        <meshStandardMaterial color="#6f6580" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.5, 0.62, 0.14, 8]} />
        <meshStandardMaterial color={EDGE} roughness={0.7} />
      </mesh>
      <group ref={arm}>
        {kind === "straight" ? (
          // conducts along local z (edges N-S at rot 0)
          <mesh position={[0, 0.62, 0]}>
            <boxGeometry args={[0.24, 0.16, 1.7]} />
            <meshStandardMaterial
              color="#0d4f47"
              emissive={SIGNAL}
              emissiveIntensity={1.6}
            />
          </mesh>
        ) : (
          // conducts +x and -z at rot 0 (edges E+N)
          <>
            <mesh position={[0.42, 0.62, 0]}>
              <boxGeometry args={[0.9, 0.16, 0.24]} />
              <meshStandardMaterial
                color="#0d4f47"
                emissive={SIGNAL}
                emissiveIntensity={1.6}
              />
            </mesh>
            <mesh position={[0, 0.62, -0.42]}>
              <boxGeometry args={[0.24, 0.16, 0.9]} />
              <meshStandardMaterial
                color="#0d4f47"
                emissive={SIGNAL}
                emissiveIntensity={1.6}
              />
            </mesh>
          </>
        )}
      </group>
      <mesh position={[0, 1.05, 0]}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial
          ref={markerMat}
          color="#0d4f47"
          emissive={SIGNAL}
          emissiveIntensity={1.4}
        />
      </mesh>
    </group>
  );
}

/** Signal emitter obelisk at each stage source. */
function Emitter({ pos, hot }: { pos: [number, number]; hot: boolean }) {
  return (
    <group
      position={[pos[0], floorHeight(...pos, initialJoints()) ?? 0, pos[1]]}
      scale={0.65}
    >
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.5, 1.4, 0.5]} />
        <meshStandardMaterial color="#efe6d2" roughness={0.75} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <boxGeometry args={[0.3, 0.22, 0.3]} />
        <meshStandardMaterial
          color="#0d4f47"
          emissive={SIGNAL}
          emissiveIntensity={hot ? 2.6 : 0.8}
        />
      </mesh>
      {hot && (
        <pointLight
          position={[0, 1.6, 0]}
          color={SIGNAL}
          intensity={5}
          distance={9}
          decay={1.8}
        />
      )}
    </group>
  );
}

export default function District() {
  const joints = useGameStore((s) => s.joints);
  const beams = useMemo(() => computeAllBeams(joints), [joints]);
  const controlSealed = useGameStore((s) => s.decisions.control === false);
  const controlShared = useGameStore((s) => s.decisions.control === true);
  const reduced = useGameStore((s) => s.reducedMotion);

  const serveLiving = useGameStore((s) => s.decisions.serve === true);
  const ghostMat = useRef<THREE.MeshStandardMaterial>(null!);
  const cones = useRef<THREE.Group>(null!);
  const ghosts = useRef<THREE.Group>(null!);
  const shards = useRef<THREE.Group>(null!);
  const floodL = useRef<THREE.SpotLight>(null!);
  const floodR = useRef<THREE.SpotLight>(null!);
  const dockLight = useRef<THREE.PointLight>(null!);

  const shardSpots = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        x: (Math.sin(i * 2.7) * 0.5 + 0.02) * 26 - i * 0.18,
        z: Math.cos(i * 1.9) * 0.5 * 26,
        y: 2.2 + ((i * 37) % 50) / 10,
        s: 0.1 + ((i * 13) % 10) / 90,
      })),
    [],
  );

  useFrame((state, dt) => {
    const s = useGameStore.getState();
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 2);
    const serve = s.decisions.serve;
    if (dockLight.current) {
      dockLight.current.intensity = THREE.MathUtils.lerp(
        dockLight.current.intensity,
        serve === true ? 14 : 0,
        k,
      );
    }
    const floodOn = serve === false;
    if (cones.current) cones.current.visible = floodOn;
    for (const f of [floodL, floodR]) {
      if (f.current)
        f.current.intensity = THREE.MathUtils.lerp(
          f.current.intensity,
          floodOn ? 70 : 0,
          k,
        );
    }
    const ghostsOn = s.decisions.retain === true;
    if (ghosts.current) {
      ghosts.current.visible = ghostsOn;
      if (ghostsOn && ghostMat.current && !s.reducedMotion) {
        ghostMat.current.opacity = 0.3 + Math.sin(t * 1.4) * 0.06;
      }
    }
    const shared = s.decisions.control === true;
    if (shards.current) {
      shards.current.visible = shared;
      if (shared && !s.reducedMotion) shards.current.rotation.y += dt * 0.05;
    }
  });

  return (
    <group>
      {/* luminous mist void — the district floats on haze */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -7.5, 0]}>
        <planeGeometry args={[220, 220]} />
        <meshStandardMaterial
          color="#8fc4b7"
          emissive="#7fb8ab"
          emissiveIntensity={0.5}
          roughness={1}
        />
      </mesh>
      {!reduced && (
        <Sparkles
          count={70}
          scale={[60, 8, 60]}
          position={[0, -3, 0]}
          size={5}
          speed={0.08}
          opacity={0.35}
          color="#e8fff8"
        />
      )}

      <DistrictModel />
      {controlSealed && (
        <mesh position={[0, 3.5, 0]}>
          <icosahedronGeometry args={[0.38, 1]} />
          <meshStandardMaterial
            color="#bfeeff"
            emissive="#bfeeff"
            emissiveIntensity={3}
          />
        </mesh>
      )}
      {/* visible signal beams */}
      {STAGES.map((st) =>
        beams[st.id].segments.map((seg, i) => (
          <BeamBar key={`${st.id}-${i}`} a={seg.a} b={seg.b} />
        )),
      )}

      {beams.stage3.reached && <BeamBar a={[0, -6.5]} b={[0, -11]} />}
      {/* emitters + joints */}
      {STAGES.map((st) => (
        <Emitter
          key={`e-${st.id}`}
          pos={st.source.pos}
          hot={beams[st.id].segments.length > 0}
        />
      ))}
      {STAGES.flatMap((st) =>
        st.joints.map((j) => (
          <Joint key={j.id} id={j.id} kind={j.kind} pos={j.pos} />
        )),
      )}

      {/* lamp posts — warm when the grid serves the living */}
      {LAMP_POSTS.map((l, i) => (
        <group
          key={i}
          position={[l.x, floorHeight(l.x, l.z, initialJoints()) ?? 0, l.z]}
        >
          <mesh position={[0, 1.3, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 2.6, 6]} />
            <meshStandardMaterial color="#6f6580" roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.68, 0]}>
            <sphereGeometry args={[0.15, 10, 10]} />
            <meshStandardMaterial
              color="#4a3a20"
              emissive="#f2b84b"
              emissiveIntensity={serveLiving ? 3 : 0.5}
            />
          </mesh>
        </group>
      ))}
      <pointLight
        ref={dockLight}
        position={[12, 2.4, 1]}
        color="#f2b84b"
        intensity={0}
        distance={14}
        decay={1.8}
      />

      {/* floodlight cones (serve → relay) */}
      <group ref={cones} visible={false}>
        {[
          [-2.6, -2.6, Math.PI / 6],
          [2.6, -2.6, -Math.PI / 6],
        ].map(([x, z, tilt], i) => (
          <group key={i} position={[x, 0, z]}>
            <mesh position={[0, 3.4, 1.2]} rotation={[Math.PI * 0.38, 0, tilt]}>
              <coneGeometry args={[1.5, 7, 16, 1, true]} />
              <meshStandardMaterial
                color={SIGNAL}
                transparent
                opacity={0.08}
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
          distance={22}
          target-position={[0, 8, 0]}
        />
        <spotLight
          ref={floodR}
          position={[2.6, 0.6, -2.6]}
          angle={0.6}
          penumbra={0.6}
          color="#7ce8dd"
          intensity={0}
          distance={22}
          target-position={[0, 8, 0]}
        />
      </group>

      {/* ghost echoes (retain → the drowned quarter returns) */}
      <group ref={ghosts} visible={false}>
        {GHOST_QUARTER.map((g, i) => (
          <group key={i} position={[g.x, -0.6, g.z]}>
            <mesh position={[0, 0.15, 0]}>
              <boxGeometry args={[g.w + 0.6, 0.3, g.d + 0.6]} />
              <meshStandardMaterial color="#d9cbb6" roughness={0.9} />
            </mesh>
            <mesh position={[0, g.h / 2 + 0.35, 0]}>
              <boxGeometry args={[g.w, g.h, g.d]} />
              <meshStandardMaterial
                ref={i === 0 ? ghostMat : undefined}
                color="#ffd9b0"
                emissive="#ffc98f"
                emissiveIntensity={0.6}
                transparent
                opacity={0.3}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
        {GHOST_FIGURES.map((f, i) => (
          <mesh key={`f${i}`} position={[f.x, 0.5, f.z]}>
            <capsuleGeometry args={[0.22, 0.9, 4, 8]} />
            <meshStandardMaterial
              color="#ffe0bd"
              emissive="#ffd9a8"
              emissiveIntensity={0.9}
              transparent
              opacity={0.35}
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
              color="#0d4a44"
              emissive={SIGNAL}
              emissiveIntensity={2.2}
            />
          </mesh>
        ))}
        {controlShared && !reduced && (
          <Sparkles
            count={90}
            scale={[30, 10, 30]}
            size={2.4}
            speed={0.4}
            color="#7ce8dd"
          />
        )}
      </group>

      {/* red accent fin on the plaza — the one saturated marker */}
      <mesh position={[3.9, 1.4, -3.9]} castShadow>
        <boxGeometry args={[0.18, 2.8, 0.18]} />
        <meshStandardMaterial
          color={ACCENT}
          emissive={ACCENT}
          emissiveIntensity={0.8}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}
