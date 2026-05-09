export {
  BUILDING_UPGRADE_FINISH_QUEUE,
  type BuildingUpgradeFinishJobData,
  type PendingBuildingUpgrade
} from '#adapter/job-queue/building/finish-upgrade'

export {
  TECHNOLOGY_RESEARCH_FINISH_QUEUE,
  type TechnologyResearchFinishJobData,
  type PendingTechnologyResearch
} from '#adapter/job-queue/technology/finish-research'

export {
  TROOP_RECRUIT_PROGRESS_QUEUE,
  TROOP_RECRUIT_PROGRESS_MIN_INTERVAL_MS,
  nextTroopRecruitProgressAt,
  type TroopRecruitProgressJobData,
  type PendingTroopRecruitProgress
} from '#adapter/job-queue/troop/recruit'

export {
  TROOP_MOVEMENT_FINISH_QUEUE,
  type TroopMovementFinishJobData,
  type PendingTroopMovementFinish
} from '#adapter/job-queue/troop/finish-movement'

export {
  CITY_RESOURCES_GATHER_QUEUE,
  CITY_RESOURCES_GATHER_INTERVAL_MS,
  CITY_RESOURCES_GATHER_SINGLETON_KEY,
  type CityResourcesGatherJobData,
  type PendingCityResourcesGather
} from '#adapter/job-queue/city/gather'

export {
  OUTPOST_RESOURCES_GATHER_QUEUE,
  OUTPOST_RESOURCES_GATHER_INTERVAL_MS,
  OUTPOST_RESOURCES_GATHER_SINGLETON_KEY,
  type OutpostResourcesGatherJobData,
  type PendingOutpostResourcesGather
} from '#adapter/job-queue/outpost/gather'

export {
  JobQueue,
  createJobQueue
} from '#adapter/job-queue/job-queue'
