"use client";

import { useEffect, useState } from "react";
import { useGameStore } from "@/lib/game/store";
import {
  DECISIONS,
  ENDINGS,
  INTRO_LINES,
  NPCS,
  REVEAL_LINES,
  pickDialogueLines,
} from "@/lib/game/story";
import { stageGuide, turnsToInit } from "@/lib/game/signal";
import { STAGES } from "@/lib/game/signal";
import type { DecisionId } from "@/lib/game/types";

export default function Overlays() {
  const overlay = useGameStore((s) => s.overlay);
  if (!overlay) return null;
  switch (overlay.kind) {
    case "intro":
      return <IntroOverlay />;
    case "dialogue":
      return <DialogueOverlay npcId={overlay.npcId} />;
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
  // Post-reveal = the ending was computed (all three decisions made) or
  // the ending screen was already viewed — not mere beam alignment.
  const revealed = useGameStore((s) => s.ending !== null || s.reachedEnding);
  const closeDialogue = useGameStore((s) => s.closeDialogue);
  const repeatVisit = useGameStore((s) => s.repeatVisit);
  const lines = pickDialogueLines(npc, repeatVisit, revealed);
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
        {last && !repeatVisit && (
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
  const closeDecision = useGameStore((s) => s.closeDecision);
  const setNotice = useGameStore((s) => s.setNotice);
  const [chosen, setChosen] = useState<null | { label: string; consequence: string; flag: boolean }>(null);

  const choose = (opt: (typeof d.options)[number]) => {
    setChosen(opt);
    applyDecision(id, opt.flag);
  };

  const close = () => {
    setNotice(null);
    closeDecision();
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
        <SignalHelp />
      </div>
    </div>
  );
}

/* Same beam description guided mode shows — read from the shared state. */
function SignalHelp() {
  const joints = useGameStore((s) => s.joints);
  const rotateJoint = useGameStore((s) => s.rotateJoint);
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="signal-help">
      <button
        className="btn"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        Signal help: {expanded ? "hide" : "show"}
      </button>
      {expanded &&
        STAGES.map((st) => {
          const g = stageGuide(st, joints);
          return (
            <div key={st.id} className="signal-help-stage">
              <p className="dim">
                <b>{st.label}</b> — {g.route}; {g.stopsAt}.
              </p>
              {!g.reached && <p>{g.hint}</p>}
              <button
                className="btn"
                onClick={() => {
                  for (const j of st.joints) {
                    const turns = turnsToInit(joints[j.id], j.init);
                    for (let i = 0; i < turns; i++) rotateJoint(j.id);
                  }
                }}
              >
                Reset stage
              </button>
            </div>
          );
        })}
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
