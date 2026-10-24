# ECHO: The City That Remembers

A single-player 3D architectural puzzle-mystery for **Devin Hacks Kochi — Track 4, MAKE ROOM FOR PLAY**. Explore a floating pale-stone canal district inspired by Kochi, rotate relay joints so a visible signal beam energizes the causeways you walk on, reach three memory platforms, hear what three residents remember of the night the signal keeper vanished, and make three decisions that visibly reshape the city — leading to one of three endings.

## Repository provenance

This repository began as a documentation template; [RULES.md](RULES.md) and [AGENTS.md](AGENTS.md) still carry historical material from an older event's scaffold — those dates and logistics are template provenance, **not** Devin Hack Kochi's, whose organizer instructions are authoritative. The game itself is implemented here from scratch.

## The game

- **Setting:** Veli, the Ninth Canal District — a quarter suspended between an erased past and a managed present.
- **Mystery:** Seven years ago the surge-flood drowned the old quarter and the signal keeper Arjun Varma vanished. Three residents remember him differently.
- **Play:** ~8–12 minutes. Three escalating signal stages: stand at a relay joint and press E to turn it, watch the teal beam route through causeways, and cross the energized tiles to each memory platform — Mirai (garden), Devi (dock), Ilyas (archive). After each stage a resident's memory unlocks a decision — what the city keeps, whom the grid serves, who holds memory — each of which transforms the district in front of you. States are reversible, resets are intentional, and there are no softlocks.
- **Endings:** three reachable endings governed by an explicit rule (see [DESIGN.md](DESIGN.md)): all-open → *The City Remembers*; all-sealed → *The Quiet City*; mixed → *The Watcher*.
- **Saves:** versioned `localStorage` save written at each milestone; corrupt or outdated saves are rejected safely, and blocked storage is reported.

## Run it

Prerequisites: Node.js 20+ (developed on Node 24) and npm.

```bash
npm install
npm run dev        # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

Checks:

```bash
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
npm test           # vitest — signal propagation, energized floors, decisions, endings, saves, flow
npm run build      # production build
```

## Controls

| Input | Action |
| --- | --- |
| WASD / arrow keys | Move (diagonals normalized) |
| Mouse drag / wheel | Orbit camera / zoom |
| E or Enter | Interact (talk, attune, decide) |
| Escape | Pause / close overlays |
| HUD ↯ | Reduced-motion toggle |
| HUD Aa / title 3D | Switch between 3D and Guided Story Mode |

**Guided Story Mode** is a fully playable text-and-buttons version of the same game — same puzzle, decisions and endings — for touch devices, keyboard-only play, or machines without WebGL. It's on the title screen and auto-engages if 3D fails.

## Project structure

- `app/` — Next.js App Router shell
- `lib/game/` — pure game logic: signal routing (`signal.ts`), story content, endings rule, save schema v2, city floor/colliders, zustand store (unit-tested, no React)
- `components/scene/` — React Three Fiber scene: platforms + energized tiles, relay spire, beam/joints, NPCs, player rig, decision-driven transformations
- `components/ui/` — DOM overlays: title, HUD, dialogue, puzzle, decisions, ending, pause
- `components/story/` — guided story mode
- `tests/` — vitest suite
- [DESIGN.md](DESIGN.md) — design and implementation notes

## Technology and assets

- Next.js 15, React 19, TypeScript
- React Three Fiber 9 + drei 10 + three.js — all visuals are procedural geometry; no external models, textures, fonts, or sounds are downloaded
- zustand — game state
- vitest — unit tests
- No backend, accounts, APIs, or multiplayer

## Status

- Working: full game loop — 3 signal stages with rotatable joints and energized causeways, 3 NPCs, 3 decisions with live city transformations, 3 endings with recap, local save/resume (v2, incl. joint state), guided story mode, pause, reduced motion.
- Known limitations: no audio (by design — all clues are written); camera orbit is drag-based rather than pointer-lock; story-mode navigation is abstracted to locations.
