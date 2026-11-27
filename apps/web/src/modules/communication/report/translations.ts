import { DefenseCode, ReportBattleMetadata, ReportType } from '@eoneom/api-client'
import { DefenseTranslations } from '#defense/translations'

export const ReportTypeLabels: Record<ReportType, string> = {
  [ReportType.EXPLORATION]: 'Exploration',
  [ReportType.BASE]: 'Base',
  [ReportType.REBASE]: 'Rebase',
  [ReportType.TRANSPORT]: 'Transport',
  [ReportType.BATTLE]: 'Bataille',
  [ReportType.SPY]: 'Espionnage',
  [ReportType.SPY_DETECTED]: 'Espion repéré',
  [ReportType.REINFORCEMENT]: 'Renforts alliés',
  [ReportType.TRADE]: 'Bourse',
}

export type BattleResultKind = 'victory' | 'defeat' | 'draw'

/** A `reinforcement` perspective fought on the defender side (slice 033). */
export const battleResultKind = ({
  perspective,
  winner,
}: {
  perspective: 'attacker' | 'defender' | 'reinforcement'
  winner: 'attacker' | 'defender' | 'draw'
}): BattleResultKind => {
  if (winner === 'draw') return 'draw'
  const side = perspective === 'reinforcement' ? 'defender' : perspective
  return winner === side ? 'victory' : 'defeat'
}

const BattleResultLabels: Record<BattleResultKind, string> = {
  victory: 'Victoire',
  defeat: 'Défaite',
  draw: 'Égalité',
}

export const battleResultLabel = (args: Parameters<typeof battleResultKind>[0]): string =>
  BattleResultLabels[battleResultKind(args)]

type CombatModifiers = {
  attack: number
  life: number
  fortification?: number
}

const formatModifierPercent = (multiplier: number): string => {
  const percent = Math.round((multiplier - 1) * 100)
  return `${percent > 0 ? '+' : ''}${percent} %`
}

type LossLine = ReportBattleMetadata['casualties_defender'][number]

/** City defense loss lines (slice 029): lines without `kind` are troops. */
export const defenseLosses = (lines: LossLine[]): { code: DefenseCode, count: number }[] =>
  lines.flatMap(line => (line.kind === 'defense' ? [ { code: line.code, count: line.count } ] : []))

/** Shield share of the attacker's attack pool, e.g. "-12 %"; null when no shield absorbed anything. */
export const formatShieldReduction = (reduction?: number): string | null =>
  reduction && reduction > 0 ? `-${Math.round(reduction * 100)} %` : null

/** Defender report lines for defenses that grew back (slice 036), e.g. "Mur de mycélium : +3 repoussés". */
export const regrowthLines = (regrown?: { code: DefenseCode, count: number }[]): string[] =>
  (regrown ?? [])
    .filter(line => line.count > 0)
    .map(line => `${DefenseTranslations[line.code].name} : +${line.count} repoussé${line.count > 1 ? 's' : ''}`)

/** Arsenal technology bonus for one side, e.g. "+9 % attaque, +6 % vie"; null when neutral. */
export const formatCombatModifiers = (modifiers?: CombatModifiers): string | null => {
  if (!modifiers) return null
  const parts = [
    modifiers.attack !== 1 ? `${formatModifierPercent(modifiers.attack)} attaque` : null,
    modifiers.life !== 1 ? `${formatModifierPercent(modifiers.life)} vie` : null,
    modifiers.fortification !== undefined && modifiers.fortification !== 1
      ? `${formatModifierPercent(modifiers.fortification)} fortification`
      : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : null
}
