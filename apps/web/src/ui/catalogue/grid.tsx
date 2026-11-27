import React, { useCallback, useMemo, useRef, useState } from 'react'
import classNames from 'classnames'

import { CatalogueCard, CatalogueCardData } from '#ui/catalogue/card'
import {
  CatalogueSettingScope,
  useCatalogueCollapsedGroups,
  useCatalogueFlag
} from '#ui/catalogue/filter'
import { moveInCatalogueGrid, readGridColumnCount } from '#ui/catalogue/navigation'
import { isLockedCardState } from '#ui/catalogue/state'

export interface CatalogueGroup {
  id: string
  title: string
  cards: CatalogueCardData[]
}

interface Props {
  /** Scope of the persisted filter and collapse settings. */
  scope: CatalogueSettingScope
  groups: CatalogueGroup[]
  selectedCode: string | null
  onSelect: (code: string) => void
  /** Queue panel rendered above the toolbar. */
  queue?: React.ReactNode
  /** Extra toolbar content after the filters. */
  toolbar?: React.ReactNode
  /** Adds « Masquer les unités absentes » (troops); `true` / `false` is its default. */
  absentFilterDefault?: boolean
  /** « Masquer les verrouillés »; off for read-only grids, which have no locked card. */
  lockedFilter?: boolean
}

interface VisibleGroup {
  group: CatalogueGroup
  collapsed: boolean
  visible: CatalogueCardData[]
  hiddenLocked: number
  hiddenAbsent: number
}

const isAbsent = (card: CatalogueCardData): boolean => card.amount.kind === 'count' && card.amount.value === 0

const lockedLine = (count: number): string =>
  count > 1 ? `${count} verrouillés masqués` : `${count} verrouillé masqué`

const absentLine = (count: number): string =>
  count > 1 ? `${count} unités absentes masquées` : `${count} unité absente masquée`

