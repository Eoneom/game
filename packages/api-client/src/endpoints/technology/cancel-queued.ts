import { GenericResponse } from '../../response'

export interface TechnologyCancelQueuedRequest {
  queue_item_id: string
}

export type TechnologyCancelQueuedResponse = GenericResponse<undefined>
