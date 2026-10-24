"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useGameStore } from "@/lib/game/store";
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
        "Local saves are unavailable in this browser — progress won't persist between visits."
      );
    }
  }, [setNotice]);

  // WebGL missing or the scene failed to mount → story mode with a notice.
  useEffect(() => {
    if (webglOk === false && mode === "3d") {
      setMode("story");
      setNotice("3D view unavailable — switched to Guided Story Mode.");
    }
  }, [webglOk, mode, setMode, setNotice]);

  const useStory = mode === "story" || webglOk === false || sceneError;

  return (
    <div className="game-root">
      {!useStory && <CityScene onError={() => setSceneError(true)} />}
      {useStory && phase !== "title" && <StoryMode />}
      {phase === "title" && <TitleScreen webglOk={webglOk !== false} />}
      {!useStory && <Hud />}
      <Overlays />
    </div>
  );
}
