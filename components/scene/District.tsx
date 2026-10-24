"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Line, Sparkles } from "@react-three/drei";
import {
  ARCHES,
  BASE_FLOORS,
  CABLES,
  FLOATING_STEPS,
  GHOST_FIGURES,
  GHOST_QUARTER,
  LAMP_POSTS,
  SKYLINE,
} from "@/lib/game/city";
import {
  STAGES,
  computeAllBeams,
} from "@/lib/game/signal";
import type { Rect } from "@/lib/game/signal";
import { useGameStore } from "@/lib/game/store";

/* ------------------------------------------------------------------ *
 *  Bright sculptural district: ivory/peach platforms, lilac shadows,   *
 *  teal-mint atmosphere, energized causeway tiles, visible signal.     *
 * ------------------------------------------------------------------ */

const TONE = {
  ivory: "#f2e9d8",
  peach: "#eccfae",
  lilac: "#b7a9c9",
  wood: "#d9b98f",
  slate: "#9a8fb0",
} as const;

const SIDE = "#a89bc0"; // lilac shadow sides
const EDGE = "#d9cbb6";
const SIGNAL = "#2fd8c2";
const ACCENT = "#e0453a"; // selective vivid red

function Platform({ rect }: { rect: Rect & { tone: keyof typeof TONE } }) {
  const w = rect.x1 - rect.x0;
  const d = rect.z1 - rect.z0;
  const cx = (rect.x0 + rect.x1) / 2;
  const cz = (rect.z0 + rect.z1) / 2;
  return (
    <group position={[cx, 0, cz]}>
      {/* lilac shadowed body */}
      <mesh position={[0, -0.62, 0]} receiveShadow castShadow>
        <boxGeometry args={[w, 1.15, d]} />
        <meshStandardMaterial color={SIDE} roughness={0.9} />
      </mesh>
      {/* pale top slab */}
      <mesh position={[0, -0.06, 0]} receiveShadow>
        <boxGeometry args={[w + 0.04, 0.12, d + 0.04]} />
        <meshStandardMaterial color={TONE[rect.tone]} roughness={0.85} />
      </mesh>
      {/* fine edge trim */}
      <mesh position={[0, 0.015, 0]}>
        <boxGeometry args={[w - 0.24, 0.03, d - 0.24]} />
        <meshStandardMaterial color={EDGE} roughness={0.8} />
      </mesh>
    </group>
  );
}

/** Causeway tile — rises when its beam segment is energized. */
function EnergyTile({ rect, live }: { rect: Rect; live: boolean }) {
  const mesh = useRef<THREE.Group>(null!);
  const w = rect.x1 - rect.x0;
  const d = rect.z1 - rect.z0;
  const cx = (rect.x0 + rect.x1) / 2;
  const cz = (rect.z0 + rect.z1) / 2;
  useFrame((_, dt) => {
    if (!mesh.current) return;
    const targetY = live ? 0 : -2.4;
    mesh.current.position.y = THREE.MathUtils.lerp(
      mesh.current.position.y,
      targetY,
      Math.min(1, dt * 3)
    );
  });
  const alongX = w >= d;
  return (
    <group ref={mesh} position={[cx, -2.4, cz]}>
      <mesh position={[0, -0.5, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.9, d]} />
        <meshStandardMaterial color={SIDE} roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <boxGeometry args={[w + 0.04, 0.12, d + 0.04]} />
        <meshStandardMaterial color="#efe6d2" roughness={0.8} />
      </mesh>
      {/* signal conduit strip */}
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry
          args={alongX ? [w - 0.15, 0.04, 0.22] : [0.22, 0.04, d - 0.15]}
        />
        <meshStandardMaterial
          color="#0f4a44"
          emissive={SIGNAL}
          emissiveIntensity={live ? 2.4 : 0.25}
        />
      </mesh>
    </group>
  );
}

