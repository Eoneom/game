# Slice 031 — Empire overview (DRAFT)

**Status**: **Draft — not ready for implementation.**

> ⚠️ This document is an early draft. Many decisions are still open, and the
> slice was paused during the brainstorm. It **must be refined** (open questions
> below answered, scope fixed, API and UI specified) before any planning or
> implementation. Do not create `plan.md` / `tasks.md` from this version.

## Intent

A single page that shows the player's whole empire at a glance: every city and outpost, what each produces and stores, what is in progress, and what is threatening it. It replaces jumping between locations to check on them one by one.

Planning context: [`docs/brainstorm.md`](../../docs/brainstorm.md).

**Likely depends on**: [`006`](../006-city-lifecycle-gathering/spec.md), [`011`](../011-outposts/spec.md), [`013`](../013-location-activity/spec.md) (per-location activity, probably reusable), [`019`](../019-web-shell-routing/spec.md), [`028`](../028-command-center-shelter/spec.md) (movement cap), [`030`](../030-intelligence/spec.md) (incoming attacks), and possibly [`029`](../029-city-defenses/spec.md) (defenses).

## Tentative decisions (from the brainstorm, may still change)

| Topic | Leaning |
| --- | --- |
| Placement | **Home page**, replacing the current "Bienvenue" page, plus a link at the top of the "Emplacements" panel. |
| Layout | **Sortable tables**: one for cities, one for outposts, one row per location. |
| Summary at the top | **Total production** (plastic, mushroom, plasma per minute), **movements used / limit** (028), **incoming attacks** (030, subject to Détection). |
| Interaction | Clicking a row opens the location. **Quick actions are wanted, but none is chosen yet.** |

## Open questions

### Quick actions

- Which actions, if any? Candidates mentioned so far, none validated:
  - send a transport from an outpost to the nearest city ("rapatrier");
  - one button to bring back resources from every outpost above a fill threshold;
  - queue a building upgrade from a city row;
  - start or queue a recruitment from a city row.
- For transports: which carriers, how much, which destination, how to handle the movement cap?
- Should actions confirm before running?

### Content per row

- City columns: stocks vs capacity, production per minute, energy balance, building queue, recruitment queue, fortification queue, garrison size, defense points, movements? Which ones are essential, which are noise?
- Outpost columns: type (temporary / permanent), stock vs capacity, fill time, production, troops?
- Research is player-wide: show it in the summary or not at all? (It was **not** selected for the summary.)
- How to show "needs attention" (full warehouse, empty queue, incoming attack): highlight, filter, sort?

### Data and performance

- One aggregated endpoint (e.g. `GET /player/empire`) or reuse of existing per-location endpoints?
- Up to 5 cities and 15–40+ outposts: acceptable cost per request? Batching strategy?
- Real-time refresh: which WebSocket events invalidate the page, and how to throttle refetches (gather events arrive every 5 s per location)?

### Scope boundaries

- Does it replace or complement the "Emplacements" side panel and the activity strip?
- Mobile / narrow screens: needed now?
- Anything for alliance members' locations (033)? Probably not.

## Next step

Resume the brainstorm on this slice. Answer the open questions, then rewrite this file as a full spec: decisions, API, UI, testing, evidence index. Change the status to **Planned** only then.
