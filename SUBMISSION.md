# Project submission

Complete this file during the hackathon and use it to prepare your submission through the method announced by the organizers. Do not submit your project to the template repository.

## Project

- **Project name:** ECHO: The City That Remembers
- **Short description:** A ~10-minute 3D architectural puzzle-mystery in a floating pale-stone canal district. Rotate relay joints to route a visible signal beam across the causeways it energizes, reach three memory platforms, hear three conflicting memories of a disappearance, then make three decisions that visibly reshape the city — leading to one of three endings. Runs in the browser — includes a no-WebGL guided story mode.
- **Code repository URL:** https://github.com/UmarAlMukhtar/echo
- **Current implementation commit SHA:** `d689735ef2af27893f6563f51e8a44a6df566496` (branch `codex/blender-integration`, draft PR #3; unmerged). Owner submission is not confirmed.
- **Working demo URL or local demo steps:** `npm install && npm run dev`, then open http://localhost:3000. Hosted Git previews are listed in [Vercel Deployments](https://vercel.com/umar-al-mukhtar-s-projects/echo/deployments); check their status before sharing.
- **Demo access requirements:** A modern browser. WebGL recommended; a fully playable Guided Story Mode covers no-WebGL, touch, and keyboard-only play. No game accounts, keys, or services needed. Hosted preview access may require the project owner's Vercel sign-in under the existing deployment protection.

## Participants

List participants according to the organizers' current participation format. Remove unused rows.

| Participant name | GitHub handle | Contribution |
| --- | --- | --- |
| Umar | UmarAlMukhtar | Project owner; design direction and review of the Devin-built implementation |

## Run and demonstrate

- **Prerequisites and versions:** Node.js 20+ (built on Node 24), npm 10+
- **Install command:** `npm install`
- **Required environment variable names:** none
- **Start command:** `npm run dev` (dev) or `npm run build && npm start` (production)
- **Demo walkthrough:**
  1. Title → *New game* → read the intro.
  2. Stage 1: cross to the plaza, stand at the glowing joint pedestal, press E to turn it — the beam routes through and a causeway rises. Cross it to the garden platform, meet Mirai, make decision 1.
  3. Stage 2: chain two elbow joints so the beam bends around the gap to the dock platform; meet Devi, make decision 2.
  4. Stage 3: interleave an elbow, a straight joint and a final elbow to reach the archive platform; meet Ilyas, read the reveal, make decision 3.
  5. Return to the south plaza overlook for the ending recap; replay to reach the other two endings.
- **Checks performed and results:** `npm run typecheck` clean; `npm run lint` clean; `npm test` 74/74 pass; `npm run build` succeeds. Browser playthrough results in CHANGELOG.
- **Known limitations or incomplete features:** No audio (all clues written); story-mode navigation is abstracted to named locations; custom collision ramps smooth the visible stair risers; no physical mobile/gamepad checks; camera is a restrained elevated orbit rather than free pointer-lock.
- **Libraries, APIs, and public datasets used:** Next.js, React, three.js, React Three Fiber, drei, zustand, vitest — see package.json; original Blender district and memory keeper from the approved asset branch (provenance in `docs/assets/README.md`); no external datasets.
- **AI usage record:** [AI_USAGE.md](AI_USAGE.md)
- **Development change log:** [CHANGELOG.md](CHANGELOG.md)

## Submission checklist

- [ ] The project follows the organizers' current project-start and eligibility instructions.
- [ ] The participation format follows the organizers' current instructions.
- [ ] Any AI usage record included accurately identifies the tools used; this template requires no particular AI tool or provider.
- [ ] The code repository URL, short description, and working demo are provided.
- [ ] README setup and demo instructions match the submitted code.
- [ ] Actual checks and known limitations are documented.
- [ ] Meaningful changes are documented and committed throughout development.
- [ ] The final implementation is committed and pushed, and its SHA is recorded above.
- [ ] No credentials or private data are included in the repository or demo instructions.
- [ ] The organizers' announced submission method and timing have been followed.

Event: **Devin Hack Kochi**. Follow the organizers' current submission method and deadline. The event has no major AI usage constraints.
