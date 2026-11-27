import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Coordinates, MovementAction, TechnologyCode, WorldTarget } from '@eoneom/api-client'

import { useNow } from '#hook/now'
import { useGetCity, useListCities } from '#city/hooks'
import { useGetOutpost, useListOutposts } from '#outpost/hooks'
import { useListIncomingMovements, useListMovements, useListTroops, useMovementCapacity } from '#troop/hooks'
import { useListTechnologies } from '#technology/hooks'
import { MovementSendWizard } from '#movement/send'
import { MovementSendState, parseMovementSendSearch, SendableAction } from '#movement/send/search'
import { MovementOrigin, usePathNavigate } from '#movement/navigation'
import { MapCanvas } from '#map/canvas'
import { MapCellAction, MapCellMenu, mapCellActions } from '#map/cell-menu'
import { MapDrawer } from '#map/drawer'
import { MapDrawerCell } from '#map/drawer/cell'
import { MapDrawerMovement } from '#map/drawer/movement'
import { MapDrawerTargets } from '#map/drawer/targets'
import { hitTest } from '#map/geometry'
import { TerrainChar } from '#map/helper'
import { MapHoverCard, MapHoverTarget } from '#map/hover-card'
import { useMapView } from '#map/hook/world'
import { cellKey, useCellIntel, useMinimapMarkers, useWorldExploration, useWorldMarkers, useWorldTargets, useWorldTerrain } from '#map/hooks'
import { MarkersLayer } from '#map/layers/markers'
import { MovementsLayer } from '#map/layers/movements'
import { OverlayLayer } from '#map/layers/overlay'
import { SelectionLayer } from '#map/layers/selection'
import { TerrainLayer } from '#map/layers/terrain'
import { MapLegend } from '#map/legend'
import { screenMarkers, settlementsAt } from '#map/markers'
import { MapMinimap } from '#map/minimap'
import { arrowOffsets, arrowSegments, toMapArrows } from '#map/movements'
import { combatAttack } from '#map/overlays'
import { MapLayers, MapSearch, parseLayers, serializeLayers } from '#map/search'
import { MapLocationOption, MapToolbar } from '#map/toolbar'
import {
  DEFAULT_ZOOM_LEVEL,
  LABEL_MIN_CELL_PX,
  MapPoint,
  cellAtStagePoint,
  panByKey,
  worldToStage,
} from '#map/viewport'

type DrawerState =
  | { kind: 'cell'; coordinates: Coordinates }
  | { kind: 'movement'; id: string; source: 'own' | 'incoming' }
  | { kind: 'send'; state: MovementSendState }
  | { kind: 'targets' }

/** URL writes wait for the view to settle (pan end, zoom, minimap drag). */
const URL_WRITE_DELAY_MS = 300

const sameCell = (a: Coordinates | null | undefined, b: Coordinates | null | undefined): boolean =>
  Boolean(a && b && a.x === b.x && a.y === b.y)

interface MapPageProps {
  origin: MovementOrigin
  search: MapSearch
  /** Replaces the route search params (no history entry). */
  onSearchChange: (patch: Partial<MapSearch>) => void
}

/**
 * World map (slice 044): full workspace with the toolbar, the Konva stage, the minimap, the legend and the drawer.
 * Reads `x`, `y`, `zoom` and `layers` from the route.
 */
export const MapPage: React.FC<MapPageProps> = ({ origin, search, onSearchChange }) => {
  const { data: city } = useGetCity(origin.kind === 'city' ? origin.id : undefined)
  const { data: outpost } = useGetOutpost(origin.kind === 'outpost' ? origin.id : undefined)
  const home = city?.coordinates ?? outpost?.coordinates ?? null

  if (!home) {
    return <div className="map-root flex flex-1 items-center justify-center text-body text-label">Chargement de la carte…</div>
  }
  return <MapWorkspace key={`${origin.kind}-${origin.id}`} origin={origin} home={home} search={search} onSearchChange={onSearchChange} />
}

