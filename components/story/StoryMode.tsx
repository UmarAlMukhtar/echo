"use client";

import { useState } from "react";
import { activeInteractables, useGameStore } from "@/lib/game/store";
import type { InteractableSpec } from "@/lib/game/types";

interface Place {
  id: string;
  name: string;
  desc: string;
  /** interactable ids reachable from here */
  spots: string[];
}

const PLACES: Place[] = [
  {
    id: "plaza",
    name: "Relay Plaza",
    desc: "Charcoal paving under the relay's slow-turning rings. Cables run from its crown to every roof in the district. The whole city seems to be listening through it.",
    spots: ["relay"],
  },
  {
    id: "garden",
    name: "Relay Garden",
    desc: "A rooftop garden transplanted to street level — stubborn green under cyan light. Mirai tends it in silence.",
    spots: ["npc-mirai"],
  },
  {
    id: "dock",
    name: "West Dock",
    desc: "Deep teal canal water lapping at a wooden bridge. A ferry rocks against its posts; a lantern hangs unlit at the gate.",
    spots: ["npc-devi", "lock"],
  },
  {
    id: "workshop",
    name: "Workshop Row",
    desc: "Condenser fans, spooled cable, the smell of ozone. Ilyas's bench faces the relay like a confessional.",
    spots: ["npc-ilyas"],
  },
  {
    id: "vault",
    name: "Archive Vault",
    desc: "A squat limestone drum in the northeast quarter, sealed with a signal ring. Whatever the district kept, it kept it here.",
    spots: ["vault"],
  },
  {
    id: "overlook",
    name: "The Overlook",
    desc: "A stone brow above the plaza. From here the whole district is legible at once: canal, gardens, cables, ghosts if there are any.",
    spots: ["overlook"],
  },
];

export default function StoryMode() {
  const [place, setPlace] = useState("plaza");
  const s = useGameStore();
  const active = activeInteractables(s);
  const here = PLACES.find((p) => p.id === place)!;
  const interactHere = active.filter((a) => here.spots.includes(a.id));
  const overlayOpen = s.overlay !== null;

  const travel = (id: string) => {
    setPlace(id);
  };

  return (
    <div className="story-mode">
      <div className="story-inner">
        <span className="story-badge">Guided story mode</span>
        <div className="story-scene">
          <b>{here.name}.</b> {here.desc}
        </div>

        {!overlayOpen && (
          <>
            {interactHere.length > 0 && (
              <div className="story-map" role="group" aria-label="Things to do here">
                {interactHere.map((it: InteractableSpec) => (
                  <button
                    key={it.id}
                    className="btn primary"
                    onClick={() => s.interact(it)}
                  >
                    {it.prompt}
                  </button>
                ))}
              </div>
            )}
            <div className="eyebrow" style={{ marginTop: 22 }}>
              Walk to
            </div>
            <div className="story-map" role="group" aria-label="Travel">
              {PLACES.filter((p) => p.id !== place).map((p) => (
                <button key={p.id} className="btn" onClick={() => travel(p.id)}>
                  {p.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
