import React from 'react'
import classNames from 'classnames'

import { transformDecimals } from '#helpers/transform'
import { getEnergyDisplayStatus } from '#helpers/energy'

/** Fill ratio from which a warehouse chip shows a danger dot (slice 041). */
export const WAREHOUSE_WARN_RATIO = 0.9

/** Exact value for titles and screen readers, e.g. 12480 → « 12 480 ». */
export const formatExactAmount = (value: number): string => Math.floor(value).toLocaleString('fr-FR')

const energyStatusClass: Record<'success' | 'warn' | 'danger', string> = {
  success: 'text-terminal',
  warn: 'text-amber',
  danger: 'text-danger',
}

type Props = {
  /** Resource name for screen readers and the title, e.g. « Plastique ». */
  name: string
  icon: React.ReactNode
} & (
  | { kind: 'stock', value: number, capacity?: number }
  | { kind: 'energy', consumption: number, production: number }
)

/** One compact header chip: icon + stock (or energy consumption / production), with fill warnings. */
export const HeaderResourceChip: React.FC<Props> = (props) => {
  const { name, icon } = props

  let display: string
  let exact: string
  let colorClass = 'text-amber'
  let warning: 'near' | 'full' | null = null

  if (props.kind === 'energy') {
    display = `${transformDecimals(props.consumption)} / ${transformDecimals(props.production)}`
    exact = `${formatExactAmount(props.consumption)} / ${formatExactAmount(props.production)}`
    colorClass = energyStatusClass[getEnergyDisplayStatus(props.consumption, props.production)]
  } else {
    display = transformDecimals(props.value)
    exact = formatExactAmount(props.value)
    if (props.capacity !== undefined && props.capacity > 0) {
      if (props.value >= props.capacity) {
        warning = 'full'
        colorClass = 'text-danger'
      } else if (props.value >= props.capacity * WAREHOUSE_WARN_RATIO) {
        warning = 'near'
      }
    }
  }

  const srText = `${name} ${exact}${warning === 'full' ? ', entrepôt plein' : warning === 'near' ? ', entrepôt presque plein' : ''}. `

  return (
    <span
      className="header-resource-chip flex items-center gap-1.5"
      data-resource={name}
      title={`${name} ${exact}`}
    >
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-label">{icon}</span>
      <span aria-hidden className={classNames('font-mono text-body font-medium tabular-nums', colorClass)}>
        {display}
      </span>
      {warning ? (
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-danger" data-warning={warning} />
      ) : null}
      <span className="sr-only">{srText}</span>
    </span>
  )
}
