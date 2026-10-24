"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import District from "./District";
import Npcs from "./Characters";
import PlayerRig from "./PlayerRig";
import { useGameStore } from "@/lib/game/store";
export { clearModelCache } from "./model-cache";

/**
 * Watches this mount's own gl.domElement for context loss. Registered
 * inside the Canvas via useThree, so it binds directly to the created
 * element (no ordering race with onCreated) and removes itself on
 * unmount — a delayed disposal event from a previously unmounted canvas
 * can never reach a fresh mount.
 */
function ContextLossWatcher({ onError }: { onError: () => void }) {
  const gl = useThree((s) => s.gl);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  useEffect(() => {
    const el = gl.domElement;
    const handler = () => onErrorRef.current();
    el.addEventListener("webglcontextlost", handler);
    return () => el.removeEventListener("webglcontextlost", handler);
  }, [gl]);
  return null;
}

export default function CityScene({
  onError,
  onReady,
}: {
  onError: () => void;
  onReady: () => void;
}) {
  const sealedPast = useGameStore((s) => s.decisions.retain === false);
  const fogColor = sealedPast ? "#c7d7eb" : "#cfe6dd";
  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows
      camera={{ position: [14, 11, 14], fov: 45, near: 0.1, far: 260 }}
      gl={{ antialias: true, powerPreference: "default" }}
      onCreated={({ gl }) => {
        // Exposed for browser verification of the context-loss path.
        (window as unknown as Record<string, unknown>).__echoGl = gl;
        onReady();
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <ContextLossWatcher onError={onError} />
      {/* bright mint atmosphere + soft luminous distance fog */}
      <color attach="background" args={[fogColor]} />
      <fog attach="fog" args={[fogColor, 30, 130]} />
      <hemisphereLight args={["#fff3dd", "#a99bc0", 1.15]} />
      <ambientLight intensity={0.3} color="#ffe9d0" />
      <directionalLight
        position={[16, 24, 12]}
        intensity={1.8}
        color="#ffe3b3"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />
      <directionalLight
        position={[-12, 14, -10]}
        intensity={0.45}
        color="#7ce8dd"
      />
      <Suspense fallback={null}>
        <District />
        <Npcs />
        <PlayerRig />
      </Suspense>
    </Canvas>
  );
}
