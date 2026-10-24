"use client";

import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/lib/game/store";
import {
  DECISIONS,
  ENDINGS,
  FRAGMENTS,
  INTRO_LINES,
  NPCS,
  REVEAL_LINES,
} from "@/lib/game/story";
import {
  checkSolution,
  cyclePhase,
  initialSelections,
} from "@/lib/game/puzzle";
import type { DecisionId } from "@/lib/game/types";

export default function Overlays() {
  const overlay = useGameStore((s) => s.overlay);
  if (!overlay) return null;
  switch (overlay.kind) {
    case "intro":
      return <IntroOverlay />;
    case "dialogue":
      return <DialogueOverlay npcId={overlay.npcId} />;
    case "puzzle":
      return <PuzzleOverlay />;
    case "reveal":
      return <RevealOverlay />;
    case "decision":
      return <DecisionOverlay id={overlay.id} />;
    case "ending":
      return <EndingOverlay />;
    case "pause":
      return <PauseOverlay />;
  }
}

/* ------------------------------ Intro ------------------------------ */

function IntroOverlay() {
  const [step, setStep] = useState(0);
  const resume = useGameStore((s) => s.resume);
  const next = () => {
    if (step < INTRO_LINES.length - 1) setStep(step + 1);
    else resume();
  };
  useEscape(next);
  return (
    <div className="overlay">
      <div className="panel" role="dialog" aria-label="Introduction">
        <div className="eyebrow">
          Veli · Ninth Canal District · {step + 1}/{INTRO_LINES.length}
        </div>
        <p>{INTRO_LINES[step]}</p>
        <div className="button-row">
          <button className="btn primary" onClick={next} autoFocus>
            {step < INTRO_LINES.length - 1 ? "Continue" : "Begin"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Dialogue ----------------------------- */

function DialogueOverlay({ npcId }: { npcId: "mirai" | "devi" | "ilyas" }) {
  const npc = NPCS[npcId];
  const puzzleSolved = useGameStore((s) => s.puzzleSolved);
  const closeDialogue = useGameStore((s) => s.closeDialogue);
  const repeatVisit = useGameStore((s) => s.repeatVisit);
  const lines = puzzleSolved
    ? npc.afterRelay
    : repeatVisit
      ? npc.again
      : npc.firstMeeting;
  const [step, setStep] = useState(0);
  const last = step >= lines.length - 1;
  const advance = () => {
    if (last) closeDialogue();
    else setStep(step + 1);
  };
  useEscape(closeDialogue);
  return (
    <div className="overlay light-dim">
      <div className="panel" role="dialog" aria-label={`Speaking with ${npc.name}`}>
        <div className="dialogue-name">
          <span className="npc-name" style={{ color: npc.accent }}>
            {npc.name}
          </span>
          <span className="npc-role">{npc.role}</span>
        </div>
        <p className="dialogue-line">{lines[step].replace(/\*/g, "")}</p>
        {last && !puzzleSolved && !repeatVisit && (
          <div className="clue-card">
            Signal fragment received: <b>{npc.fragment}</b>
            <br />
            {npc.clue}
          </div>
        )}
        <div className="button-row">
          <button className="btn primary" onClick={advance} autoFocus>
            {last ? "Leave" : "…"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Puzzle ------------------------------ */

function PuzzleOverlay() {
  const [sel, setSel] = useState(initialSelections);
  const [tried, setTried] = useState(false);
  const puzzleSolvedNow = useGameStore((s) => s.puzzleSolvedNow);
  const resume = useGameStore((s) => s.resume);
  const check = useMemo(() => checkSolution(sel), [sel]);
  useEscape(resume);

  const attune = () => {
    if (check.solved) puzzleSolvedNow();
    else setTried(true);
  };

  return (
    <div className="overlay">
      <div className="panel" role="dialog" aria-label="Memory relay puzzle">
        <div className="eyebrow">Memory Relay</div>
        <h2>Align the three voices</h2>
        <p className="dim">
          Each resident left you a fragment and a line of truth. Tune every dial
          to the phase their words describe.
        </p>
        <div className="relay-dials">
          {FRAGMENTS.map((f) => {
            const cur = f.phases[sel[f.id]];
            const right = check.correct.includes(f.id);
            return (
              <div key={f.id} className={`dial ${tried && right ? "aligned" : ""}`}>
                <div className="dial-name">{f.label}</div>
                <div className="dial-glyph" aria-hidden>
                  {cur.glyph}
                </div>
                <div className="dial-phase">{cur.label}</div>
                <button
                  className="btn"
                  onClick={() => setSel((v) => cyclePhase(v, f.id))}
                  aria-label={`Cycle ${f.label} phase (currently ${cur.label})`}
                >
                  Turn dial
                </button>
              </div>
            );
          })}
        </div>
        {tried && !check.solved && (
          <p className="dim" role="status">
            {check.correct.length === 0
              ? "Nothing locks in. Reread the residents' words."
              : `${check.correct.length} of 3 voices aligned. The relay is listening.`}
          </p>
        )}
        <ul className="clue-list">
          <li>Mirai — “the tide was still rising when the water took the quarter.”</li>
          <li>Devi — “his lantern burned at the harbor until the very end.”</li>
          <li>Ilyas — “the rain had already stopped when we overloaded the relay.”</li>
        </ul>
        <div className="button-row">
          <button className="btn primary" onClick={attune}>
            Attune the relay
          </button>
          <button className="btn" onClick={resume}>
            Step back
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- Reveal ------------------------------ */

function RevealOverlay() {
  const [step, setStep] = useState(0);
  const closeReveal = useGameStore((s) => s.closeReveal);
  const next = () => {
    if (step < REVEAL_LINES.length - 1) setStep(step + 1);
    else closeReveal();
  };
  useEscape(next);
  return (
    <div className="overlay">
      <div className="panel" role="dialog" aria-label="The reveal">
        <div className="eyebrow">The relay remembers</div>
        <p>{REVEAL_LINES[step]}</p>
        <div className="button-row">
          <button className="btn primary" onClick={next} autoFocus>
            {step < REVEAL_LINES.length - 1 ? "…" : "Hear its question"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- Decision ----------------------------- */

function DecisionOverlay({ id }: { id: DecisionId }) {
  const d = DECISIONS[id];
  const applyDecision = useGameStore((s) => s.applyDecision);
  const setNotice = useGameStore((s) => s.setNotice);
  const [chosen, setChosen] = useState<null | { label: string; consequence: string; flag: boolean }>(null);

  const choose = (opt: (typeof d.options)[number]) => {
    setChosen(opt);
    applyDecision(id, opt.flag);
  };

  const close = () => {
    setNotice(null);
    useGameStore.getState().resume();
  };

  return (
    <div className="overlay">
      <div className="panel" role="dialog" aria-label={d.title}>
        <div className="eyebrow">
          Decision {d.order + 1} of 3 · {d.place}
        </div>
        <h2>{d.title}</h2>
        <p>{d.prompt}</p>
        {!chosen ? (
          <div>
            {d.options.map((opt) => (
              <button
                key={opt.label}
                className="btn choice"
                onClick={() => choose(opt)}
              >
                <span className="choice-title">{opt.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <p>{chosen.consequence}</p>
            <p className="dim">The city changed. Watch for it outside.</p>
            <div className="button-row">
              <button className="btn primary" onClick={close} autoFocus>
                Continue
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Ending ------------------------------ */

function EndingOverlay() {
  const ending = useGameStore((s) => s.ending);
  const decisions = useGameStore((s) => s.decisions);
  const dismissEnding = useGameStore((s) => s.dismissEnding);
  const resetToTitle = useGameStore((s) => s.resetToTitle);
  const [confirm, setConfirm] = useState(false);
  if (!ending) return null;
  const e = ENDINGS[ending];
  return (
    <div className="overlay">
      <div className="panel ending-panel" role="dialog" aria-label={`Ending: ${e.title}`}>
        <div className="eyebrow">Ending reached</div>
        <h1 className="ending-title">{e.title}</h1>
        {e.body.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        <ul className="recap-list" aria-label="Your choices">
          {(["retain", "serve", "control"] as DecisionId[]).map((id) => {
            const d = DECISIONS[id];
            const flag = decisions[id];
            const opt = d.options.find((o) => o.flag === flag);
            return (
              <li key={id}>
                <b>{d.title}</b> — {opt?.label ?? "undecided"}
              </li>
            );
          })}
        </ul>
        <p className="dim">{e.rule}</p>
        {!confirm ? (
          <div className="button-row">
            <button className="btn" onClick={dismissEnding} autoFocus>
              Stay in the city
            </button>
            <button className="btn warn" onClick={() => setConfirm(true)}>
              Play again
            </button>
          </div>
        ) : (
          <div className="button-row">
            <button className="btn warn" onClick={resetToTitle} autoFocus>
              Erase this run and return to title
            </button>
            <button className="btn" onClick={() => setConfirm(false)}>
              Keep exploring
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------ Pause ------------------------------ */

function PauseOverlay() {
  const resume = useGameStore((s) => s.resume);
  const toTitle = useGameStore((s) => s.toTitle);
  const reducedMotion = useGameStore((s) => s.reducedMotion);
  const setReducedMotion = useGameStore((s) => s.setReducedMotion);
  const [confirm, setConfirm] = useState(false);
  useEscape(resume);
  return (
    <div className="overlay">
      <div className="panel" role="dialog" aria-label="Paused">
        <div className="eyebrow">Paused</div>
        <h2>ECHO</h2>
        <p className="dim">
          WASD / arrows to move · drag to orbit the camera · wheel to zoom ·
          E or Enter to interact · Esc to pause.
        </p>
        <div className="button-row">
          <button className="btn primary" onClick={resume} autoFocus>
            Resume
          </button>
          <button
            className="btn"
            aria-pressed={reducedMotion}
            onClick={() => setReducedMotion(!reducedMotion)}
          >
            Reduced motion: {reducedMotion ? "on" : "off"}
          </button>
          {!confirm ? (
            <button className="btn warn" onClick={() => setConfirm(true)}>
              Quit to title
            </button>
          ) : (
            <button className="btn warn" onClick={toTitle}>
              Really quit? Progress is saved.
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */

function useEscape(fn: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") fn();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [fn]);
}
