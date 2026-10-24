"use client";

import { useGameStore } from "@/lib/game/store";
import { GAME_SUBTITLE, GAME_TITLE } from "@/lib/game/story";

export default function TitleScreen({ webglOk }: { webglOk: boolean }) {
  const newGame = useGameStore((s) => s.newGame);
  const continueGame = useGameStore((s) => s.continueGame);
  const hasSave = useGameStore((s) => s.hasSave);
  const saveStatus = useGameStore((s) => s.saveStatus);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const setReducedMotion = useGameStore((s) => s.setReducedMotion);
  const mode = useGameStore((s) => s.mode);
  const setMode = useGameStore((s) => s.setMode);

  return (
    <div className="title-screen">
      <div className="title-block">
        <div className="subtitle">{GAME_SUBTITLE}</div>
        <h1>{GAME_TITLE}</h1>
        <p className="tagline">
          A flooded canal district. A keeper who vanished. Three memories that
          disagree. Recover the signal — then decide what a city is allowed to
          forget.
        </p>
        <div className="title-menu" role="menu" aria-label="Main menu">
          <button
            className="btn primary"
            autoFocus
            onClick={() => newGame(webglOk ? mode : "story")}
          >
            New game
          </button>
          {hasSave && (
            <button className="btn" onClick={continueGame}>
              Continue
            </button>
          )}
          <button className="btn" onClick={() => newGame("story")}>
            Guided story mode
          </button>
          {saveStatus === "corrupt" && (
            <p className="dim" role="status">
              A saved game was found but couldn&apos;t be read — it was cleared.
            </p>
          )}
          {saveStatus === "outdated" && (
            <p className="dim" role="status">
              A save from an older build was found — it can&apos;t continue in
              this version and was cleared.
            </p>
          )}
          {saveStatus === "unavailable" && (
            <p className="dim" role="status">
              Saves are unavailable in this browser; progress won&apos;t persist.
            </p>
          )}
          {!webglOk && (
            <p className="dim" role="status">
              3D rendering isn&apos;t available here — Guided Story Mode is
              fully playable.
            </p>
          )}
        </div>
        <div className="title-toggles">
          {webglOk && (
            <button
              className={`icon-btn ${mode === "3d" ? "active" : ""}`}
              title="Toggle 3D / story presentation"
              aria-pressed={mode === "3d"}
              onClick={() => setMode(mode === "3d" ? "story" : "3d")}
            >
              3D
            </button>
          )}
          <button
            className={`icon-btn ${reducedMotion ? "active" : ""}`}
            title="Reduced motion"
            aria-pressed={reducedMotion}
            onClick={() => setReducedMotion(!reducedMotion)}
          >
            ↯
          </button>
        </div>
      </div>
      <div className="title-foot">
        WASD / arrows · drag to orbit · E to interact · Esc to pause
      </div>
    </div>
  );
}
