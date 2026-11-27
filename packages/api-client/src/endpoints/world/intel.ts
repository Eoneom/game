import { GenericResponse } from '../../response'

import { WorldTargetIntel } from './targets'

/** `GET /world/intel?x=&y=` (slice 044): latest successful spy summary for one cell. */
export interface WorldIntelDataResponse {
  intel: WorldTargetIntel | null
}

export type WorldIntelResponse = GenericResponse<WorldIntelDataResponse>
