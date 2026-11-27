import classNames from 'classnames'
import { ExchangeSide } from '@eoneom/api-client'

export const sectionTitleClass = 'm-0 text-caption uppercase tracking-wider text-label'
export const tableClass = 'w-full border-collapse text-body'
export const headRowClass = 'text-left text-caption uppercase tracking-wider text-label'
export const rowClass = 'border-t border-rust/30 text-amber-dim'

/** Flat panel of a page section (slice 040). */
export const panelClass = 'surface-panel min-w-0 p-4'

/** Buy in `terminal`, sell in `danger`, as in every exchange table (slice 035). */
export const sideToneClass = (side: ExchangeSide): string => side === ExchangeSide.BUY ? 'text-terminal' : 'text-danger'

/** Segmented control button (resource selector, side toggle); `tone` colours the selected sell / buy button. */
export const segmentClass = (active: boolean, tone?: ExchangeSide): string => classNames(
  'rounded-sm border px-3 py-2 transition',
  !active && 'border-rust/40 text-amber-dim hover:border-rust hover:text-amber',
  active && !tone && 'border-amber/60 bg-chrome-2 text-amber',
  active && tone === ExchangeSide.SELL && 'border-danger bg-chrome-2 text-danger',
  active && tone === ExchangeSide.BUY && 'border-terminal bg-chrome-2 text-terminal'
)

/** − / + buttons next to a number field. */
export const stepperClass = 'h-10 w-10 shrink-0 rounded-sm border border-edge text-body text-amber transition hover:border-amber disabled:cursor-not-allowed disabled:opacity-40'

/** Inline text button (« Prix du marché », « Voir les 50 », disclosures). */
export const textButtonClass = 'cursor-pointer rounded-sm border-0 bg-transparent p-0 text-meta text-amber underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline'
