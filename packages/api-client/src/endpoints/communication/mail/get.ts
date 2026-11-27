import { GenericResponse } from '../../../response'
import { CommunicationMailItem } from './shared'

export interface CommunicationGetMailRequest {
  mail_id: string
}

export interface CommunicationGetMailDataResponse extends CommunicationMailItem {
  body: string
}

export type CommunicationGetMailResponse = GenericResponse<CommunicationGetMailDataResponse>