const move_keys = new Set([ 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End' ])

/**
 * Grouped card grid of a catalogue (slice 043): queue slot, toolbar, then one collapsible
 * `listbox` per group. Owns the roving `tabindex` and arrow-key navigation across groups.
 */
export const CatalogueGrid: React.FC<Props> = ({
  scope,
  groups,
  selectedCode,
  onSelect,
  queue,
  toolbar,
  absentFilterDefault,
  lockedFilter = true,
}) => {
  const hasAbsentFilter = absentFilterDefault !== undefined
  const [hideLocked, setHideLocked] = useCatalogueFlag(scope, 'hide_locked', false)
  const [hideAbsent, setHideAbsent] = useCatalogueFlag(scope, 'hide_absent', absentFilterDefault ?? false)
  const [collapsed, setCollapsed] = useCatalogueCollapsedGroups(scope)
  const [activeCode, setActiveCode] = useState<string | null>(null)
  const cardRefs = useRef(new Map<string, HTMLDivElement>())
  const listRefs = useRef(new Map<string, HTMLDivElement>())

  const visibleGroups: VisibleGroup[] = useMemo(() => groups
    .filter(group => group.cards.length > 0)
    .map(group => {
      let hiddenLocked = 0
      let hiddenAbsent = 0
      const visible = group.cards.filter(card => {
        if (card.code === selectedCode) {
          return true
        }
        if (lockedFilter && hideLocked && isLockedCardState(card.state)) {
          hiddenLocked += 1
          return false
        }
        if (hasAbsentFilter && hideAbsent && isAbsent(card)) {
          hiddenAbsent += 1
          return false
        }
        return true
      })
      return {
        group,
        collapsed: collapsed.includes(group.id),
        visible,
        hiddenLocked,
        hiddenAbsent,
      }
    }), [groups, selectedCode, lockedFilter, hideLocked, hideAbsent, hasAbsentFilter, collapsed])

  /** Cards reachable with the keyboard, per group (collapsed groups have none). */
  const navigable = useMemo(
    () => visibleGroups.map(entry => (entry.collapsed ? [] : entry.visible)),
    [visibleGroups]
  )
  const navigableCodes = useMemo(() => navigable.flat().map(card => card.code), [navigable])

  const tabbableCode = activeCode && navigableCodes.includes(activeCode)
    ? activeCode
    : selectedCode && navigableCodes.includes(selectedCode)
      ? selectedCode
      : navigableCodes[0] ?? null

  const toggleGroup = (id: string) => {
    setCollapsed(collapsed.includes(id) ? collapsed.filter(entry => entry !== id) : [ ...collapsed, id ])
  }

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>, groupIndex: number, index: number) => {
    const card = navigable[groupIndex]?.[index]
    if (!card) {
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(card.code)
      return
    }
    if (!move_keys.has(event.key)) {
      return
    }
    event.preventDefault()
    const columns = readGridColumnCount(listRefs.current.get(visibleGroups[groupIndex].group.id))
    const target = moveInCatalogueGrid(
      navigable.map(cards => cards.length),
      { group: groupIndex, index },
      event.key,
      columns
    )
    if (!target) {
      return
    }
    const code = navigable[target.group][target.index].code
    setActiveCode(code)
    cardRefs.current.get(code)?.focus()
  }, [navigable, visibleGroups, onSelect])

  return (
    <div className="catalogue-grid space-y-3">
      {queue}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-meta text-amber-dim">
        {lockedFilter ? (
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-amber"
              checked={hideLocked}
              onChange={event => setHideLocked(event.target.checked)}
            />
            Masquer les verrouillés
          </label>
        ) : null}
        {hasAbsentFilter ? (
          <label className="inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-amber"
              checked={hideAbsent}
              onChange={event => setHideAbsent(event.target.checked)}
            />
            Masquer les unités absentes
          </label>
        ) : null}
        {toolbar}
      </div>

      {visibleGroups.map((entry, groupIndex) => {
        const { group } = entry
        const titleId = `catalogue-group-${scope}-${group.id}`
        const panelId = `${titleId}-panel`
        return (
          <section key={group.id} aria-labelledby={titleId} className="space-y-2">
            <h3 className="m-0">
              <button
                id={titleId}
                type="button"
                aria-expanded={!entry.collapsed}
                aria-controls={panelId}
                onClick={() => toggleGroup(group.id)}
                className="inline-flex items-center gap-2 border-0 bg-transparent p-0 text-caption uppercase tracking-wider text-label hover:text-amber"
              >
                <span aria-hidden className={classNames('inline-block transition-transform', !entry.collapsed && 'rotate-90')}>▸</span>
                {group.title}
                <span className="font-mono normal-case tracking-normal">{group.cards.length}</span>
              </button>
            </h3>
            {entry.collapsed ? null : (
              <div id={panelId} className="space-y-1">
                {entry.visible.length > 0 ? (
                  <div
                    ref={element => {
                      if (element) listRefs.current.set(group.id, element)
                      else listRefs.current.delete(group.id)
                    }}
                    role="listbox"
                    aria-label={group.title}
                    className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2"
                  >
                    {entry.visible.map((card, index) => (
                      <CatalogueCard
                        key={card.code}
                        ref={element => {
                          if (element) cardRefs.current.set(card.code, element)
                          else cardRefs.current.delete(card.code)
                        }}
                        {...card}
                        selected={card.code === selectedCode}
                        tabIndex={card.code === tabbableCode ? 0 : -1}
                        onSelect={() => {
                          setActiveCode(card.code)
                          onSelect(card.code)
                        }}
                        onFocus={() => setActiveCode(card.code)}
                        onKeyDown={event => handleKeyDown(event, groupIndex, index)}
                      />
                    ))}
                  </div>
                ) : null}
                {entry.hiddenLocked > 0 ? (
                  <p className="m-0 text-meta text-label">{lockedLine(entry.hiddenLocked)}</p>
                ) : null}
                {entry.hiddenAbsent > 0 ? (
                  <p className="m-0 text-meta text-label">{absentLine(entry.hiddenAbsent)}</p>
                ) : null}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
