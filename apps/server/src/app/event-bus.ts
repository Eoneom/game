import { EventEmitter } from 'events'
import { AppEvent } from '#core/events'
import type { BuildingCode } from '#core/building/constant/code'
import type { TechnologyCode } from '#core/technology/constant/code'
import type { TroopCode } from '#core/troop/constant/code'
import type { DefenseCode } from '#core/defense/constant/code'
import type { SystemTickCategory } from '#core/player/system/tick-category'
import type { SystemPlayerTickAttempt } from '#core/system-player/observability/attempt'
import type { BattleWinner } from '#core/combat/value/battle-winner'
import type { ReportPerspective } from '#core/combat/value/report-perspective'
import type { ChatChannel } from '#core/communication/chat/channel'
import type { FactionCode } from '#core/faction/constant/code'
import { AppLogger } from '#app/port/logger'

export type CityResourcesGatheredPayload = {
  city_id: string
  player_id: string
}

export type BuildingUpgradeFinishedPayload = {
  city_id: string
  player_id: string
}

export type BuildingQueueItemDroppedPayload = {
  player_id: string
  city_id: string
  building_code: BuildingCode
  error_code: string
}

export type TechnologyResearchFinishedPayload = {
  player_id: string
}

export type TechnologyQueueItemDroppedPayload = {
  player_id: string
  city_id: string
  technology_code: TechnologyCode
  error_code: string
}

export type TroopMovementFinishedPayload = {
  player_id: string
}

export type BattleFinishedPayload = {
  player_id: string
  report_id: string
  perspective: ReportPerspective
  winner: BattleWinner
}

/** Sent to the defender when an attack is launched at them and their `detection` ≥ 1 (slice 030). */
type MovementIncomingPayload = {
  player_id: string
  movement_id: string
  arrive_at: number
}

/** Sent to the recipient when a letter is delivered (slice 032). */
type MailReceivedPayload = {
  player_id: string
  mail_id: string
}

export type ChatMessageView = {
  id: string
  author: {
    id: string
    name: string
    faction_code: FactionCode
    /** Author's alliance tag, shown as `[TAG] Name` (slice 033). */
    alliance_tag: string | null
  }
  body: string
  created_at: number
}

/**
 * Fanned out to every connected player allowed in the channel (slice 032):
 * everyone for `global`, members of `faction_code` for `faction`, the `member_ids` of the alliance
 * for `alliance` (slice 033), minus `excluded_player_ids` (players who blocked the author).
 */
type ChatMessagePayload = {
  channel: ChatChannel
  faction_code: FactionCode | null
  /** Alliance channel only: current members; `null` for the other channels. */
  member_ids: string[] | null
  excluded_player_ids: string[]
  message: ChatMessageView
}

/** Membership, role or description change: sent to every current member (slice 033). */
type AllianceUpdatedPayload = {
  player_ids: string[]
  alliance_id: string
}

type AllianceInvitationReceivedPayload = {
  player_id: string
  invitation_id: string
  alliance_id: string
}

/** Sent to the chef and officers. */
type AllianceApplicationReceivedPayload = {
  player_ids: string[]
  application_id: string
  alliance_id: string
}

type AllianceJoinedPayload = {
  player_id: string
  alliance_id: string
}

export type AllianceLeftReason = 'leave' | 'kick' | 'dissolve'

type AllianceLeftPayload = {
  player_id: string
  alliance_id: string
  reason: AllianceLeftReason
}

/** Sent to the host when allied troops are stationed in one of their cities. */
type ReinforcementArrivedPayload = {
  player_id: string
  city_id: string
  owner_player_id: string
  report_id: string
}

/** Sent to the host when stationed troops leave (owner recall or automatic return). */
type ReinforcementRecalledPayload = {
  player_id: string
  city_id: string
  owner_player_id: string
  movement_id: string
}

export type TroopRecruitmentUpdatedPayload = {
  city_id: string
  player_id: string
}

type TroopQueueItemDroppedPayload = {
  player_id: string
  city_id: string
  troop_code: TroopCode
  error_code: string
}

type DefenseBuildUpdatedPayload = {
  city_id: string
  player_id: string
}

