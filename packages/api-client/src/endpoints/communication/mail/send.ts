import { GenericResponse } from '../../../response'

export interface CommunicationSendMailRequest {
  recipient_name: string
  subject: string
  body: string
  in_reply_to?: string
}

export interface CommunicationSendMailDataResponse {
  mail_id: string
}

export type CommunicationSendMailResponse = GenericResponse<CommunicationSendMailDataResponse>
