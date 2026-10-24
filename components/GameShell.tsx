"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { playerRuntime, useGameStore } from "@/lib/game/store";
import { computeAllBeams } from "@/lib/game/signal";
import SceneBoundary from "@/components/scene/SceneBoundary";
import TitleScreen from "@/components/ui/TitleScreen";
import Hud from "@/components/ui/Hud";
import Overlays from "@/components/ui/Overlays";
import StoryMode from "@/components/story/StoryMode";

const CityScene = dynamic(() => import("@/components/scene/CityScene"), {
  ssr: false,
  loading: () => null,
});

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext("webgl2") || c.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

export default function GameShell() {
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);
  const setReducedMotion = useGameStore((s) => s.setReducedMotion);
  const setMode = useGameStore((s) => s.setMode);
  const refreshSaveStatus = useGameStore((s) => s.refreshSaveStatus);
  const setNotice = useGameStore((s) => s.setNotice);
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const [sceneError, setSceneError] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);

  useEffect(() => {
    setWebglOk(webglAvailable());
    refreshSaveStatus();
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [setReducedMotion, refreshSaveStatus]);

  // Escape pauses only when nothing else is open (overlays handle their own).
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const s = useGameStore.getState();
      if (s.phase === "playing" && !s.overlay) s.pause();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Test/debug handle — lets playtests read position and state without internals.
  useEffect(() => {
    (window as unknown as { __echo?: unknown }).__echo = {
      store: useGameStore,
      player: playerRuntime,
      beams: () => computeAllBeams(useGameStore.getState().joints),
    };
  }, []);

  useEffect(() => {
    const storage = (() => {
      try {
        return window.localStorage;
      } catch {
        return undefined;
      }
    })();
    if (!storage) {
      setNotice(
        "Local saves are unavailable in this browser — progress won't persist between visits.",
      );
    }
  }, [setNotice]);

  // WebGL missing → story mode with a notice.
  useEffect(() => {
    if (webglOk === false && mode === "3d") {
      setMode("story");
      setNotice("3D view unavailable — switched to Guided Story Mode.");
    }
  }, [webglOk, mode, setMode, setNotice]);

  // A latched scene error is recoverable: retry the mount when 3D is the
  // live view again (Return to 3D, or a fresh run after a failure).
  useEffect(() => {
    if (sceneError && mode === "3d" && phase === "playing")
      setSceneKey((k) => k + 1);
  }, [sceneError, mode, phase]);

  const useStory = mode === "story" || webglOk === false;

  return (
    <div className="game-root">
      {!useStory && (
        <SceneBoundary
          onError={() => {
            // CityScene is already loaded when a model fails; clear its rejected
            // GLB entries before the next Return-to-3D mount can reuse them.
            void import("@/components/scene/CityScene")
              .then(({ clearModelCache }) => clearModelCache())
              .catch(() =>
                setNotice(
                  "3D could not load. Reload the page to retry; guided play remains available.",
                ),
              );
            setMode("story");
            setNotice(
              "3D assets could not load — Guided Story Mode is available. Return to 3D to retry.",
            );
          }}
        >
          <CityScene
            key={sceneKey}
            onReady={() => setSceneError(false)}
            onError={() => {
              setSceneError(true);
              // Only a real loss while the 3D view is live switches modes;
              // context disposal on an intentional unmount (mode already
              // "story", or quitting to title) stays silent here.
              const s = useGameStore.getState();
              if (s.mode === "3d" && s.phase !== "title") {
                s.setMode("story");
                s.setNotice("3D view lost — switched to Guided Story Mode.");
              }
            }}
          />
        </SceneBoundary>
      )}
      {useStory && phase !== "title" && <StoryMode />}
      {phase === "title" && <TitleScreen webglOk={webglOk !== false} />}
      {!useStory && <Hud />}
      <Overlays />
    </div>
  );
}
