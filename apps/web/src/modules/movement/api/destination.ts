import { useQuery } from '@tanstack/react-query'
import {
  AllianceMineDataResponse,
  Coordinates,
  FactionCode,
  WorldGetCellsDataResponse,
} from '@eoneom/api-client'

import { client } from '#helpers/api'
import { isError } from '#helpers/assertion'
import { useAuth } from '#auth/context'
import { useMyAlliance } from '#alliance/hooks'
import { FactionTranslations } from '#faction/translations'
import { DestinationKind } from '#movement/send/actions'

/** What the send wizard knows about a destination cell (slice 045). */
export interface DestinationInfo {
  kind: DestinationKind
  /** Settlement on the cell, when there is one. */
  settlement?: {
    name: string | null
    alliance_tag: string | null
    faction_code: FactionCode
  }
}

const at = (coordinates: Coordinates) => (entry: { coordinates: Coordinates }) =>
  entry.coordinates.x === coordinates.x && entry.coordinates.y === coordinates.y

/** Classifies a 1 × 1 `GET /world/cells` answer (pure, unit-tested). */
export const resolveDestinationInfo = ({
  coordinates,
  cells,
  myAlliance,
}: {
  coordinates: Coordinates
  cells: WorldGetCellsDataResponse
  myAlliance: AllianceMineDataResponse | undefined
}): DestinationInfo => {
  const cell = cells.cells.find(at(coordinates))
  if (!cell?.explored) return { kind: 'unexplored' }

  const city = cells.settlements.cities.find(at(coordinates))
  const outpost = cells.settlements.outposts.find(at(coordinates))
  const marker = city ?? outpost
  if (!marker) return { kind: 'empty' }

  const settlement = {
    name: city?.name ?? null,
    alliance_tag: marker.alliance_tag,
    faction_code: marker.faction_code,
  }
  if (marker.player_id === cells.viewer.player_id) {
    return { kind: city ? 'own_city' : 'own_outpost', settlement }
  }
  const allied_member = Boolean(myAlliance?.alliance?.members.some(member =>
    member.player_id === marker.player_id && member.player_id !== myAlliance.viewer_player_id
  ))
  if (city && allied_member) return { kind: 'allied_city', settlement }
  if (marker.faction_code === cells.viewer.faction_code) return { kind: 'friendly', settlement }
  return { kind: city ? 'enemy_city' : 'enemy_outpost', settlement }
}

const tagged = (settlement: DestinationInfo['settlement']): string => [
  settlement?.alliance_tag ? `[${settlement.alliance_tag}]` : null,
  settlement?.name,
].filter(Boolean).join(' ')

/** Cell preview: « Ville ennemie [ABC] Brasier — Liturgie des cendres », « Case inexplorée »… */
export const describeDestination = (info: DestinationInfo): string => {
  const faction = info.settlement ? FactionTranslations[info.settlement.faction_code].name : ''
  const name = tagged(info.settlement)
  switch (info.kind) {
    case 'unexplored':
      return 'Case inexplorée'
    case 'empty':
      return 'Case vide'
    case 'own_city':
      return `Votre ville ${info.settlement?.name ?? ''}`.trim()
    case 'own_outpost':
      return 'Votre avant-poste'
    case 'allied_city':
      return `Ville alliée ${name}`.trim()
    case 'friendly':
      return [ info.settlement?.name ? 'Ville de votre faction' : 'Avant-poste de votre faction', name ].filter(Boolean).join(' ')
    case 'enemy_city':
      return `${[ 'Ville ennemie', name ].filter(Boolean).join(' ')} — ${faction}`
    case 'enemy_outpost':
      return `${[ 'Avant-poste ennemi', name ].filter(Boolean).join(' ')} — ${faction}`
  }
}

export const destinationKeys = {
  info: (coordinates: Coordinates) => [ 'world', 'destination-info', coordinates.x, coordinates.y ] as const,
}

/** One-cell map read, as `useDestinationStance` did, generalised to every destination kind. */
export const useDestinationInfo = (coordinates: Coordinates | null) => {
  const { token } = useAuth()
  const { data: myAlliance, isPending: alliancePending } = useMyAlliance()

  return useQuery({
    queryKey: [ ...destinationKeys.info(coordinates ?? { x: 0, y: 0 }), myAlliance?.alliance?.id ?? null ] as const,
    queryFn: async (): Promise<DestinationInfo> => {
      if (!token || !coordinates) throw new Error('no token')
      const res = await client.world.getCells(token, {
        min_x: coordinates.x,
        max_x: coordinates.x,
        min_y: coordinates.y,
        max_y: coordinates.y,
        detail: 'terrain',
      })
      if (isError(res)) throw new Error(res.error_code)
      if (!res.data) throw new Error('no data')
      return resolveDestinationInfo({ coordinates, cells: res.data, myAlliance })
    },
    enabled: !!token && !!coordinates && !alliancePending,
    retry: false,
  })
}
