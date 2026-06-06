import React from 'react'

interface Props {
  title: string
  depth?: string
  active?: React.ReactNode
  queue?: React.ReactNode
  empty?: string
}

export const QueuePanel: React.FC<Props> = ({ title, depth, active, queue, empty }) => {
  return (
    <section className="surface-chrome mb-3 rounded-sm p-3">
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="m-0 text-sm uppercase tracking-wider text-amber">{title}</h3>
        {depth ? (
          <span className="font-mono text-xs text-label">{depth}</span>
        ) : null}
      </header>

      {active ? (
        <div className="rounded-sm border border-amber/50 bg-chrome p-2">
          {active}
        </div>
      ) : empty ? (
        <p className="m-0 text-sm text-amber-dim">{empty}</p>
      ) : null}

      {queue ? (
        <div className="mt-3 space-y-2">
          <h4 className="m-0 text-xs uppercase tracking-wider text-label">File d&apos;attente</h4>
          {queue}
        </div>
      ) : null}
    </section>
  )
}
