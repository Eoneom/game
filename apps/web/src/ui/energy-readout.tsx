import React from 'react'
import classNames from 'classnames'

import {
  formatPhotovoltaicCoeff,
  getEnergyDisplayStatus,
  getEnergyUsagePercent,
} from '#helpers/energy'
import { transformDecimals } from '#helpers/transform'
import { IconEnergy } from '#ui/icon/energy'

const formatSolarCoeff = (value: number): string => {
  const rounded = Math.round(value * 100) / 100
  return `×${rounded}`
}

interface Props {
  consumption: number
  production: number
  baseProduction?: number
  photovoltaicOptimizationLevel?: number
  solarCoefficient?: number
  productionEnergyRatio?: number
  lede?: string
  /** Match compact resource bars (admin stats panel). */
  dense?: boolean
}

const statusTextClass: Record<'success' | 'warn' | 'danger', string> = {
  success: 'text-terminal',
  warn: 'text-amber',
  danger: 'text-danger',
}

const statusProgressClass: Record<'success' | 'warn' | 'danger', string> = {
  success: '[&::-webkit-progress-value]:bg-terminal [&::-moz-progress-bar]:bg-terminal',
  warn: '[&::-webkit-progress-value]:bg-amber [&::-moz-progress-bar]:bg-amber',
  danger: '[&::-webkit-progress-value]:bg-danger [&::-moz-progress-bar]:bg-danger',
}

export const EnergyReadout: React.FC<Props> = ({
  consumption,
  production,
  baseProduction,
  photovoltaicOptimizationLevel,
  solarCoefficient,
  productionEnergyRatio,
  lede = 'Consommation des bâtiments et production du panneau solaire.',
  dense = false,
}) => {
  const status = getEnergyDisplayStatus(consumption, production)
  const usagePercent = getEnergyUsagePercent(consumption, production)
  const showBreakdown =
    baseProduction !== undefined &&
    photovoltaicOptimizationLevel !== undefined &&
    solarCoefficient !== undefined
  const showEfficiency = productionEnergyRatio !== undefined && productionEnergyRatio < 1
  const gridCols = showBreakdown
    ? 'grid-cols-[minmax(0,1.2fr)_minmax(4rem,0.9fr)_minmax(4rem,0.9fr)_minmax(3rem,0.6fr)_minmax(3rem,0.6fr)_minmax(4rem,0.9fr)]'
    : 'grid-cols-[minmax(0,1.4fr)_minmax(4.5rem,1fr)_minmax(4.5rem,1fr)]'

  const labelClass = dense ? 'mb-0.5 text-[11px]' : 'mb-1 text-xs'
  const barHeight = dense ? 'h-1.5' : 'h-2'
  const energyLabel = dense ? 'Énergie' : (
    <span className="flex items-center gap-1">
      <IconEnergy /> Utilisation
    </span>
  )

  return (
    <div className={dense ? 'space-y-1.5' : 'space-y-3'}>
      {lede ? <p className="m-0 text-xs text-amber-dim">{lede}</p> : null}

      {showBreakdown ? (
        <div className="overflow-hidden rounded-sm border border-rust/50 bg-chrome/40">
          <div
            className={classNames(
              'grid gap-2 border-b border-rust/40 px-3 py-2 text-[0.65rem] uppercase tracking-wider text-label',
              gridCols
            )}
          >
            <span>Énergie</span>
            <span className="text-right">Conso.</span>
            <span className="text-right">Base</span>
            <span className="text-right">Optim.</span>
            <span className="text-right">Soleil</span>
            <span className="text-right">Production</span>
          </div>

          <div className={classNames('grid items-center gap-2 px-3 py-2.5', gridCols)}>
            <span className="flex min-w-0 items-center gap-2 text-sm text-amber-dim">
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-label">
                <IconEnergy />
              </span>
              <span className="truncate">Ville</span>
            </span>
            <span className={classNames('text-right font-mono text-sm tabular-nums', statusTextClass[status])}>
              {transformDecimals(consumption)}
            </span>
            <span className="text-right font-mono text-xs tabular-nums text-amber-dim">
              {transformDecimals(baseProduction)}
            </span>
            <span className="text-right font-mono text-sm tabular-nums text-label">
              {formatPhotovoltaicCoeff(photovoltaicOptimizationLevel)}
            </span>
            <span className="text-right font-mono text-sm tabular-nums text-label">
              {formatSolarCoeff(solarCoefficient)}
            </span>
            <span className={classNames('text-right font-mono text-sm tabular-nums', statusTextClass[status])}>
              {transformDecimals(production)}
            </span>
          </div>
        </div>
      ) : null}

      <div>
        <div className={classNames('flex justify-between text-amber-dim', labelClass)}>
          <span>{energyLabel}</span>
          <span className={classNames('tabular-nums', !dense && 'font-mono', statusTextClass[status])}>
            {transformDecimals(consumption)} / {transformDecimals(production)}
          </span>
        </div>
        <progress
          value={usagePercent}
          max={100}
          className={classNames(
            barHeight,
            'w-full rounded-sm border border-rust/40 bg-chrome [&::-webkit-progress-bar]:bg-chrome',
            statusProgressClass[status]
          )}
        />
      </div>

      {showEfficiency ? (
        <p className="m-0 text-xs text-danger">
          Production réduite à {Math.round(productionEnergyRatio * 100)}% par manque d&apos;énergie.
        </p>
      ) : null}
    </div>
  )
}
