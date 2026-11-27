import { GenericResponse } from '../../../response'

export interface CommunicationDeleteMailRequest {
  mail_id: string
}

export type CommunicationDeleteMailResponse = GenericResponse<void>
