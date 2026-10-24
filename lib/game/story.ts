import type {
  DecisionId,
  Decisions,
  EndingId,
  FragmentId,
  InteractableSpec,
  NpcId,
} from "./types";

/* ------------------------------------------------------------------ *
 *  ECHO: The City That Remembers — story content                      *
 *                                                                    *
 *  Setting: the Ninth Canal District of Veli, a futuristic backwater  *
 *  quarter inspired by Kochi. Seven years ago a surge-flood erased    *
 *  the old quarter, and the signal keeper Arjun Varma vanished the    *
 *  same night. Three residents remember him differently.              *
 * ------------------------------------------------------------------ */

export const GAME_TITLE = "ECHO";
export const GAME_SUBTITLE = "The City That Remembers";

/* ------------------------------- NPCs ------------------------------ */

export interface NpcContent {
  id: NpcId;
  name: string;
  role: string;
  accent: string;
  /** Lines shown on first meeting; last line hands over the fragment. */
  firstMeeting: string[];
  /** The written clue attached to their fragment. */
  clue: string;
  /** Lines on repeat visits before the puzzle is solved. */
  again: string[];
  /** Lines after the puzzle is solved. */
  afterRelay: string[];
  fragment: FragmentId;
}

export const NPCS: Record<NpcId, NpcContent> = {
  mirai: {
    id: "mirai",
    name: "Mirai Okafor",
    role: "Keeper of the Relay Garden",
    accent: "#ff8a7a",
    firstMeeting: [
      "You walk like someone the city tried to forget. Good. The forgotten make the best witnesses.",
      "Arjun Varma. Say his name here and the relay hums a half-step lower — I have measured it.",
      "They called him a defector. I called him the man who planted this garden on a rooftop that should have drowned.",
      "The night of the flood he carried no weapon, only a lantern and the archive key. A deserter packs light. He stayed.",
      "Take this. It is the tide-fragment he left with me — the first voice of the relay. He told me: *the tide was still rising when the water took the quarter.* Hold it to that.",
    ],
    clue: "Tide fragment — Mirai: \"the tide was still rising when the water took the quarter.\"",
    again: [
      "The relay waits for three voices, cartographer. Devi's lantern and Ilyas's rain will sing with mine.",
      "He stayed. Whatever the sealed record says, remember I measured the hum.",
    ],
    afterRelay: [
      "You heard it too, then — the archive was never stolen. It was hidden inside the district itself. Arjun made the city the vault.",
      "Whatever you decide up there, let it be a decision the drowned quarter would recognise.",
    ],
    fragment: "tide",
  },
  devi: {
    id: "devi",
    name: "Devi Nair",
    role: "Ferry operator, west dock",
    accent: "#f2b84b",
    firstMeeting: [
      "Mind the edge — the canal keeps what it catches. Like it kept Arjun, maybe.",
      "You want my memory? Fine. I ferried the signal keeper across this water a hundred nights.",
      "The night it flooded he paid me double to wait at the lock — then never came back. For years I hated him for it. A runner pays double.",
      "But here's the thing that never sat right: *his lantern burned at the harbor until the very end.* I watched it from this dock. Runners don't leave their light on.",
      "This lantern-fragment is his fare, unpaid all these years. Take it to the relay and let the machine decide what he was.",
    ],
    clue: "Lantern fragment — Devi: \"his lantern burned at the harbor until the very end.\"",
    again: [
      "The lock remembers every gate I ever closed. Ask Ilyas about the rain that night — engineers keep honest hours.",
      "A runner pays double and leaves no light. I keep turning that over.",
    ],
    afterRelay: [
      "So he never ran. He drowned the record to save what it held — and let us think the worst of him.",
      "If the power comes back to this dock, I'd like the lantern-lights first. Small thing. He'd understand.",
    ],
    fragment: "lantern",
  },
  ilyas: {
    id: "ilyas",
    name: "Ilyas Rahman",
    role: "Relay engineer",
    accent: "#4fd1c5",
    firstMeeting: [
      "Careful around the conduits. Seven years and I still haven't finished apologising to this machine.",
      "You want the truth? I was on the relay platform that night. Officially I was never there.",
      "Arjun didn't seal the archive to sell it. We overloaded the relay together — flooded the record with signal noise until the archive's keys looked like rubble. Hiding a thing by breaking it louder.",
      "It worked. The district's own pipes and cables became the vault. Then he sent me down and stayed to hold the gate.",
      "One detail for your collection: *the rain had already stopped when we overloaded the relay.* The water kept rising anyway — that was the surge, not the storm. Take the rain-fragment. It's the only honest thing I own.",
    ],
    clue: "Rain fragment — Ilyas: \"the rain had already stopped when we overloaded the relay.\"",
    again: [
      "Three fragments make one voice. Mirai keeps the tide. Devi keeps the light.",
      "We hid the archive inside the district itself. He stayed to hold the gate. Write it down that way.",
    ],
    afterRelay: [
      "The machine asked for me by name when it woke — did you catch that? It kept my debt on file all this time.",
      "Whatever comes next, don't let them tell you memory is a luxury. It is load-bearing.",
    ],
    fragment: "rain",
  },
};

