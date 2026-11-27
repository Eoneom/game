import React, { useEffect, useRef } from 'react'
import { useLocation as useRouterLocation } from '@tanstack/react-router'

import type { City, Outpost } from '#types'
import { IconEnergy } from '#ui/icon/energy'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlasma } from '#ui/icon/plasma'
import { IconPlastic } from '#ui/icon/plastic'
import { IconWater } from '#ui/icon/water'
import { HeaderResourceChip } from '#ui/header/resources/item'
import { HeaderResourcePanel, RESOURCE_PANEL_ID } from '#ui/header/resources/panel'
import { useResourcePanel } from '#ui/header/resources/context'

interface Props {
  city: City | null
  outpost: Outpost | null
}

const CHIPS_ID = 'header-resource-chips'

/**
 * Compact header resources (slice 041): one button with the stock of each resource that toggles
 * the detail panel (disclosure pattern, no focus trap).
 */
export const HeaderResources: React.FC<Props> = ({ city, outpost }) => {
  const { isOpen, close, toggle } = useResourcePanel()
  const { pathname } = useRouterLocation()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const locationKey = city?.id ?? outpost?.id ?? null

  const closeAndFocus = () => {
    close()
    buttonRef.current?.focus()
  }

  // A route or location change closes the panel.
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    close()
  }, [ pathname, locationKey, close ])

  // A click outside the panel and the button closes it.
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return
      close()
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [ isOpen, close ])

  if (!city && !outpost) {
    return null
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && isOpen) {
      event.stopPropagation()
      closeAndFocus()
    }
  }

  return (
    <div className="relative" onKeyDown={onKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={RESOURCE_PANEL_ID}
        aria-label="Ressources — afficher le détail"
        aria-describedby={CHIPS_ID}
        onClick={toggle}
        className="flex items-center gap-4 rounded-sm border border-rust/50 bg-chrome px-3 py-1.5 transition-colors hover:border-amber/50"
      >
        <span id={CHIPS_ID} className="flex items-center gap-4">
          {city ? (
            <>
              <HeaderResourceChip kind="stock" name="Plastique" icon={<IconPlastic />} value={city.plastic} capacity={city.warehouses_capacity.plastic} />
              <HeaderResourceChip kind="stock" name="Champignon" icon={<IconMushroom />} value={city.mushroom} capacity={city.warehouses_capacity.mushroom} />
              <HeaderResourceChip kind="stock" name="Plasma" icon={<IconPlasma />} value={city.plasma} />
              {/* Eau pure (slice 035): cities only, unlimited storage. */}
              <HeaderResourceChip kind="stock" name="Eau pure" icon={<IconWater />} value={city.water} />
              <HeaderResourceChip kind="energy" name="Énergie" icon={<IconEnergy />} consumption={city.energy_consumption} production={city.energy} />
            </>
          ) : outpost ? (
            <>
              <HeaderResourceChip kind="stock" name="Plastique" icon={<IconPlastic />} value={outpost.plastic} capacity={outpost.warehouses_capacity.plastic} />
              <HeaderResourceChip kind="stock" name="Champignon" icon={<IconMushroom />} value={outpost.mushroom} capacity={outpost.warehouses_capacity.mushroom} />
              <HeaderResourceChip kind="stock" name="Plasma" icon={<IconPlasma />} value={outpost.plasma} />
            </>
          ) : null}
        </span>
        <span aria-hidden className="text-label">{isOpen ? '▴' : '▾'}</span>
      </button>
      {isOpen ? (
        <HeaderResourcePanel ref={panelRef} city={city} outpost={city ? null : outpost} onClose={closeAndFocus} />
      ) : null}
    </div>
  )
}
