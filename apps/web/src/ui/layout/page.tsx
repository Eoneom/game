import React from 'react'

interface Props {
  children: React.ReactNode
  details?: React.ReactNode
}

/** List + details page: on `xl` the details panel is a fixed 28 rem column (slice 043); stacked below. */
export const LayoutPage: React.FC<Props> = ({ details, children }) => {
  const showDetails = details !== undefined && details !== null

  return (
    <div
      className={
        showDetails
          ? 'grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-3 xl:grid-cols-[minmax(0,1fr)_28rem] xl:grid-rows-1'
          : 'flex min-h-0 flex-1 flex-col'
      }
    >
      <section className="workspace-list min-h-0 flex-1 overflow-auto rounded-sm border border-rust/50 bg-chrome/40 p-2">
        {children}
      </section>
      {showDetails && (
        <aside className="action-panel surface-panel min-h-0 overflow-auto border-amber/30 p-3 shadow-[inset_0_0_24px_rgba(62,57,50,0.08)]">
          {details}
        </aside>
      )}
    </div>
  )
}
