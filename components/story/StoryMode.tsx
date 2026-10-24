"use client";

import { useState } from "react";
import { useGameStore } from "@/lib/game/store";
import {
  STAGES,
  computeAllBeams,
  jointReachable,
  stageGuide,
} from "@/lib/game/signal";
import type { JointId } from "@/lib/game/signal";
import type { InteractableSpec } from "@/lib/game/types";

interface Place {
  id: string;
  name: string;
  desc: string;
  /** interactable ids reachable from here */
  spots: string[];
  /** stage whose beam must connect before travelling here */
  gate?: "stage1" | "stage2" | "stage3";
}

const PLACES: Place[] = [
  {
    id: "plaza",
    name: "Relay Plaza",
    desc: "Pale paving around a brass astrolabe. Three emitters face the causeways; the relay joints wait to be turned.",
    spots: [],
  },
  {
    id: "garden",
    name: "Garden Platform",
    desc: "A coral arch over stubborn green. Mirai tends the beds the flood was meant to take.",
    spots: ["npc-mirai"],
    gate: "stage1",
  },
  {
    id: "dock",
    name: "Dock Platform",
    desc: "An ivory ferry platform over luminous mist where the canal used to be. A lantern hangs unlit at the gate; Devi watches it.",
    spots: ["npc-devi"],
    gate: "stage2",
  },
  {
    id: "archive",
    name: "Archive Platform",
    desc: "A squat drum of ivory and peach facing the spire. Ilyas's bench waits beside the last joint.",
    spots: ["npc-ilyas"],
    gate: "stage3",
  },
  {
    id: "overlook",
    name: "The Overlook",
    desc: "The south edge of the plaza. The whole district reads at once: astrolabe, beams, platforms, ghosts if there are any.",
    spots: ["overlook"],
  },
];

export default function StoryMode() {
  const [place, setPlace] = useState("plaza");
  const [showHints, setShowHints] = useState(false);
  const s = useGameStore();
  const beams = computeAllBeams(s.joints);
  const here = PLACES.find((p) => p.id === place)!;
  const overlayOpen = s.overlay !== null;

  const reachableJoints = (jid: JointId) => jointReachable(jid, s.joints);

  const canTravel = (p: Place) => !p.gate || beams[p.gate].reached;

  const doInteract = (it: InteractableSpec) => s.interact(it);

  return (
    <div className="story-mode">
      <div className="story-inner">
        <div className="story-toolbar">
          <span className="story-badge">Guided story mode</span>
          <span className="story-objective" aria-live="polite">
            <b>Objective.</b> {s.objective}
          </span>
          <div className="story-controls">
            <button
              className="btn"
              aria-pressed={showHints}
              onClick={() => setShowHints(!showHints)}
            >
              Hints: {showHints ? "on" : "off"}
            </button>
            <button className="btn" onClick={() => s.pause()}>
              Pause
            </button>
            <button className="btn" onClick={() => s.setMode("3d")}>
              Return to 3D
            </button>
          </div>
        </div>
        {s.lastNotice && (
          <div className="story-notice" role="status">
            {s.lastNotice}
          </div>
        )}
        <div className="story-scene">
          <b>{here.name}.</b> {here.desc}
        </div>

        {!overlayOpen && (
          <>
            {/* signal routing — equivalent to walking to each joint in 3D */}
            <div className="eyebrow" style={{ marginTop: 18 }}>
              Signal routing
            </div>
            {STAGES.map((st) => {
              const res = beams[st.id];
              const guide = stageGuide(st, s.joints);
              return (
                <div
                  key={st.id}
                  className="story-scene"
                  style={{ marginTop: 8 }}
                >
                  <div>
                    <b>{st.label}</b> — {guide.route};{" "}
                    {res.reached
                      ? `the signal reaches the ${st.targetName}.`
                      : `${guide.stopsAt}.`}
                  </div>
                  <div
                    className="story-joints"
                    aria-label={`${st.label} joint connections`}
                  >
                    {guide.joints.map((jg) => (
                      <span key={jg.id} className="dim">
                        {jg.id} {jg.current}
                        {jg.aligned ? " (aligned)" : ""}
                      </span>
                    ))}
                  </div>
                  {showHints && !res.reached && (
                    <div className="story-hint">{guide.hint}</div>
                  )}
                  <div
                    className="story-map"
                    role="group"
                    aria-label={`${st.label} joints`}
                  >
                    {st.joints.map((j) => {
                      const ok = reachableJoints(j.id);
                      return (
                        <button
                          key={j.id}
                          className="btn"
                          disabled={!ok}
                          title={
                            ok
                              ? "Turn the relay joint"
                              : "The beam hasn't reached this pedestal yet"
                          }
                          onClick={() =>
                            doInteract({
                              id: j.id,
                              kind: "joint",
                              position: j.pos,
                              radius: 0,
                              label: "Relay joint",
                              prompt: "Turn the relay joint",
                            })
                          }
                        >
                          Turn joint ({j.id}) {ok ? "" : "· unreachable"}
                        </button>
                      );
                    })}
                    <button
                      className="btn"
                      title="Return every joint in this stage to its starting angle"
                      onClick={() => s.resetStage(st.id)}
                    >
                      Reset stage
                    </button>
                  </div>
                </div>
              );
            })}

            {here.spots.length > 0 && (
              <>
                <div className="eyebrow" style={{ marginTop: 22 }}>
                  Here
                </div>
                <div
                  className="story-map"
                  role="group"
                  aria-label="Things to do here"
                >
                  {here.spots.map((sid) => {
                    const isNpc = sid.startsWith("npc-");
                    if (isNpc) {
                      return (
                        <button
                          key={sid}
                          className="btn primary"
                          onClick={() =>
                            doInteract({
                              id: sid,
                              kind: "npc",
                              position: [0, 0],
                              radius: 0,
                              label: sid,
                              prompt: `Talk to ${sid.replace("npc-", "")}`,
                            })
                          }
                        >
                          {`Talk to ${sid.replace("npc-", "")}`}
                        </button>
                      );
                    }
                    return (
                      <button
                        key={sid}
                        className="btn primary"
                        disabled={s.decisions.control === undefined}
                        onClick={() =>
                          doInteract({
                            id: sid,
                            kind: "overlook",
                            position: [0, 0],
                            radius: 0,
                            label: "Overlook",
                            prompt: "Let the city speak",
                          })
                        }
                      >
                        Let the city speak
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="eyebrow" style={{ marginTop: 22 }}>
              Walk to
            </div>
            <div className="story-map" role="group" aria-label="Travel">
              {PLACES.filter((p) => p.id !== place).map((p) => (
                <button
                  key={p.id}
                  className="btn"
                  disabled={!canTravel(p)}
                  title={
                    canTravel(p)
                      ? `Walk to ${p.name}`
                      : "The causeway is unpowered — align the signal"
                  }
                  onClick={() => setPlace(p.id)}
                >
                  {p.name}
                  {!canTravel(p) && " · unpowered"}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