/** The visible beam: a slim luminous bar between two nodes. */
function BeamBar({ a, b }: { a: [number, number]; b: [number, number] }) {
  const mid: [number, number, number] = [(a[0] + b[0]) / 2, 1.15, (a[1] + b[1]) / 2];
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const alongX = Math.abs(dx) >= Math.abs(dz);
  return (
    <group>
      <mesh position={mid}>
        <boxGeometry args={alongX ? [len, 0.12, 0.12] : [0.12, 0.12, len]} />
        <meshStandardMaterial
          color="#0d4f47"
          emissive={SIGNAL}
          emissiveIntensity={3}
        />
      </mesh>
      {/* halo plane just above the floor for glow readability */}
      <mesh position={[mid[0], 0.35, mid[2]]}>
        <boxGeometry args={alongX ? [len, 0.02, 0.5] : [0.5, 0.02, len]} />
        <meshStandardMaterial
          color="#bffff2"
          emissive={SIGNAL}
          emissiveIntensity={1.2}
          transparent
          opacity={0.5}
        />
      </mesh>
    </group>
  );
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
      arm.current.rotation.y += d * Math.min(1, dt * 8);
    }
    if (markerMat.current && !s.reducedMotion) {
      markerMat.current.emissiveIntensity =
        1.4 + Math.sin(_.clock.elapsedTime * 2.2) * 0.35;
    }
  });
  return (
    <group position={[pos[0], 0, pos[1]]}>
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
    <group position={[pos[0], 0, pos[1]]}>
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
      {hot && <pointLight position={[0, 1.6, 0]} color={SIGNAL} intensity={5} distance={9} decay={1.8} />}
    </group>
  );
}

/* ------------------------------ main ------------------------------- */

