import { GenericResponse } from '../../../response'

export interface CommunicationMarkMailRequest {
  mail_id: string
  was_read: boolean
}

export type CommunicationMarkMailResponse = GenericResponse<void>
