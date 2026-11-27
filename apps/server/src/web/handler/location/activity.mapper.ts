import { LocationActivityDataResponse } from '@eoneom/api-client'
import { LocationActivityQueryResponse } from '#query/location/activity'

export const locationActivityResponseMapper = (result: LocationActivityQueryResponse): LocationActivityDataResponse => ({
  building: result.building,
  building_queue_depth: result.building_queue_depth,
  research: result.research,
  research_queue_depth: result.research_queue_depth,
  recruitment: result.recruitment,
  recruitment_queue_depth: result.recruitment_queue_depth,
  fortification: result.fortification,
  fortification_queue_depth: result.fortification_queue_depth,
  fortification_available: result.fortification_available,
  movements: result.movements,
})
