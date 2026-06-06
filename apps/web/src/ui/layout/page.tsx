import React from 'react'

interface Props {
  children: React.ReactNode
  details?: React.ReactNode
}

export const LayoutPage: React.FC<Props> = ({ details, children }) => {
  const showDetails = details !== undefined && details !== null

  return (
    <div
      className={
        showDetails
          ? 'grid h-full min-h-[28rem] grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]'
          : 'flex h-full min-h-[28rem] flex-col'
      }
    >
      <section className="workspace-list min-h-0 overflow-auto rounded-sm border border-rust/50 bg-chrome/40 p-2">
        {children}
      </section>
      {showDetails && (
        <aside className="action-panel surface-chrome min-h-[12rem] overflow-auto rounded-sm border border-amber/30 p-3 shadow-[inset_0_0_24px_rgba(62,57,50,0.08)]">
          {details}
        </aside>
      )}
    </div>
  )
}
