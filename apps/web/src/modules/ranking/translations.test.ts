import { RankingCategory } from '@eoneom/api-client'
import { describe, expect, it } from 'vitest'

import { RankingCategoryLabels, formatComputedAt, formatRankChange } from './translations'

describe('ranking translations', () => {
  it('labels the categories in French', () => {
    expect(RankingCategoryLabels[RankingCategory.GLOBAL]).toBe('Général')
    expect(RankingCategoryLabels[RankingCategory.ECONOMY]).toBe('Économie')
    expect(RankingCategoryLabels[RankingCategory.MILITARY]).toBe('Militaire')
  })

  it('shows the 24 h rank change with arrows', () => {
    expect(formatRankChange(3)).toBe('▲3')
    expect(formatRankChange(-2)).toBe('▼2')
    expect(formatRankChange(0)).toBe('=')
    expect(formatRankChange(null)).toBe('')
  })

  it('formats the snapshot time as HH:MM', () => {
    const at = new Date(2026, 10, 27, 9, 5).getTime()
    expect(formatComputedAt(at)).toBe('Mis à jour à 09:05')
  })
})
