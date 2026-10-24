# AI usage record

Use Codex during the hackathon and briefly document its actual contribution here. Add a row after each meaningful task or milestone. Keep summaries concise and omit secrets, private data, and full chat transcripts.

## Event build log

| Date and time with timezone | Tool / model, if known | Task | Assistance and affected files | Human review / corrections | Validation and result |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24T16:45:00+00:00 | Devin (Cognition AI) | Implemented the complete ECHO vertical slice: game design, all source code, tests, and docs | Designed narrative/mechanics; wrote `app/`, `lib/game/` (story, puzzle, save, store, city), `components/scene/*`, `components/ui/*`, `components/story/*`, `tests/game.test.ts`, `DESIGN.md`, `README.md` | Pending human review | `typecheck`, `eslint`, `vitest` (28 tests), `next build` all pass; browser playthrough logged below |
| 2026-10-24T17:30:00+00:00 | Devin (Cognition AI) | Browser playtest + fixes | Played through the build in a real browser (movement, camera, interactions, puzzle, decisions, endings, save/resume, story mode); fixed defects found | Pending human review | See CHANGELOG entry for the playtest pass |

## Template preparation

On 10 October 2026, Codex prepared this documentation template from the organizer's supplied rules and checked the linked Luma page for the event name and dates. This covered `README.md`, `RULES.md`, `AGENTS.md`, `CHANGELOG.md`, `AI_USAGE.md`, `SUBMISSION.md`, `.gitignore`, and the pull request checklist. Agent validation covered local links, event consistency, required documents, and diff whitespace; organizer review is pending.

This preparation is separate from participant project implementation and participant AI usage during the event.
