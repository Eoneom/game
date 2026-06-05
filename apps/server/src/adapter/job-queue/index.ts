export {
  BUILDING_UPGRADE_FINISH_QUEUE,
  type BuildingUpgradeFinishJobData
} from '#adapter/job-queue/building/finish-upgrade'

export {
  TECHNOLOGY_RESEARCH_FINISH_QUEUE,
  type TechnologyResearchFinishJobData
} from '#adapter/job-queue/technology/finish-research'

export {
  TROOP_RECRUIT_PROGRESS_QUEUE,
  type TroopRecruitProgressJobData
} from '#adapter/job-queue/troop/recruit'

export {
  TROOP_MOVEMENT_FINISH_QUEUE,
  type TroopMovementFinishJobData
} from '#adapter/job-queue/troop/finish-movement'

export {
  CITY_RESOURCES_GATHER_QUEUE,
  CITY_RESOURCES_GATHER_SINGLETON_KEY,
  type CityResourcesGatherJobData
} from '#adapter/job-queue/city/gather'

export {
  OUTPOST_RESOURCES_GATHER_QUEUE,
  OUTPOST_RESOURCES_GATHER_SINGLETON_KEY,
  type OutpostResourcesGatherJobData
} from '#adapter/job-queue/outpost/gather'

export {
  REPORT_CLEANUP_QUEUE,
  REPORT_CLEANUP_SINGLETON_KEY,
  type ReportCleanupJobData
} from '#adapter/job-queue/communication/cleanup-old-read-reports'

export {
  JobQueue,
  createJobQueue
} from '#adapter/job-queue/job-queue'

export type {
  PendingBuildingUpgrade,
  PendingTechnologyResearch,
  PendingTroopRecruitProgress,
  PendingTroopMovementFinish,
  PendingCityResourcesGather,
  PendingOutpostResourcesGather,
  PendingReportCleanup
} from '#app/port/job-queue'
