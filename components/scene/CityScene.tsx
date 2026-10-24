"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect } from "react";
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
      camera={{ position: [14, 11, 14], fov: 45, near: 0.1, far: 260 }}
      gl={{ antialias: true, powerPreference: "default" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", onError);
      }}
      style={{ position: "absolute", inset: 0 }}
    >
      {/* bright mint atmosphere + soft luminous distance fog */}
      <color attach="background" args={["#cfe6dd"]} />
      <fog attach="fog" args={["#cfe6dd", 30, 130]} />
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
      <directionalLight position={[-12, 14, -10]} intensity={0.45} color="#7ce8dd" />
      <District />
      <Relay />
      <Npcs />
      <PlayerRig />
    </Canvas>
  );
}
