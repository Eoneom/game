import { GenericResponse } from '../../../response'

export interface CommunicationCountUnreadMailDataResponse {
  count: number
}

export type CommunicationCountUnreadMailResponse = GenericResponse<CommunicationCountUnreadMailDataResponse>
