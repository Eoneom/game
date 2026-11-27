import { GenericResponse } from '../../../response'
import { CommunicationMailItem } from './shared'

export type CommunicationMailBox = 'inbox' | 'sent'

export interface CommunicationListMailRequest {
  box?: CommunicationMailBox
  page?: number
}

export interface CommunicationListMailDataResponse {
  mails: CommunicationMailItem[]
  total: number
  page_size: number
}

export type CommunicationListMailResponse = GenericResponse<CommunicationListMailDataResponse>
