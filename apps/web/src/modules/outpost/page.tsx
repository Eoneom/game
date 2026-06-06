import React from 'react'
import classNames from 'classnames'

import {
  formatCoordinates,
  transformDecimals,
} from '#helpers/transform'
import { useGetOutpost, useSetOutpostPermanent } from '#outpost/hooks'
import { useSettleCity } from '#city/hooks'
import { OutpostSettle } from '#outpost/settle'
import { Button } from '#ui/button'
import { OutpostType } from '@eoneom/api-client'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlastic } from '#ui/icon/plastic'
import { ProductionTerrainReadout } from '#ui/production-terrain-readout'
import { Link } from '@tanstack/react-router'

interface Props {
  outpostId: string
}

const warehouseFillPercent = (capacity: number, stored: number): number => {
  if (capacity <= 0) {
    return 0
  }
  return Math.min(100, Math.max(0, (stored / capacity) * 100))
}

export const OutpostPage: React.FC<Props> = ({ outpostId }) => {
  const { data: outpost } = useGetOutpost(outpostId)
  const setPermanent = useSetOutpostPermanent(outpostId)
  const settleCity = useSettleCity()
  const RouterLink = Link as React.ComponentType<{
    to: string
    params?: Record<string, string>
    className?: string
    children: React.ReactNode
  }>

  if (!outpost || outpost.id !== outpostId) {
    return <p className="text-amber-dim">Chargement…</p>
  }

  const isPermanent = outpost.type === OutpostType.PERMANENT
  const plasticFill = warehouseFillPercent(
    outpost.warehouses_capacity.plastic,
    outpost.plastic
  )
  const mushroomFill = warehouseFillPercent(
    outpost.warehouses_capacity.mushroom,
    outpost.mushroom
  )
  const plasticRemaining = Math.max(
    0,
    outpost.warehouses_capacity.plastic - outpost.plastic
  )
  const mushroomRemaining = Math.max(
    0,
    outpost.warehouses_capacity.mushroom - outpost.mushroom
  )

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-rust/50 pb-3">
        <div>
          <h1 className="m-0 text-2xl text-amber">Avant-poste</h1>
          <p className="m-0 mt-1 text-sm text-amber-dim">
            {isPermanent
              ? 'Avant-poste permanent — production et stocks.'
              : 'Temporaire — rendez-le permanent pour produire.'}
          </p>
        </div>
        <p className="m-0 font-mono text-sm text-label">
          {formatCoordinates(outpost.coordinates)}
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <RouterLink
          to="/outpost/$outpostId/world/map"
          params={{ outpostId }}
          className="rounded-sm border border-rust/50 bg-chrome px-2 py-1 text-xs uppercase tracking-wider text-amber hover:border-amber"
        >
          Carte
        </RouterLink>
        <RouterLink
          to="/outpost/$outpostId/world/movement"
          params={{ outpostId }}
          className="rounded-sm border border-rust/50 bg-chrome px-2 py-1 text-xs uppercase tracking-wider text-amber hover:border-amber"
        >
          Déplacement
        </RouterLink>
      </div>

      {outpost.type === OutpostType.TEMPORARY && (
        <div className="surface-chrome space-y-3 rounded-sm border border-rust/60 p-3">
          <Button onClick={() => setPermanent.mutate()}>Rendre permanent</Button>
          <OutpostSettle outpostId={outpostId} onSettle={name => settleCity.mutate(name)} />
        </div>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <article className="surface-chrome space-y-3 rounded-sm border border-rust/60 p-3">
          <h2 className="m-0 text-base text-amber">Ressources en stock</h2>
          <ul className="m-0 list-none space-y-1 p-0 text-sm">
            <li className="flex justify-between">
              <span className="flex items-center gap-1 text-amber-dim">
                <IconPlastic /> Plastique
              </span>
              <span className="font-mono text-amber">{transformDecimals(outpost.plastic)}</span>
            </li>
            <li className="flex justify-between">
              <span className="flex items-center gap-1 text-amber-dim">
                <IconMushroom /> Champignon
              </span>
              <span className="font-mono text-amber">{transformDecimals(outpost.mushroom)}</span>
            </li>
          </ul>

          <div className="space-y-2 border-t border-rust/50 pt-3">
            <div>
              <div className="mb-1 flex justify-between text-xs text-amber-dim">
                <span className="flex items-center gap-1">
                  <IconPlastic /> Entrepôt plastique
                </span>
                <span>
                  {transformDecimals(plasticRemaining)} libre /{' '}
                  {transformDecimals(outpost.warehouses_capacity.plastic)}
                </span>
              </div>
              <progress
                value={plasticFill}
                max={100}
                className={classNames(
                  'h-2 w-full rounded-sm border border-rust/40 bg-chrome [&::-webkit-progress-value]:bg-amber [&::-moz-progress-bar]:bg-amber',
                  plasticFill >= 90 &&
                    '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger'
                )}
              />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-amber-dim">
                <span className="flex items-center gap-1">
                  <IconMushroom /> Entrepôt champignon
                </span>
                <span>
                  {transformDecimals(mushroomRemaining)} libre /{' '}
                  {transformDecimals(outpost.warehouses_capacity.mushroom)}
                </span>
              </div>
              <progress
                value={mushroomFill}
                max={100}
                className={classNames(
                  'h-2 w-full rounded-sm border border-rust/40 bg-chrome [&::-webkit-progress-value]:bg-terminal [&::-moz-progress-bar]:bg-terminal',
                  mushroomFill >= 90 &&
                    '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger'
                )}
              />
            </div>
          </div>
        </article>

        {isPermanent && (
          <article className="surface-chrome rounded-sm border border-rust/60 p-3">
            <h2 className="m-0 text-base text-amber">Production et terrain</h2>
            <div className="mt-3">
              <ProductionTerrainReadout
                current={outpost.earnings_per_second}
                terrain={outpost.cell_resource_coefficient}
              />
            </div>
          </article>
        )}
      </div>
    </section>
  )
}
