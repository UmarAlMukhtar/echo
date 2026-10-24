"use client";

import { useGameStore } from "@/lib/game/store";
import { FRAGMENTS } from "@/lib/game/story";

export default function Hud() {
  const objective = useGameStore((s) => s.objective);
  const nearby = useGameStore((s) => s.nearby);
  const overlay = useGameStore((s) => s.overlay);
  const fragments = useGameStore((s) => s.fragments);
  const lastNotice = useGameStore((s) => s.lastNotice);
  const pause = useGameStore((s) => s.pause);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const setReducedMotion = useGameStore((s) => s.setReducedMotion);
  const phase = useGameStore((s) => s.phase);
  const mode = useGameStore((s) => s.mode);
  const setMode = useGameStore((s) => s.setMode);

  if (phase === "title") return null;

  return (
    <div className="hud">
      <div className="hud-objective">
        <div className="label">Objective</div>
        <div className="text">{objective}</div>
      </div>
      <div className="hud-top-right">
        <button
          className={`icon-btn ${reducedMotion ? "active" : ""}`}
          title="Reduced motion"
          aria-pressed={reducedMotion}
          onClick={() => setReducedMotion(!reducedMotion)}
        >
          ↯
        </button>
        <button
          className={`icon-btn`}
          title="Switch to guided story mode"
          onClick={() => setMode(mode === "3d" ? "story" : "3d")}
        >
          Aa
        </button>
        <button
          className="icon-btn"
          title="Pause (Esc)"
          onClick={pause}
          aria-label="Pause"
        >
          ❚❚
        </button>
      </div>
      {lastNotice && <div className="hud-notice">{lastNotice}</div>}
      {!overlay && nearby && (
        <div className="hud-prompt" role="status">
          <span className="key">E</span>
          {nearby.prompt}
        </div>
      )}
      {fragments.length > 0 && (
        <div className="hud-fragments" aria-label="Collected fragments">
          {FRAGMENTS.map((f) => (
            <span
              key={f.id}
              className={fragments.includes(f.id) ? "have" : undefined}
            >
              {f.glyph} {f.id}
            </span>
          ))}
        </div>
      )}
      <div className="hud-controls">
        <b>Move</b> WASD / arrows · <b>Orbit</b> drag · <b>Zoom</b> wheel
        <br />
        <b>Interact</b> E / Enter · <b>Pause</b> Esc
      </div>
    </div>
  );
}
