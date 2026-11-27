import { TroopCode } from '@eoneom/api-client'

/**
 * La Symbiose (slice 036) has no dedicated artwork yet: reuse a related existing picture until
 * `/troops/<code>.png` lands (follow-up tracked in specs/036-faction-symbiosis/spec.md).
 */
const placeholder_image_code: Partial<Record<TroopCode, TroopCode>> = {
  [TroopCode.DRIFTING_SPORE]: TroopCode.EXPLORER,
  [TroopCode.SEED_BEARER]: TroopCode.SETTLER,
  [TroopCode.MYCELIAL_PORTER]: TroopCode.LIGHT_TRANSPORTER,
  [TroopCode.SYMBIONT_GROWER]: TroopCode.SPORE_ACOLYTE,
  [TroopCode.DECOMPOSER]: TroopCode.RECYCLER,
  [TroopCode.ROOT_WARDEN]: TroopCode.LEGIONNAIRE,
  [TroopCode.SPORE_SWARM]: TroopCode.INTERCEPTOR,
  [TroopCode.FUNGAL_COLOSSUS]: TroopCode.ASSAULT_BEHEMOTH,
  [TroopCode.TOXIC_HOWLER]: TroopCode.SHOCK_TROOPER,
}

export const troopImageSrc = (code: TroopCode): string => {
  return `/troops/${placeholder_image_code[code] ?? code}.png`
}
