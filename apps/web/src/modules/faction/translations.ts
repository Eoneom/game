import { FactionCode } from '@eoneom/api-client'

interface FactionTranslation {
  name: string
}

export const FactionTranslations: Record<FactionCode, FactionTranslation> = {
  [FactionCode.THE_CONFEDERATION]: {
    name: 'La confédération'
  }
}