type DefenseQueueItemDroppedPayload = {
  player_id: string
  city_id: string
  defense_code: DefenseCode
  error_code: string
}

export type OutpostCreatedPayload = {
  player_id: string
}

export type OutpostDeletedPayload = {
  player_id: string
  outpost_id: string
}

export type OutpostResourcesGatheredPayload = {
  outpost_id: string
  player_id: string
}

export type SystemPlayerTickObservabilityOutcome = 'success' | 'partial' | 'idle' | 'error'

export type SystemPlayerTickCommittedActionPayload = {
  category: SystemTickCategory
  payload: Record<string, unknown>
}

export type SystemPlayerActionCommittedPayload = {
  committed_at: number
  player_id: string
  player_name: string
  tick_index: number
  outcome: SystemPlayerTickObservabilityOutcome
  attempts: SystemPlayerTickAttempt[]
  summary: string
  committed_actions?: SystemPlayerTickCommittedActionPayload[]
  /** Present only when `outcome` is `error`. */
  payload?: Record<string, unknown>
}

export type SystemPlayerStatsUpdatedPayload = import('@eoneom/api-client/src/endpoints/admin/system-player-stats').AdminSystemPlayerStatsSnapshot

export type AppEventMap = {
  [AppEvent.CityResourcesGathered]: CityResourcesGatheredPayload
  [AppEvent.BuildingUpgradeFinished]: BuildingUpgradeFinishedPayload
  [AppEvent.BuildingQueueItemDropped]: BuildingQueueItemDroppedPayload
  [AppEvent.TechnologyResearchFinished]: TechnologyResearchFinishedPayload
  [AppEvent.TechnologyQueueItemDropped]: TechnologyQueueItemDroppedPayload
  [AppEvent.TroopMovementFinished]: TroopMovementFinishedPayload
  [AppEvent.BattleFinished]: BattleFinishedPayload
  [AppEvent.MovementIncoming]: MovementIncomingPayload
  [AppEvent.MailReceived]: MailReceivedPayload
  [AppEvent.ChatMessage]: ChatMessagePayload
  [AppEvent.AllianceUpdated]: AllianceUpdatedPayload
  [AppEvent.AllianceInvitationReceived]: AllianceInvitationReceivedPayload
  [AppEvent.AllianceApplicationReceived]: AllianceApplicationReceivedPayload
  [AppEvent.AllianceJoined]: AllianceJoinedPayload
  [AppEvent.AllianceLeft]: AllianceLeftPayload
  [AppEvent.ReinforcementArrived]: ReinforcementArrivedPayload
  [AppEvent.ReinforcementRecalled]: ReinforcementRecalledPayload
  [AppEvent.TroopRecruitmentUpdated]: TroopRecruitmentUpdatedPayload
  [AppEvent.TroopQueueItemDropped]: TroopQueueItemDroppedPayload
  [AppEvent.DefenseBuildUpdated]: DefenseBuildUpdatedPayload
  [AppEvent.DefenseQueueItemDropped]: DefenseQueueItemDroppedPayload
  [AppEvent.OutpostCreated]: OutpostCreatedPayload
  [AppEvent.OutpostDeleted]: OutpostDeletedPayload
  [AppEvent.OutpostResourcesGathered]: OutpostResourcesGatheredPayload
  [AppEvent.SystemPlayerActionCommitted]: SystemPlayerActionCommittedPayload
  [AppEvent.SystemPlayerStatsUpdated]: SystemPlayerStatsUpdatedPayload
}

export class AppEventBus extends EventEmitter {
  private logger: AppLogger

  constructor({ logger }: { logger: AppLogger }) {
    super()
    this.logger = logger
  }

  emit<K extends keyof AppEventMap>(event: K, payload: AppEventMap[K]): boolean {
    this.logger.info(event, { payload })
    return super.emit(event, payload)
  }

  on<K extends keyof AppEventMap>(event: K, listener: (payload: AppEventMap[K]) => void): this {
    return super.on(event, listener)
  }

  off<K extends keyof AppEventMap>(event: K, listener: (payload: AppEventMap[K]) => void): this {
    return super.off(event, listener)
  }
}
