# Contract — Communication reports (`battle`)

**Slice**: 024 | **Status**: Planned  
**Aligns with**: [`012-communication-reports`](../012-communication-reports/spec.md)

## Report type

| Enum | Wire |
| --- | --- |
| `ReportType.BATTLE` | `battle` |

French list label (web): `Bataille` in `apps/web/src/modules/communication/report/translations.ts`.

## HTTP (unchanged routes)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/communication/report` | List includes `type: battle` rows |
| `GET` | `/communication/report/:report_id` | Optional nested `battle` metadata |
| `GET` | `/communication/report/unread/count` | Includes unread battle reports |
| `POST` | `/communication/report/:report_id/mark` | unchanged |
| `POST` | `/communication/report/mark-all` | unchanged |

## `GET /communication/report/:report_id` — response extension

```typescript
interface CommunicationGetReportDataResponse {
  id: string
  type: ReportType // 'battle' when combat report
  recorded_at: number
  origin: Coordinates
  destination: Coordinates
  was_read: boolean
  troops: { code: TroopCode; count: number }[] // this player's casualties (losses)
  resources: Resource // loot gained (attacker report only; zeros otherwise)
  remaining_resources: Resource
  battle?: ReportBattleMetadata // present when type === 'battle'
}
```

### `ReportBattleMetadata`

See [`data-model.md`](../data-model.md) for full field list. Highlights:

- `winner`: `attacker` | `defender` | `draw`
- `round_summaries[]`: required; one entry per round actually played
- `outcome.attacker_retreated`: true on defender win or draw stalemate with surviving attackers
- `perspective`: `attacker` | `defender` — same battle, two report rows

### List item DTO

`CommunicationListReportDataResponse` items remain flat for inbox list (type + origin → destination). **Optional**: omit `battle` on list for payload size; detail fetch loads metadata.

## Persistence contract

1. Insert `report` row (type `battle`, player-specific casualties in troop lines).
2. Insert `report_battle` row keyed by `report_id`.
3. Attacker and defender each get independent `was_read`.

## Creation timing

Command `createBattleReports` runs inside `sagaFinishBattle` **after** outcomes applied — not in `sagaFinishAttack` at movement arrival.

## Query layer

`CommunicationGetReportQuery` joins `report_battle` when `type === battle` and maps to api-client DTO in `web/handler/communication/report/get.ts`.

## Web UI expectations

`apps/web/src/modules/communication/report/details.tsx`:

- Branch `type === 'battle'`
- Render strategies, winner, round table from `round_summaries`, outcome flags, faction labels from `apps/web/src/modules/faction/translations.ts`
- Troop names via `TroopTranslations` for all codes (including singularity combat art)
