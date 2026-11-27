import { DefenseCode } from '@server-core/defense/constant/code'
import { GenericResponse } from '../../response'

export interface DefenseBuildRequest {
  city_id: string
  defense_code: DefenseCode
  count: number
}

export type DefenseBuildResponse = GenericResponse<void>
