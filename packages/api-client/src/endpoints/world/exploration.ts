import { GenericResponse } from '../../response'

/** `GET /world/exploration` (slice 044): the viewer's explored cells with their coefficients. */
export interface WorldExplorationDataResponse {
  /** One tuple per explored cell: [x, y, plastic, mushroom, solar], coefficients rounded to 2 decimals. */
  cells: [number, number, number, number, number][]
}

export type WorldExplorationResponse = GenericResponse<WorldExplorationDataResponse>
