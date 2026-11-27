import { GenericResponse } from '../../response'

export interface TroopCancelQueuedRequest {
  city_id: string
  queue_item_id: string
}

export type TroopCancelQueuedResponse = GenericResponse<undefined>
