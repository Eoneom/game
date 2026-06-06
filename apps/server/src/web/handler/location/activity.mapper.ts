import { LocationActivityDataResponse } from '@eoneom/api-client'
import { LocationActivityQueryResponse } from '#query/location/activity'

export const locationActivityResponseMapper = (
  result: LocationActivityQueryResponse
): LocationActivityDataResponse => ({
  building: result.building,
  building_queue_depth: result.building_queue_depth,
  research: result.research,
  recruitment: result.recruitment,
  movements: result.movements,
})
