import { FactionCode } from '@eoneom/api-client'

interface FactionTranslation {
  name: string
}

export const FactionTranslations: Record<FactionCode, FactionTranslation> = {
  [FactionCode.THE_CONFEDERATION]: {
    name: 'La confédération'
  },
  [FactionCode.THE_TECHNOLOGICAL_SINGULARITY]: {
    name: 'Singularité technologique'
  },
  [FactionCode.THE_ASH_LITURGY]: {
    name: 'Liturgie des cendres'
  },
}
