import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Coordinates, MovementAction, WorldMarkerRelation } from '@eoneom/api-client'
import classNames from 'classnames'

import { SendableAction } from '#movement/send/search'

/** What the client knows about a cell when the player clicks it (slice 044). */
export interface MapCellContext {
  explored: boolean
  city: { id: string; relation: WorldMarkerRelation } | null
  outpost: { id: string; relation: WorldMarkerRelation } | null
  /** The cell of the location the map acts from (route city or outpost). */
  isOrigin: boolean
  espionageLevel: number
  movementCapacity?: { used: number; limit: number }
  outpostCapacity?: { count: number; limit: number }
}

export interface MapCellAction {
  key: string
  label: string
  /** Opens the send wizard with this action. */
  action?: SendableAction
  /** « Fonder une ville »: the outpost page holds the settle form. */
  settleOutpostId?: string
  disabledReason?: string
}

export const SAME_FACTION_NOTICE = 'Aucune action possible sur un emplacement de votre faction'
const CURRENT_LOCATION_NOTICE = 'Emplacement actuel : choisissez une autre case comme destination.'
export const ESPIONAGE_DISABLED = 'Recherchez Espionnage'
export const OUTPOST_LIMIT_REACHED = 'Limite d\'avant-postes atteinte'

export const movementLimitReason = ({ used, limit }: { used: number; limit: number }): string =>
  `Mouvements ${used} / ${limit} — limite atteinte`

const send = (action: SendableAction, label: string, disabledReason?: string): MapCellAction => ({
  key: action,
  label,
  action,
  disabledReason,
})

/**
 * Actions the server would accept for this destination, from what the client knows (slice 044). Troop composition
 * is chosen in the wizard, where the remaining rules apply; the server stays the authority.
 */
export const mapCellActions = (context: MapCellContext): { actions: MapCellAction[]; notice?: string } => {
  const capacity = context.movementCapacity
  const capReason = capacity && capacity.used >= capacity.limit ? movementLimitReason(capacity) : undefined
  const withCap = (action: MapCellAction): MapCellAction =>
    action.action && capReason && !action.disabledReason ? { ...action, disabledReason: capReason } : action

  const settlement = context.city
    ? { kind: 'city' as const, ...context.city }
    : context.outpost ? { kind: 'outpost' as const, ...context.outpost } : null

  let actions: MapCellAction[] = []
  let notice: string | undefined

  if (!context.explored) {
    actions = [ send(MovementAction.EXPLORE, 'Explorer') ]
  } else if (!settlement) {
    const outposts = context.outpostCapacity
    actions = [
      send(
        MovementAction.BASE,
        'Établir un avant-poste',
        outposts && outposts.count >= outposts.limit ? OUTPOST_LIMIT_REACHED : undefined
      ),
    ]
  } else if (settlement.relation === 'mine') {
    actions = [
      send(MovementAction.TRANSPORT, 'Transporter'),
      send(MovementAction.BASE, 'Stationner'),
    ]
    if (settlement.kind === 'outpost') {
      actions.push({ key: 'settle', label: 'Fonder une ville', settleOutpostId: settlement.id })
    }
  } else if (settlement.relation === 'ally') {
    if (settlement.kind === 'city') {
      actions = [ send(MovementAction.REINFORCE, 'Renforcer') ]
    } else {
      notice = SAME_FACTION_NOTICE
    }
  } else if (settlement.relation === 'faction') {
    notice = SAME_FACTION_NOTICE
  } else {
    actions = [
      send(MovementAction.ATTACK, 'Attaquer'),
      send(MovementAction.SPY, 'Espionner', context.espionageLevel < 1 ? ESPIONAGE_DISABLED : undefined),
    ]
  }

  if (context.isOrigin) {
    actions = actions.filter(action => !action.action)
    notice = CURRENT_LOCATION_NOTICE
  }

  return { actions: actions.map(withCap), notice }
}

interface MapCellMenuProps {
  coordinates: Coordinates
  /** Cell rectangle in stage pixels, the menu sits next to it. */
  anchor: { x: number; y: number; size: number }
  stage: { width: number; height: number }
  title: string
  actions: MapCellAction[]
  notice?: string
  onAction: (action: MapCellAction) => void
  onDetails: () => void
  onClose: () => void
}

const MENU_GAP = 6

/** In-place menu anchored next to the clicked cell, flipped to stay inside the stage (slice 044). */
export const MapCellMenu: React.FC<MapCellMenuProps> = ({
  coordinates,
  anchor,
  stage,
  title,
  actions,
  notice,
  onAction,
  onDetails,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null)
  const [ size, setSize ] = useState({ width: 220, height: 160 })

  useLayoutEffect(() => {
    const element = ref.current
    if (element && (element.offsetWidth !== size.width || element.offsetHeight !== size.height)) {
      setSize({ width: element.offsetWidth, height: element.offsetHeight })
    }
  })

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button:not([disabled])')?.focus()
  }, [ coordinates.x, coordinates.y ])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onClose()
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [ onClose ])

  const right = anchor.x + anchor.size + MENU_GAP
  const left = right + size.width > stage.width ? Math.max(0, anchor.x - MENU_GAP - size.width) : right
  const top = Math.max(0, Math.min(anchor.y, stage.height - size.height))

  const itemClass = 'block w-full cursor-pointer rounded-sm px-3 py-1.5 text-left text-body text-ink hover:bg-chrome-3 focus-visible:bg-chrome-3 disabled:cursor-not-allowed disabled:text-label disabled:hover:bg-transparent'

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Actions sur la case (${coordinates.x}, ${coordinates.y})`}
      className="map-cell-menu absolute z-20 w-60 surface-panel border-edge p-1 shadow-lg"
      style={{ left, top }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
      }}
    >
      <p className="m-0 px-3 pb-1 pt-1.5 text-meta text-label">{title}</p>
      {actions.map(action => (
        <button
          key={action.key}
          type="button"
          role="menuitem"
          className={itemClass}
          disabled={Boolean(action.disabledReason)}
          title={action.disabledReason}
          onClick={() => onAction(action)}
        >
          {action.label}
          {action.disabledReason && <span className="block text-caption text-label">{action.disabledReason}</span>}
        </button>
      ))}
      {notice && <p className="m-0 px-3 py-1.5 text-meta text-label">{notice}</p>}
      <button
        type="button"
        role="menuitem"
        className={classNames(itemClass, 'border-t border-rust/40 text-amber')}
        onClick={onDetails}
      >
        Détails
      </button>
    </div>
  )
}