export default function District() {
  const joints = useGameStore((s) => s.joints);
  const beams = useMemo(() => computeAllBeams(joints), [joints]);
  const controlShared = useGameStore((s) => s.decisions.control === true);
  const reduced = useGameStore((s) => s.reducedMotion);

  const lampMat = useRef<THREE.MeshStandardMaterial>(null!);
  const ghostMat = useRef<THREE.MeshStandardMaterial>(null!);
  const cones = useRef<THREE.Group>(null!);
  const ghosts = useRef<THREE.Group>(null!);
  const shards = useRef<THREE.Group>(null!);
  const floodL = useRef<THREE.SpotLight>(null!);
  const floodR = useRef<THREE.SpotLight>(null!);
  const dockLight = useRef<THREE.PointLight>(null!);

  const energized = useMemo(() => {
    const set = new Set<string>();
    for (const st of STAGES)
      for (const t of st.tiles)
        if (beams[st.id].edges.includes(t.edge)) set.add(t.edge);
    return set;
  }, [beams]);

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

  const cables = useMemo(
    () =>
      CABLES.map((c) => {
        const a: [number, number, number] = [c[0], c[1], c[2]];
        const b: [number, number, number] = [c[3], c[4], c[5]];
        const pts: [number, number, number][] = [];
        for (let i = 0; i <= 14; i++) {
          const t = i / 14;
          pts.push([
            a[0] + (b[0] - a[0]) * t,
            a[1] + (b[1] - a[1]) * t - Math.sin(Math.PI * t) * 1.5,
            a[2] + (b[2] - a[2]) * t,
          ]);
        }
        return pts;
      }),
    []
  );

  useFrame((state, dt) => {
    const s = useGameStore.getState();
    const t = state.clock.elapsedTime;
    const k = Math.min(1, dt * 2);
    const serve = s.decisions.serve;
    if (lampMat.current) {
      lampMat.current.emissiveIntensity = THREE.MathUtils.lerp(
        lampMat.current.emissiveIntensity,
        serve === true ? 3 : 0.5,
        k
      );
    }
    if (dockLight.current) {
      dockLight.current.intensity = THREE.MathUtils.lerp(
        dockLight.current.intensity,
        serve === true ? 14 : 0,
        k
      );
    }
    const floodOn = serve === false;
    if (cones.current) cones.current.visible = floodOn;
    for (const f of [floodL, floodR]) {
      if (f.current)
        f.current.intensity = THREE.MathUtils.lerp(
          f.current.intensity,
          floodOn ? 70 : 0,
          k
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
        <Sparkles count={70} scale={[60, 8, 60]} position={[0, -3, 0]} size={5} speed={0.08} opacity={0.35} color="#e8fff8" />
      )}

      {/* always-on platforms */}
      {BASE_FLOORS.map((r) => (
        <Platform key={r.id} rect={r} />
      ))}

      {/* energized causeway tiles */}
      {STAGES.flatMap((st) =>
        st.tiles.map((t) => (
          <EnergyTile
            key={t.edge}
            rect={t.rect}
            live={energized.has(t.edge)}
          />
        ))
      )}

      {/* visible signal beams */}
      {STAGES.map((st) =>
        beams[st.id].segments.map((seg, i) => (
          <BeamBar key={`${st.id}-${i}`} a={seg.a} b={seg.b} />
        ))
      )}

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
        ))
      )}

      {/* portal arches */}
      {ARCHES.map((a, i) => (
        <group key={i} position={[a.x, 0, a.z]} rotation={[0, a.axis === "x" ? Math.PI / 2 : 0, 0]}>
          {[-a.w / 2, a.w / 2].map((x, j) => (
            <mesh key={j} position={[x, a.h / 2, 0]} castShadow>
              <boxGeometry args={[0.5, a.h, 0.5]} />
              <meshStandardMaterial color="#efe6d2" roughness={0.8} />
            </mesh>
          ))}
          <mesh position={[0, a.h + 0.25, 0]} castShadow>
            <boxGeometry args={[a.w + 1, 0.5, 0.55]} />
            <meshStandardMaterial color="#eccfae" roughness={0.8} />
          </mesh>
          <mesh position={[0, a.h - 0.35, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[a.w / 2 - 0.2, 0.06, 6, 24, Math.PI]} />
            <meshStandardMaterial color="#b7a9c9" roughness={0.7} />
          </mesh>
        </group>
      ))}

      {/* floating stair stacks in the void */}
      {FLOATING_STEPS.map((st, i) => {
        const dv = [[0, -1], [1, 0], [0, 1], [-1, 0]][st.dir];
        return (
          <group key={i}>
            {Array.from({ length: st.n }, (_, k) => (
              <mesh
                key={k}
                position={[st.x + dv[0] * k * 0.85, -0.4 + k * 0.55, st.z + dv[1] * k * 0.85]}
                castShadow
              >
                <boxGeometry args={[1.4, 0.32, 0.85]} />
                <meshStandardMaterial color={k % 2 ? "#efe6d2" : "#eccfae"} roughness={0.85} />
              </mesh>
            ))}
          </group>
        );
      })}

      {/* distant pale skyline in the haze */}
      {SKYLINE.map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 2, b.z]}>
          <boxGeometry args={[b.w, b.h, b.d]} />
          <meshStandardMaterial color="#c3b4d4" roughness={1} />
        </mesh>
      ))}

      {/* lamp posts — warm when the grid serves the living */}
      {LAMP_POSTS.map((l, i) => (
        <group key={i} position={[l.x, 0, l.z]}>
          <mesh position={[0, 1.3, 0]} castShadow>
            <cylinderGeometry args={[0.05, 0.07, 2.6, 6]} />
            <meshStandardMaterial color="#6f6580" roughness={0.7} />
          </mesh>
          <mesh position={[0, 2.68, 0]}>
            <sphereGeometry args={[0.15, 10, 10]} />
            <meshStandardMaterial
              ref={i === 0 ? lampMat : undefined}
              color="#4a3a20"
              emissive="#f2b84b"
              emissiveIntensity={0.5}
            />
          </mesh>
        </group>
      ))}
      <pointLight
        ref={dockLight}
        position={[-12.8, 2.4, 7.5]}
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
          <Sparkles count={90} scale={[30, 10, 30]} size={2.4} speed={0.4} color="#7ce8dd" />
        )}
      </group>

      {/* relay cables to emitters and platforms */}
      {cables.map((pts, i) => (
        <Line key={i} points={pts} color="#8d84a3" lineWidth={1.2} transparent opacity={0.7} />
      ))}

      {/* red accent fin on the plaza — the one saturated marker */}
      <mesh position={[3.9, 1.4, -3.9]} castShadow>
        <boxGeometry args={[0.18, 2.8, 0.18]} />
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.8} roughness={0.5} />
      </mesh>
    </group>
  );
}