const MapWorkspace: React.FC<MapPageProps & { home: Coordinates }> = ({ origin, home, search, onSearchChange }) => {
  const navigate = usePathNavigate()
  const focus = search.x !== undefined && search.y !== undefined ? { x: search.x, y: search.y } : null
  const { view, stage, zoom, panTo, zoomTo, jumpTo, resize } = useMapView({ center: focus ?? home, zoom: search.zoom })
  const layers = parseLayers(search.layers)
  const now = useNow(30_000)

  const [ selected, setSelected ] = useState<Coordinates | null>(focus)
  const [ menuOpen, setMenuOpen ] = useState(false)
  const [ drawer, setDrawer ] = useState<DrawerState | null>(null)
  const [ hover, setHover ] = useState<MapHoverTarget | null>(null)
  const [ pulseToken, setPulseToken ] = useState(focus ? 1 : 0)
  const interacted = useRef(false)
  const lastWritten = useRef<{ x?: number; y?: number }>({ x: search.x, y: search.y })

  const { data: terrainData } = useWorldTerrain()
  const terrain = terrainData?.terrain
  const { data: exploration } = useWorldExploration()
  const { data: markers } = useWorldMarkers(stage.height > 0 ? view.range : null)
  const { data: worldMarkers } = useMinimapMarkers()
  const { data: ownMovements } = useListMovements()
  const { data: incoming } = useListIncomingMovements()
  const { data: capacity } = useMovementCapacity()
  const { data: technologies } = useListTechnologies()
  const { data: cities } = useListCities()
  const { data: outposts } = useListOutposts()
  const { data: troops } = useListTroops(origin.kind === 'city' ? { cityId: origin.id } : { outpostId: origin.id })
  const targetsQuery = useWorldTargets(layers.targets)
  const targets = layers.targets ? targetsQuery.data?.targets ?? null : null

  const espionageLevel = technologies?.technologies.find(technology => technology.code === TechnologyCode.ESPIONAGE)?.level ?? 0
  const attack = useMemo(() => combatAttack((troops ?? []).map(troop => ({
    code: troop.code,
    count: Math.max(0, troop.count - (troop.exchange_reserved ?? 0)),
  }))), [ troops ])

  const { arrows, rings } = useMemo(() => toMapArrows({ own: ownMovements ?? [], incoming: incoming ?? [] }), [ ownMovements, incoming ])
  // « Mouvements » toggles own movements; incoming attacks stay visible (Détection decides what they show).
  const shownArrows = useMemo(
    () => (layers.movements ? arrows : arrows.filter(arrow => arrow.source === 'incoming')),
    [ arrows, layers.movements ]
  )
  const offsets = useMemo(() => arrowOffsets(shownArrows), [ shownArrows ])

  const current = useMemo(() => ({ kind: origin.kind, id: origin.id }), [ origin.kind, origin.id ])
  const screen = useMemo(() => screenMarkers({
    cities: markers?.cities ?? [],
    outposts: markers?.outposts ?? [],
    view,
    current,
  }), [ markers, view, current ])
  const occupied = useMemo(() => [ ...(markers?.cities ?? []), ...(markers?.outposts ?? []) ].map(entry => entry.coordinates), [ markers ])

  // URL: x, y, zoom once the view settles after a player action; layers at once.
  useEffect(() => {
    if (!interacted.current || stage.height === 0) return
    const timer = setTimeout(() => {
      const x = Math.round(view.center.x)
      const y = Math.round(view.center.y)
      lastWritten.current = { x, y }
      onSearchChange({ x, y, zoom: zoom === DEFAULT_ZOOM_LEVEL ? undefined : zoom })
    }, URL_WRITE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [ view.center.x, view.center.y, zoom ])

  // External focus (alliance links while the map is open): centre and select the cell.
  useEffect(() => {
    if (search.x === undefined || search.y === undefined) return
    if (search.x === lastWritten.current.x && search.y === lastWritten.current.y) return
    lastWritten.current = { x: search.x, y: search.y }
    const target = { x: search.x, y: search.y }
    jumpTo(target)
    setSelected(target)
    setPulseToken(token => token + 1)
  }, [ search.x, search.y ])

  const navigateView = useCallback(<A extends unknown[]>(action: (...args: A) => void) => (...args: A) => {
    interacted.current = true
    action(...args)
  }, [])

  const goTo = (target: Coordinates) => {
    interacted.current = true
    jumpTo(target)
    setSelected(target)
    setMenuOpen(false)
    setPulseToken(token => token + 1)
  }

  const setLayers = (next: MapLayers) => {
    onSearchChange({ layers: serializeLayers(next) })
    if (next.targets && !layers.targets) setDrawer(previous => previous ?? { kind: 'targets' })
    if (!next.targets && drawer?.kind === 'targets') setDrawer(null)
  }

  const closeDrawer = () => {
    setDrawer(null)
    setSelected(null)
    setMenuOpen(false)
  }

  const segmentsAt = (at: number) => arrowSegments({ arrows: shownArrows, offsets, view, stage, now: at })

  const pick = (point: { px: number; py: number }): MapHoverTarget | null => {
    const hit = hitTest({ point: { x: point.px, y: point.py }, segments: segmentsAt(Date.now()), markers: screen })
    if (hit.kind === 'movement') {
      const arrow = shownArrows.find(entry => entry.id === hit.id)
      if (arrow) return { kind: 'movement', coordinates: arrow.destination, arrow }
    }
    if (hit.kind === 'marker') return { kind: 'marker', coordinates: hit.marker.coordinates, marker: hit.marker }
    const cell = cellAtStagePoint(point.px, point.py, view)
    return cell ? { kind: 'cell', coordinates: cell } : null
  }

  const hoverKey = (target: MapHoverTarget | null): string => {
    if (!target) return ''
    if (target.kind === 'movement') return `movement-${target.arrow.id}`
    if (target.kind === 'marker') return target.marker.key
    return `cell-${cellKey(target.coordinates)}`
  }

  const onHover = (point: { px: number; py: number } | null) => {
    const next = point ? pick(point) : null
    setHover(previous => hoverKey(previous) === hoverKey(next) ? previous : next)
  }

  const onClick = (point: { px: number; py: number }) => {
    const target = pick(point)
    if (!target) return
    if (target.kind === 'movement') {
      setMenuOpen(false)
      setSelected(null)
      setDrawer({ kind: 'movement', id: target.arrow.id, source: target.arrow.source })
      return
    }
    setSelected(target.coordinates)
    setMenuOpen(true)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const panned = panByKey(view.center, event.key, event.shiftKey)
    if (panned) {
      event.preventDefault()
      interacted.current = true
      panTo(panned)
      return
    }
    if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      navigateView(zoomTo)(zoom - 1)
    } else if (event.key === '-' || event.key === '_') {
      event.preventDefault()
      navigateView(zoomTo)(zoom + 1)
    } else if (event.key === 'Escape') {
      if (menuOpen) setMenuOpen(false)
      else if (drawer) closeDrawer()
      else setSelected(null)
    }
  }

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const element = event.target as HTMLElement | null
      if (element?.closest('#map, [role="menu"]')) return
      if (drawer && drawer.kind !== 'send') closeDrawer()
    }
    document.addEventListener('keydown', onEscape)
    return () => document.removeEventListener('keydown', onEscape)
  })

  const openWizard = (destination: Coordinates, action: SendableAction) => {
    setMenuOpen(false)
    setSelected(destination)
    setDrawer({ kind: 'send', state: parseMovementSendSearch({ step: 'ordre', x: destination.x, y: destination.y, action }) })
  }

  const cellContext = (coordinates: Coordinates) => {
    const { city: cityMarker, outpost: outpostMarker } = settlementsAt(coordinates, markers)
    const result = mapCellActions({
      explored: Boolean(exploration?.has(cellKey(coordinates))),
      city: cityMarker,
      outpost: outpostMarker,
      isOrigin: sameCell(coordinates, home),
      espionageLevel,
      movementCapacity: capacity,
      outpostCapacity: outposts ? { count: outposts.outposts.length, limit: outposts.count_limit } : undefined,
    })
    return { ...result, city: cityMarker, outpost: outpostMarker }
  }

  const runAction = (coordinates: Coordinates) => (action: MapCellAction) => {
    if (action.settleOutpostId) {
      navigate({ to: `/outpost/${action.settleOutpostId}` })
      return
    }
    if (action.action) openWizard(coordinates, action.action)
  }

  const targetAt = (coordinates: Coordinates): WorldTarget | undefined =>
    targetsQuery.data?.targets.find(target => sameCell(target.coordinates, coordinates))

  const drawerCell = drawer?.kind === 'cell' ? drawer.coordinates : null
  const drawerContext = drawerCell ? cellContext(drawerCell) : null
  const drawerRelation = (drawerContext?.city ?? drawerContext?.outpost)?.relation
  const drawerHostile = drawerRelation === 'enemy' || drawerRelation === 'system'
  const listedIntel = drawerCell ? targetAt(drawerCell) : undefined
  const cellIntel = useCellIntel(drawerCell && drawerHostile && !listedIntel ? drawerCell : null)

  const terrainAt = (coordinates: Coordinates): TerrainChar | undefined =>
    terrain?.[(coordinates.y - 1) * (terrainData?.size ?? 100) + coordinates.x - 1] as TerrainChar | undefined

  const menuContext = menuOpen && selected ? cellContext(selected) : null

  const locationOptions: MapLocationOption[] = [
    ...(cities?.cities ?? []).map(entry => ({
      key: `city-${entry.id}`,
      label: `${entry.name} (${entry.coordinates.x}, ${entry.coordinates.y})`,
      coordinates: entry.coordinates,
    })),
    ...(outposts?.outposts ?? []).map(entry => ({
      key: `outpost-${entry.id}`,
      label: `Avant-poste (${entry.coordinates.x}, ${entry.coordinates.y})`,
      coordinates: entry.coordinates,
    })),
  ]

  const ownLocations = useMemo(() => locationOptions.map(option => option.coordinates), [ cities, outposts ])
  const allied = useMemo(() => [ ...(worldMarkers?.cities ?? []), ...(worldMarkers?.outposts ?? []) ]
    .filter(entry => entry.relation === 'ally')
    .map(entry => entry.coordinates), [ worldMarkers ])
  const threatened = useMemo(() => (incoming ?? []).map(attack => attack.target.coordinates), [ incoming ])

  const cellRect = (coordinates: Coordinates) => {
    const { px, py } = worldToStage({ x: coordinates.x - 0.5, y: coordinates.y + 0.5 }, view)
    return { x: px, y: py, size: view.cellSize }
  }

  const hoverAnchor = (() => {
    if (!hover) return null
    if (hover.kind === 'movement') {
      const segment = segmentsAt(Date.now()).find(entry => entry.id === hover.arrow.id)
      return segment ? { x: segment.dot.x + 6, y: segment.dot.y } : null
    }
    const rect = cellRect(hover.coordinates)
    return { x: rect.x + rect.size, y: rect.y }
  })()

  let drawerTitle = ''
  let drawerContent: React.ReactNode = null
  if (drawer?.kind === 'cell' && drawerContext) {
    drawerTitle = `Case (${drawer.coordinates.x}, ${drawer.coordinates.y})`
    drawerContent = (
      <MapDrawerCell
        coordinates={drawer.coordinates}
        terrain={terrainAt(drawer.coordinates)}
        explored={exploration?.get(cellKey(drawer.coordinates))}
        metric={layers.terrain}
        city={drawerContext.city}
        outpost={drawerContext.outpost}
        intel={listedIntel ? listedIntel.intel : cellIntel.data}
        attack={attack}
        now={now}
        actions={drawerContext.actions}
        notice={drawerContext.notice}
        onAction={runAction(drawer.coordinates)}
      />
    )
  } else if (drawer?.kind === 'movement') {
    drawerTitle = drawer.source === 'own' ? 'Mouvement' : 'Attaque entrante'
    drawerContent = <MapDrawerMovement origin={origin} movementId={drawer.id} source={drawer.source} incoming={incoming} />
  } else if (drawer?.kind === 'send') {
    drawerTitle = 'Envoyer des troupes'
    drawerContent = (
      <MovementSendWizard
        origin={origin}
        state={drawer.state}
        onStateChange={next => setDrawer({ kind: 'send', state: next })}
        onSent={movementId => setDrawer({ kind: 'movement', id: movementId, source: 'own' })}
        onCancel={closeDrawer}
        layout="drawer"
      />
    )
  } else if (drawer?.kind === 'targets') {
    drawerTitle = 'Cibles et menaces'
    drawerContent = (
      <MapDrawerTargets
        targets={targetsQuery.data?.targets}
        loading={targetsQuery.isPending}
        radius={targetsQuery.data?.radius ?? 15}
        attack={attack}
        now={now}
        espionageLevel={espionageLevel}
        onView={target => goTo(target.coordinates)}
        onSpy={target => openWizard(target.coordinates, MovementAction.SPY)}
        onAttack={target => openWizard(target.coordinates, MovementAction.ATTACK)}
      />
    )
  }

  const hoverIntel = hover?.kind === 'marker' && layers.targets
    ? targetAt(hover.coordinates)?.intel ?? null
    : undefined

  return (
    <div className="map-root flex min-h-0 flex-1 flex-col gap-3">
      <h1 className="sr-only">Carte du monde</h1>
      <MapToolbar
        zoom={zoom}
        rows={view.rows}
        columns={view.columns}
        onZoom={navigateView(zoomTo)}
        onGoTo={goTo}
        locations={locationOptions}
        onRecenter={() => {
          interacted.current = true
          jumpTo(home, DEFAULT_ZOOM_LEVEL)
          setSelected(null)
          setMenuOpen(false)
        }}
        layers={layers}
        onLayersChange={setLayers}
        onShowTargets={layers.targets && drawer?.kind !== 'targets' ? () => setDrawer({ kind: 'targets' }) : null}
        center={{ x: Math.round(view.center.x), y: Math.round(view.center.y) }}
      />
      <div className="relative flex min-h-[24rem] flex-1 overflow-hidden rounded-sm border border-rust/55 bg-chrome">
        <div className="relative min-w-0 flex-1">
          <MapCanvas
            view={view}
            onResize={resize}
            onPan={navigateView(panTo)}
            onPanEnd={navigateView((center: MapPoint) => panTo(center))}
            onWheelZoom={(direction, point) => navigateView(zoomTo)(zoom - direction, point)}
            onPointerClick={onClick}
            onPointerHover={onHover}
            onKeyDown={onKeyDown}
          >
            <TerrainLayer view={view} terrain={terrain} />
            <OverlayLayer
              view={view}
              metric={layers.terrain}
              exploration={exploration}
              occupied={occupied}
              showValues={zoom <= 3}
              targets={targets}
              now={now}
            />
            <MarkersLayer markers={screen} showLabels={view.cellSize >= LABEL_MIN_CELL_PX} />
            <MovementsLayer
              view={view}
              stage={stage}
              arrows={shownArrows}
              rings={rings}
              showAllEta={zoom <= 4}
              hoveredId={hover?.kind === 'movement' ? hover.arrow.id : null}
              selectedId={drawer?.kind === 'movement' ? drawer.id : null}
            />
            <SelectionLayer
              view={view}
              hovered={hover && hover.kind !== 'movement' ? hover.coordinates : null}
              selected={selected}
              pulseToken={pulseToken}
            />
          </MapCanvas>
          {hover && hoverAnchor && !menuOpen && (
            <MapHoverCard
              target={hover}
              anchor={hoverAnchor}
              stage={stage}
              terrain={terrainAt(hover.coordinates)}
              explored={exploration?.get(cellKey(hover.coordinates))}
              intel={hoverIntel}
              now={now}
            />
          )}
          {menuContext && selected && (
            <MapCellMenu
              coordinates={selected}
              anchor={cellRect(selected)}
              stage={stage}
              title={menuTitle(selected, menuContext.city?.name ?? null, menuContext.outpost ? 'Avant-poste' : null)}
              actions={menuContext.actions}
              notice={menuContext.notice}
              onAction={runAction(selected)}
              onDetails={() => {
                setMenuOpen(false)
                setDrawer({ kind: 'cell', coordinates: selected })
              }}
              onClose={() => setMenuOpen(false)}
            />
          )}
          <MapMinimap
            view={view}
            terrain={terrain}
            explored={exploration}
            own={ownLocations}
            allied={allied}
            threatened={threatened}
            onRecenter={navigateView(panTo)}
          />
          <MapLegend layers={layers} />
        </div>
        {drawer && drawerContent && (
          <MapDrawer title={drawerTitle} onClose={closeDrawer}>{drawerContent}</MapDrawer>
        )}
      </div>
    </div>
  )
}

const menuTitle = (coordinates: Coordinates, cityName: string | null, outpostName: string | null): string =>
  [ cityName ?? outpostName, `(${coordinates.x}, ${coordinates.y})` ].filter(Boolean).join(' ')
