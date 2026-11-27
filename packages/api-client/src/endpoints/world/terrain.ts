import { GenericResponse } from '../../response'

/** `GET /world/terrain` (slice 044): static terrain of the whole world, downloaded once. */
export interface WorldTerrainDataResponse {
  /** `WORLD_SIZE`, 100. */
  size: number
  /** size × size chars, row-major from (1,1): index = (y − 1) × size + (x − 1). 'f' forest, 'r' ruins, 'l' lake. */
  terrain: string
}

export type WorldTerrainResponse = GenericResponse<WorldTerrainDataResponse>
