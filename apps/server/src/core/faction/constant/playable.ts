import { FactionCode } from './code'

export const non_playable_faction_codes = new Set<FactionCode>([ FactionCode.THE_TECHNOLOGICAL_SINGULARITY ])

export const playableFactionCodes = (): FactionCode[] => {
  return Object.values(FactionCode).filter(code => !non_playable_faction_codes.has(code))
}
