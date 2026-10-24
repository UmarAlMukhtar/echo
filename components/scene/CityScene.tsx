"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
import Buildings from "./Buildings";
import Relay from "./Relay";
import District from "./District";
import Npcs from "./Characters";
import PlayerRig from "./PlayerRig";

export default function CityScene({ onError }: { onError: () => void }) {
  useEffect(() => {
    const onCtxLost = () => onError();
    window.addEventListener("webglcontextlost", onCtxLost, true);
    return () =>
      window.removeEventListener("webglcontextlost", onCtxLost, true);
  }, [onError]);

  return (
    <Canvas
      dpr={[1, 1.5]}
      shadows
      camera={{ position: [14, 8, 14], fov: 50, near: 0.1, far: 220 }}
      gl={{ antialias: true, powerPreference: "default" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", onError);
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#0a0f14"]} />
      <fog attach="fog" args={["#0a0f14", 26, 95]} />
      <hemisphereLight args={["#2e4a55", "#0c0f12", 0.75]} />
      <directionalLight
        position={[14, 22, 10]}
        intensity={1.1}
        color="#ffe3b3"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      <directionalLight position={[-10, 14, -8]} intensity={0.35} color="#4fd1c5" />
      <District />
      <Buildings />
      <Relay />
      <Npcs />
      <PlayerRig />
    </Canvas>
  );
}