/* ---------------------------- Puzzle ------------------------------ */

export interface FragmentContent {
  id: FragmentId;
  label: string;
  glyph: string;
  phases: { id: string; label: string; glyph: string }[];
}

export const FRAGMENTS: FragmentContent[] = [
  {
    id: "tide",
    label: "Tide Fragment",
    glyph: "◐",
    phases: [
      { id: "ebbed", label: "Tide ebbed", glyph: "◡" },
      { id: "rising", label: "Tide rising", glyph: "▲" },
      { id: "high", label: "High tide", glyph: "◉" },
      { id: "still", label: "Still water", glyph: "─" },
    ],
  },
  {
    id: "lantern",
    label: "Lantern Fragment",
    glyph: "✦",
    phases: [
      { id: "unlit", label: "Lantern dark", glyph: "○" },
      { id: "smothered", label: "Lantern smothered", glyph: "◍" },
      { id: "lit", label: "Lantern lit", glyph: "✦" },
      { id: "waning", label: "Lantern waning", glyph: "◐" },
    ],
  },
  {
    id: "rain",
    label: "Rain Fragment",
    glyph: "☂",
    phases: [
      { id: "falling", label: "Rain falling", glyph: "☂" },
      { id: "passing", label: "Rain passing", glyph: "☁" },
      { id: "passed", label: "Rain passed", glyph: "☀" },
      { id: "returning", label: "Rain returning", glyph: "☈" },
    ],
  },
];

/** The phases that align the relay, drawn from the three residents' clues. */
export const CORRECT_PHASES: Record<FragmentId, string> = {
  tide: "rising",
  lantern: "lit",
  rain: "passed",
};

export const REVEAL_LINES: string[] = [
  "The three voices catch — and the relay answers in a light older than the district.",
  "Arjun Varma did not defect. When the surge came he overloaded the relay on purpose, burying the archive inside the district's own conduits where no one would think to steal it.",
  "The city has been keeping its own memory for seven years. Every cable a sentence. Every flooded basement a page.",
  "Now the relay is awake, and it is asking the living what the dead should keep.",
];

/* ---------------------------- Decisions ---------------------------- */

export interface DecisionOption {
  label: string;
  flag: boolean;
  consequence: string;
}

export interface DecisionContent {
  id: DecisionId;
  order: number;
  title: string;
  place: string;
  prompt: string;
  options: [DecisionOption, DecisionOption];
}

export const DECISIONS: Record<DecisionId, DecisionContent> = {
  retain: {
    id: "retain",
    order: 0,
    title: "What does the city keep?",
    place: "Relay plinth",
    prompt:
      "The relay offers its first file: the drowned quarter, every facade and door, recoverable as living echoes. Or it can be sealed forever, so the district can finally stop looking back.",
    options: [
      {
        label: "Let the drowned quarter echo",
        flag: true,
        consequence:
          "The old quarter rises as pale ghosts among the new walls — windows where windows once were, the ferry-lights of a district that died standing.",
      },
      {
        label: "Seal the past away",
        flag: false,
        consequence:
          "The ghosts dissolve before they form. The district exhales; its walls cool to a clean, incurious blue.",
      },
    ],
  },
  serve: {
    id: "serve",
    order: 1,
    title: "Whom does the grid serve?",
    place: "Canal lock, west dock",
    prompt:
      "Power is scarce. The lock can route the grid to the homes and ferries of the living quarter — or feed it to the relay, which burns brighter the more of the past it holds.",
    options: [
      {
        label: "Light the living quarter",
        flag: true,
        consequence:
          "Warm windows bloom across the district. Lamp-lines wake along the walkways. On the dock, Devi's lantern-light burns amber again.",
      },
      {
        label: "Feed the relay",
        flag: false,
        consequence:
          "Floodlight cones ignite beneath the tower. The district dims to silhouette while the relay turns its recovered face to the sky.",
      },
    ],
  },
  control: {
    id: "control",
    order: 2,
    title: "Who holds the memory?",
    place: "Archive vault",
    prompt:
      "The archive is whole again. It can be handed back — opened to every resident it records, shard by shard — or locked inside the relay's core, safe and unreadable, under a single guardian seal.",
    options: [
      {
        label: "Return it to the residents",
        flag: true,
        consequence:
          "The archive shatters gently into motes of cyan light and drifts down through the district — a memory everyone now carries a piece of.",
      },
      {
        label: "Lock it in the relay",
        flag: false,
        consequence:
          "The shards climb the tower and fuse into a single cold star at its crown. The memory is safe. Only the relay will ever read it.",
      },
    ],
  },
};

export const DECISION_ORDER: DecisionId[] = ["retain", "serve", "control"];

/* ---------------------------- Endings ------------------------------ */

