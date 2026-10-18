import { FactionCode } from '#core/faction/constant/code'

const ALPHA_SYSTEM_PLAYER_NAME = 'Alpha'
const HARROW_SYSTEM_PLAYER_NAME = 'Harrow'

export enum SystemAiProfileId {
  SINGULARITY_DEFAULT = 'singularity_default',
  ASH_LITURGY_AGGRESSIVE = 'ash_liturgy_aggressive',
}

export type SystemAiProfile = {
  id: SystemAiProfileId
  attack_utility_ready: number
  attack_utility_under_threat: number
  ignore_empire_under_threat_for_attack: boolean
  confederation_target_score_bonus: number
  use_failed_attack_memory: boolean
  max_scout_troops: number
  max_founder_troops: number
  make_permanent_utility_multiplier: number
}

const SINGULARITY_DEFAULT_PROFILE: SystemAiProfile = {
  id: SystemAiProfileId.SINGULARITY_DEFAULT,
  attack_utility_ready: 55,
  attack_utility_under_threat: 0,
  ignore_empire_under_threat_for_attack: false,
  confederation_target_score_bonus: 0,
  use_failed_attack_memory: true,
  max_scout_troops: 2,
  max_founder_troops: 1,
  make_permanent_utility_multiplier: 1,
}

const ASH_LITURGY_AGGRESSIVE_PROFILE: SystemAiProfile = {
  id: SystemAiProfileId.ASH_LITURGY_AGGRESSIVE,
  attack_utility_ready: 120,
  attack_utility_under_threat: 110,
  ignore_empire_under_threat_for_attack: true,
  confederation_target_score_bonus: 500,
  use_failed_attack_memory: false,
  max_scout_troops: 4,
  max_founder_troops: 2,
  make_permanent_utility_multiplier: 0.45,
}

const PROFILES: Record<SystemAiProfileId, SystemAiProfile> = {
  [SystemAiProfileId.SINGULARITY_DEFAULT]: SINGULARITY_DEFAULT_PROFILE,
  [SystemAiProfileId.ASH_LITURGY_AGGRESSIVE]: ASH_LITURGY_AGGRESSIVE_PROFILE,
}

const PROFILE_BY_PLAYER_NAME: Record<string, SystemAiProfileId> = {
  [ALPHA_SYSTEM_PLAYER_NAME]: SystemAiProfileId.SINGULARITY_DEFAULT,
  [HARROW_SYSTEM_PLAYER_NAME]: SystemAiProfileId.ASH_LITURGY_AGGRESSIVE,
}

const PROFILE_BY_FACTION: Partial<Record<FactionCode, SystemAiProfileId>> = {
  [FactionCode.THE_TECHNOLOGICAL_SINGULARITY]: SystemAiProfileId.SINGULARITY_DEFAULT,
  [FactionCode.THE_ASH_LITURGY]: SystemAiProfileId.ASH_LITURGY_AGGRESSIVE,
}

export function getSystemAiProfile(profile_id: SystemAiProfileId): SystemAiProfile {
  return PROFILES[profile_id]
}

export function resolveSystemAiProfileId({
  player_name,
  faction_code,
}: {
  player_name: string
  faction_code: FactionCode
}): SystemAiProfileId {
  return PROFILE_BY_PLAYER_NAME[player_name]
    ?? PROFILE_BY_FACTION[faction_code]
    ?? SystemAiProfileId.SINGULARITY_DEFAULT
}

export function resolveSystemAiProfile(args: {
  player_name: string
  faction_code: FactionCode
}): SystemAiProfile {
  return getSystemAiProfile(resolveSystemAiProfileId(args))
}
