import { EventEmitter } from 'events'
import { AppEvent } from '#core/events'
import { AppLogger } from '#app/port/logger'

export type CityResourcesGatheredPayload = {
  city_id: string
  player_id: string
}

export type BuildingUpgradeFinishedPayload = {
  city_id: string
  player_id: string
}

export type TechnologyResearchFinishedPayload = {
  player_id: string
}

export type TroopMovementFinishedPayload = {
  player_id: string
}

export type TroopRecruitmentUpdatedPayload = {
  city_id: string
  player_id: string
}

export type OutpostCreatedPayload = {
  player_id: string
}

export type OutpostDeletedPayload = {
  player_id: string
  outpost_id: string
}

export type AppEventMap = {
  [AppEvent.CityResourcesGathered]: CityResourcesGatheredPayload
  [AppEvent.BuildingUpgradeFinished]: BuildingUpgradeFinishedPayload
  [AppEvent.TechnologyResearchFinished]: TechnologyResearchFinishedPayload
  [AppEvent.TroopMovementFinished]: TroopMovementFinishedPayload
  [AppEvent.TroopRecruitmentUpdated]: TroopRecruitmentUpdatedPayload
  [AppEvent.OutpostCreated]: OutpostCreatedPayload
  [AppEvent.OutpostDeleted]: OutpostDeletedPayload
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
