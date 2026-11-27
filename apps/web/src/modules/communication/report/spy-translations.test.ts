import { describe, expect, it } from 'vitest'
import { FactionCode, ReportType } from '@eoneom/api-client'

import { ReportTypeLabels } from '#communication/report/translations'
import { formatSpyRoll, formatSpyTarget, spyOutcomeLabel } from '#communication/report/spy-translations'

describe('spy report labels (slice 030)', () => {
  it('labels both report types', () => {
    expect(ReportTypeLabels[ReportType.SPY]).toBe('Espionnage')
    expect(ReportTypeLabels[ReportType.SPY_DETECTED]).toBe('Espion repéré')
  })

  it('describes the spied target', () => {
    expect(formatSpyTarget({
      kind: 'city',
      id: 'c',
      name: 'Bastion',
      owner_name: 'Cible',
      faction_code: FactionCode.THE_ASH_LITURGY,
      coordinates: { x: 4, y: 4 },
    })).toBe('Ville Bastion (4.4) — Cible, Liturgie des cendres')
    expect(formatSpyTarget({
      kind: null,
      id: null,
      name: null,
      owner_name: null,
      faction_code: null,
      coordinates: { x: 4, y: 4 },
    })).toBe('Case (4.4)')
  })

  it('states the outcome and the roll', () => {
    expect(spyOutcomeLabel({ success: true, aborted: false, tier: 3 })).toBe('Succès — rapport de niveau 3')
    expect(spyOutcomeLabel({ success: false, aborted: false, tier: 0 })).toMatch(/^Échec/)
    expect(spyOutcomeLabel({ success: false, aborted: true, tier: 0 })).toMatch(/^Mission annulée/)
    expect(formatSpyRoll({ roll: 0.4213, p_success: 0.65 })).toBe('Jet 0.42 / chance 65 %')
    expect(formatSpyRoll({ roll: null, p_success: null })).toBeNull()
  })
})