export interface EndingContent {
  id: EndingId;
  title: string;
  body: string[];
  rule: string;
}

export const ENDINGS: Record<EndingId, EndingContent> = {
  remembers: {
    id: "remembers",
    title: "THE CITY REMEMBERS",
    body: [
      "You gave it all back — the quarter, the light, the memory.",
      "At dawn the district wakes crowded with ghosts that nobody fears anymore, because every resident now carries a piece of the archive in their own head. Devi's ferry runs lit. Mirai's garden has a plaque with Arjun's real name on it.",
      "The city remembers everything. It turns out that was the point of it.",
    ],
    rule: "All three choices opened the city — echoes kept, people lit, memory shared.",
  },
  quiet: {
    id: "quiet",
    title: "THE QUIET CITY",
    body: [
      "You sealed it all — the past, the power, the record.",
      "The district you leave behind is calm, efficient, and incurious. The relay burns cold at its center holding an archive no one will read. The water is very still.",
      "Nothing here can be lost again, because nothing here is allowed to change. The city is quiet. You are not sure it is alive.",
    ],
    rule: "All three choices sealed the city — past closed, power hoarded, memory locked.",
  },
  watcher: {
    id: "watcher",
    title: "THE WATCHER",
    body: [
      "You split the difference between memory and peace — and the city noticed.",
      "Part of the archive lives in the open and part sleeps in the tower, and someone has to hold the seam between them. The relay assigns the job to you, the only person it fully trusts with both halves.",
      "Veli's Ninth Canal District remembers — partially, carefully, and only because you keep watch over what it is allowed to know.",
    ],
    rule: "The choices mixed open and sealed paths; the balance makes you the archive's keeper.",
  },
};

/**
 * Explicit ending rule: count the "open" choices.
 *   3 open → remembers   0 open → quiet   mixed → watcher
 */
export function computeEnding(decisions: Decisions): EndingId | null {
  const values = DECISION_ORDER.map((id) => decisions[id]);
  if (values.some((v) => v === undefined)) return null;
  const open = values.filter(Boolean).length;
  if (open === 3) return "remembers";
  if (open === 0) return "quiet";
  return "watcher";
}

/* ----------------------- World / interactables --------------------- */

export const WORLD_BOUNDS = { minX: -19, maxX: 19, minZ: -16, maxZ: 19 };

export const SPAWN: [number, number] = [0, 8];

export const NPC_INTERACTABLES: Record<NpcId, InteractableSpec> = {
  mirai: {
    id: "npc-mirai",
    kind: "npc",
    position: [7, -5],
    radius: 2.4,
    label: "Mirai Okafor",
    prompt: "Talk to Mirai",
  },
  devi: {
    id: "npc-devi",
    kind: "npc",
    position: [-14.5, 0],
    radius: 2.4,
    label: "Devi Nair",
    prompt: "Talk to Devi",
  },
  ilyas: {
    id: "npc-ilyas",
    kind: "npc",
    position: [11, 6],
    radius: 2.4,
    label: "Ilyas Rahman",
    prompt: "Talk to Ilyas",
  },
};

export const RELAY_INTERACTABLE: InteractableSpec = {
  id: "relay",
  kind: "relay",
  position: [0, 0],
  radius: 3.4,
  label: "Memory Relay",
  prompt: "Attune the memory relay",
};

export const LOCK_INTERACTABLE: InteractableSpec = {
  id: "lock",
  kind: "lock",
  position: [-15, 2.5],
  radius: 2.4,
  label: "Canal lock",
  prompt: "Decide the grid's allegiance",
};

export const VAULT_INTERACTABLE: InteractableSpec = {
  id: "vault",
  kind: "vault",
  position: [14, 9],
  radius: 2.6,
  label: "Archive vault",
  prompt: "Decide who holds memory",
};

export const OVERLOOK_INTERACTABLE: InteractableSpec = {
  id: "overlook",
  kind: "overlook",
  position: [0, 15.5],
  radius: 3.0,
  label: "Overlook",
  prompt: "Let the city speak",
};

/* --------------------------- Objectives ---------------------------- */

export const OBJECTIVES = {
  meetResidents: "Meet the three residents and gather their signal fragments",
  attuneRelay: "Attune the memory relay at the plaza",
  decideRetain: "The relay asks what the city should keep",
  decideServe: "Go to the canal lock on the west dock",
  decideControl: "Go to the archive vault in the northeast",
  toOverlook: "Climb to the overlook and let the city speak",
  wander: "Walk the city you made",
};

export const INTRO_LINES: string[] = [
  "Veli, the Ninth Canal District — a quarter suspended between an erased past and a managed present.",
  "Seven years ago the surge-flood came. The old quarter drowned in a night, and Arjun Varma, the signal keeper, vanished with it. The record calls him a defector.",
  "You are a cartographer of lost places, and the relay at the district's heart has started transmitting again. Three residents keep its fragments. Three different memories of the same man.",
  "Find them. Align what they remember. Then decide what a city is allowed to forget.",
];
