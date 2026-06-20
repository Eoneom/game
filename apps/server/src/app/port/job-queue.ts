export type PendingBuildingUpgrade = {
  player_id: string
  city_id: string
  building_id: string
  level: number
  execute_at: number
  job_id: string
}

export type PendingTechnologyResearch = {
  player_id: string
  city_id: string
  technology_id: string
  level: number
  execute_at: number
  job_id: string
}

export type TroopRecruitProgressJobData = {
  player_id: string
  city_id: string
  troop_id: string
  remaining_count: number
  finish_at: number
  started_at: number
  last_progress: number
}

export type PendingTroopRecruitProgress = TroopRecruitProgressJobData & {
  execute_at: number
  job_id: string
}

export type PendingTroopMovementFinish = {
  player_id: string
  movement_id: string
  execute_at: number
  job_id: string
}

export type PendingCityResourcesGather = {
  execute_at: number
  job_id: string
}

export type PendingOutpostResourcesGather = {
  execute_at: number
  job_id: string
}

export type PendingReportCleanup = {
  execute_at: number
  job_id: string
}

export type SystemPlayerTickJobData = {
  tick_index: number
}

export type PendingSystemPlayerTick = SystemPlayerTickJobData & {
  execute_at: number
  job_id: string
}

export interface JobQueue {
  start(): Promise<void>
  stop(): Promise<void>

  scheduleBuildingUpgradeFinish(args: {
    player_id: string
    city_id: string
    building_id: string
    level: number
    execute_at: number
  }): Promise<string | null>

  cancelBuildingUpgradeFinish(args: { city_id: string }): Promise<void>

  getPendingBuildingUpgrade(args: { city_id: string }): Promise<PendingBuildingUpgrade | null>

  scheduleTechnologyResearchFinish(args: {
    player_id: string
    city_id: string
    technology_id: string
    level: number
    execute_at: number
  }): Promise<string | null>

  cancelTechnologyResearchFinish(args: { player_id: string }): Promise<void>

  getPendingTechnologyResearch(args: { player_id: string }): Promise<PendingTechnologyResearch | null>

  scheduleTroopRecruitProgress(args: TroopRecruitProgressJobData & {
    execute_at: number
  }): Promise<string | null>

  cancelTroopRecruitProgress(args: { city_id: string }): Promise<void>

  getPendingTroopRecruitProgress(args: { city_id: string }): Promise<PendingTroopRecruitProgress | null>

  scheduleTroopMovementFinish(args: {
    player_id: string
    movement_id: string
    execute_at: number
  }): Promise<string | null>

  cancelTroopMovementFinish(args: { movement_id: string }): Promise<void>

  getPendingTroopMovementFinish(args: { movement_id: string }): Promise<PendingTroopMovementFinish | null>

  scheduleCityResourcesGather(args: {
    execute_at: number
  }): Promise<string | null>

  getPendingCityResourcesGather(): Promise<PendingCityResourcesGather | null>

  ensureCityResourcesGatherScheduled(args: {
    execute_at: number
  }): Promise<string | null>

  scheduleOutpostResourcesGather(args: {
    execute_at: number
  }): Promise<string | null>

  getPendingOutpostResourcesGather(): Promise<PendingOutpostResourcesGather | null>

  ensureOutpostResourcesGatherScheduled(args: {
    execute_at: number
  }): Promise<string | null>

  scheduleReportCleanup(args: {
    execute_at: number
  }): Promise<string | null>

  getPendingReportCleanup(): Promise<PendingReportCleanup | null>

  ensureReportCleanupScheduled(args: {
    execute_at: number
  }): Promise<string | null>

  scheduleSystemPlayerTick(args: {
    execute_at: number
    tick_index: number
  }): Promise<string | null>

  getPendingSystemPlayerTick(): Promise<PendingSystemPlayerTick | null>

  ensureSystemPlayerTickScheduled(args: {
    execute_at: number
    tick_index: number
  }): Promise<string | null>
}
