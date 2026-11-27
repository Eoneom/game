import { OutpostType, ReportSpyMetadata, ReportSpyTarget } from '@eoneom/api-client'

import { formatCoordinates } from '#helpers/transform'
import { FactionTranslations } from '#faction/translations'

const SpyTargetKindLabels: Record<NonNullable<ReportSpyTarget['kind']>, string> = {
  city: 'Ville',
  outpost: 'Avant-poste',
  field: 'Troupes en campagne',
}

export const OutpostTypeLabels: Record<OutpostType, string> = {
  [OutpostType.TEMPORARY]: 'Temporaire',
  [OutpostType.PERMANENT]: 'Permanent',
}

/** "Ville Bastion (4.4) — Cible, Liturgie des cendres"; a vanished target only shows its coordinates. */
export const formatSpyTarget = (target: ReportSpyTarget): string => {
  const coordinates = `(${formatCoordinates(target.coordinates)})`
  if (!target.kind) {
    return `Case ${coordinates}`
  }
  const place = target.name
    ? `${SpyTargetKindLabels[target.kind]} ${target.name} ${coordinates}`
    : `${SpyTargetKindLabels[target.kind]} ${coordinates}`
  if (!target.owner_name) {
    return place
  }
  const faction = target.faction_code ? `, ${FactionTranslations[target.faction_code].name}` : ''
  return `${place} — ${target.owner_name}${faction}`
}

export const spyOutcomeLabel = (spy: Pick<ReportSpyMetadata, 'success' | 'aborted' | 'tier'>): string => {
  if (spy.aborted) return 'Mission annulée : plus de cible ennemie, les éclaireurs rentrent'
  if (!spy.success) return 'Échec : les éclaireurs ont été repérés et détruits'
  return `Succès — rapport de niveau ${spy.tier}`
}

/** "Jet 0.42 / chance 65 %"; null when no roll was made. */
export const formatSpyRoll = (spy: Pick<ReportSpyMetadata, 'roll' | 'p_success'>): string | null => {
  if (spy.roll === null || spy.p_success === null) return null
  return `Jet ${spy.roll.toFixed(2)} / chance ${Math.round(spy.p_success * 100)} %`
}
