import { GenericResponse } from '../../response'

export interface DefenseCancelRequest {
  city_id: string
}

export type DefenseCancelResponse = GenericResponse<undefined>
