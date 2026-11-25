import { ReportType } from '@eoneom/api-client'

export const ReportTypeLabels: Record<ReportType, string> = {
  [ReportType.EXPLORATION]: 'Exploration',
  [ReportType.BASE]: 'Base',
  [ReportType.REBASE]: 'Rebase',
  [ReportType.TRANSPORT]: 'Transport',
  [ReportType.BATTLE]: 'Bataille',
}

export type BattleResultKind = 'victory' | 'defeat' | 'draw'

export const battleResultKind = ({
  perspective,
  winner,
}: {
  perspective: 'attacker' | 'defender'
  winner: 'attacker' | 'defender' | 'draw'
}): BattleResultKind => {
  if (winner === 'draw') return 'draw'
  return winner === perspective ? 'victory' : 'defeat'
}

const BattleResultLabels: Record<BattleResultKind, string> = {
  victory: 'Victoire',
  defeat: 'Défaite',
  draw: 'Égalité',
}

export const battleResultLabel = (args: Parameters<typeof battleResultKind>[0]): string =>
  BattleResultLabels[battleResultKind(args)]
