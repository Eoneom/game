import { GenericResponse } from '../../response'

export interface BuildingCancelQueuedRequest {
  city_id: string
  queue_item_id: string
}

export type BuildingCancelQueuedResponse = GenericResponse<undefined>
