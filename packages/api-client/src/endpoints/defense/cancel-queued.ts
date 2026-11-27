import { GenericResponse } from '../../response'

export interface DefenseCancelQueuedRequest {
  city_id: string
  queue_item_id: string
}

export type DefenseCancelQueuedResponse = GenericResponse<undefined>
