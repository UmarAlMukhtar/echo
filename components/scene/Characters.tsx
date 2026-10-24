"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "@/lib/game/store";
import { NPC_INTERACTABLES } from "@/lib/game/story";
import type { NpcId } from "@/lib/game/types";

/* ------------------------------ Player ----------------------------- */

export function PlayerAvatar() {
  const bob = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const s = useGameStore.getState();
    if (s.reducedMotion || !bob.current) return;
    bob.current.position.y = Math.sin(state.clock.elapsedTime * 2.2) * 0.04;
  });
  return (
    <group ref={bob}>
      {/* legs */}
      <mesh position={[-0.13, 0.32, 0]} castShadow>
        <boxGeometry args={[0.16, 0.64, 0.18]} />
        <meshStandardMaterial color="#1c2229" roughness={0.7} />
      </mesh>
      <mesh position={[0.13, 0.32, 0]} castShadow>
        <boxGeometry args={[0.16, 0.64, 0.18]} />
        <meshStandardMaterial color="#1c2229" roughness={0.7} />
      </mesh>
      {/* torso — cartographer's coat */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.52, 0.72, 0.3]} />
        <meshStandardMaterial color="#31404c" roughness={0.65} />
      </mesh>
      {/* head + visor */}
      <mesh position={[0, 1.5, 0]} castShadow>
        <sphereGeometry args={[0.21, 16, 16]} />
        <meshStandardMaterial color="#d8cdb8" roughness={0.5} />
      </mesh>
      <mesh position={[0, 1.53, 0.14]}>
        <boxGeometry args={[0.3, 0.09, 0.12]} />
        <meshStandardMaterial
          color="#0b2a2a"
          emissive="#4fd1c5"
          emissiveIntensity={1.6}
        />
      </mesh>
      {/* satchel beacon */}
      <mesh position={[0.28, 0.95, -0.08]}>
        <boxGeometry args={[0.1, 0.14, 0.1]} />
        <meshStandardMaterial
          color="#2a1f10"
          emissive="#f2b84b"
          emissiveIntensity={1.1}
        />
      </mesh>
    </group>
  );
}

/* -------------------------------- NPCs ----------------------------- */

function NpcAvatar({ id }: { id: NpcId }) {
  const spec = NPC_INTERACTABLES[id];
  const accent = useRef<THREE.MeshStandardMaterial>(null!);
  const float = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const s = useGameStore.getState();
    if (!s.reducedMotion && float.current) {
      float.current.position.y =
        Math.sin(state.clock.elapsedTime * 1.6 + spec.position[0]) * 0.05;
    }
    if (accent.current) {
      accent.current.emissiveIntensity =
        1.1 + Math.sin(state.clock.elapsedTime * 2 + spec.position[1]) * 0.25;
    }
  });
  return (
    <group position={[spec.position[0], 0, spec.position[1]]}>
      <group ref={float}>
        {id === "mirai" && (
          <>
            <mesh position={[0, 0.75, 0]} castShadow>
              <coneGeometry args={[0.42, 1.5, 8]} />
              <meshStandardMaterial color="#4a3a44" roughness={0.75} />
            </mesh>
            <mesh position={[0, 1.62, 0]} castShadow>
              <sphereGeometry args={[0.19, 14, 14]} />
              <meshStandardMaterial color="#e8d8c8" roughness={0.55} />
            </mesh>
            <mesh position={[0, 1.86, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
              <torusGeometry args={[0.24, 0.028, 8, 24]} />
              <meshStandardMaterial
                ref={accent}
                color="#3a1416"
                emissive="#ff8a7a"
                emissiveIntensity={1.1}
              />
            </mesh>
          </>
        )}
        {id === "devi" && (
          <>
            <mesh position={[0, 0.6, 0]} castShadow>
              <boxGeometry args={[0.5, 1.2, 0.34]} />
              <meshStandardMaterial color="#3d3226" roughness={0.8} />
            </mesh>
            <mesh position={[0, 1.35, 0]} castShadow>
              <sphereGeometry args={[0.2, 14, 14]} />
              <meshStandardMaterial color="#d9c4a8" roughness={0.55} />
            </mesh>
            <mesh position={[0, 1.52, 0]} castShadow>
              <coneGeometry args={[0.55, 0.28, 12]} />
              <meshStandardMaterial color="#5a4630" roughness={0.7} />
            </mesh>
            <mesh position={[0.34, 0.85, 0.1]}>
              <boxGeometry args={[0.12, 0.18, 0.12]} />
              <meshStandardMaterial
                ref={accent}
                color="#2a1f10"
                emissive="#f2b84b"
                emissiveIntensity={1.1}
              />
            </mesh>
          </>
        )}
        {id === "ilyas" && (
          <>
            <mesh position={[0, 0.68, 0]} castShadow>
              <boxGeometry args={[0.56, 1.36, 0.36]} />
              <meshStandardMaterial color="#22333d" roughness={0.7} />
            </mesh>
            <mesh position={[0, 1.5, 0]} castShadow>
              <boxGeometry args={[0.34, 0.3, 0.34]} />
              <meshStandardMaterial color="#cfc2ae" roughness={0.55} />
            </mesh>
            <mesh position={[0.2, 1.95, 0]}>
              <cylinderGeometry args={[0.015, 0.015, 0.6, 6]} />
              <meshStandardMaterial
                ref={accent}
                color="#123a3a"
                emissive="#4fd1c5"
                emissiveIntensity={1.1}
              />
            </mesh>
          </>
        )}
      </group>
      {/* beacon marker */}
      <QuestMarker id={`npc-${id}`} />
    </group>
  );
}

/** Floating marker above whichever interactable is currently relevant. */
export function QuestMarker({ id }: { id: string }) {
  const mesh = useRef<THREE.Mesh>(null!);
  useFrame((state) => {
    const s = useGameStore.getState();
    const isNpc = id.startsWith("npc-");
    const active = isNpc
      ? s.fragments.length < 3 && !s.talkedTo.includes(id.slice(4) as NpcId)
      : activeId(s) === id;
    if (mesh.current) {
      mesh.current.visible = active;
      if (active && !s.reducedMotion) {
        mesh.current.rotation.y += 0.03;
        mesh.current.position.y =
          2.6 + Math.sin(state.clock.elapsedTime * 2.4) * 0.18;
      }
    }
  });
  return (
    <mesh ref={mesh} position={[0, 2.6, 0]} visible={false}>
      <octahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial
        color="#0d3a3a"
        emissive="#4fd1c5"
        emissiveIntensity={2}
      />
    </mesh>
  );
}

/** Which single interactable should pulse for guidance. */
function activeId(s: {
  fragments: string[];
  puzzleSolved: boolean;
  decisions: Record<string, boolean | undefined>;
  ending: string | null;
  talkedTo: string[];
}): string | null {
  if (s.fragments.length < 3) {
    // nearest unmet resident is closest handled by proximity; mark all unmet
    return null;
  }
  if (!s.puzzleSolved) return "relay";
  if (s.decisions.retain === undefined) return "relay";
  if (s.decisions.serve === undefined) return "lock";
  if (s.decisions.control === undefined) return "vault";
  if (s.ending === null) return "overlook";
  return null;
}

export default function Npcs() {
  return (
    <group>
      {(Object.keys(NPC_INTERACTABLES) as NpcId[]).map((id) => (
        <NpcAvatar key={id} id={id} />
      ))}
    </group>
  );
}
