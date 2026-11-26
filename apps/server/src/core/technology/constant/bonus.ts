import { TechnologyCode } from '#core/technology/constant/code'

/**
 * Linear bonus per research level (slice 027): `multiplier = 1 + per_level × level`, no level cap.
 */
export const technology_bonus_per_level = {
  [TechnologyCode.BALLISTIC_ALLOYS]: 0.03,
  [TechnologyCode.ORGANIC_PLATING]: 0.03,
  [TechnologyCode.TACTICAL_PROPULSION]: 0.04,
  [TechnologyCode.ADVANCED_RECYCLING]: 0.05,
  [TechnologyCode.AGRONOMY]: 0.05,
  [TechnologyCode.STORAGE_COMPRESSION]: 0.1,
  [TechnologyCode.PLASMA_CONTAINMENT]: 0.05,
} as const satisfies Partial<Record<TechnologyCode, number>>

export type BonusTechnologyCode = keyof typeof technology_bonus_per_level
