import { FactionCode } from '@eoneom/api-client'

/** Accent color per Faction (chat author names, slice 032). */
const FactionColors: Record<FactionCode, string> = {
  [FactionCode.THE_CONFEDERATION]: '#5dade2',
  [FactionCode.THE_TECHNOLOGICAL_SINGULARITY]: '#b388eb',
  [FactionCode.THE_ASH_LITURGY]: '#e67e22',
  [FactionCode.THE_SYMBIOSIS]: '#7dcea0',
  [FactionCode.THE_BASTION_ORDER]: '#b0a27a',
}

export const factionColor = (faction_code: FactionCode): string => FactionColors[faction_code] ?? '#d9c7a1'
