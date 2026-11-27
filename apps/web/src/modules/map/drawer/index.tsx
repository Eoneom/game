import React from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

/** Drawer on the right edge of the stage (slice 044, 26 rem): cell, movement or target details and the send wizard. */
export const MapDrawer: React.FC<Props> = ({ title, onClose, children }) => (
  <aside
    aria-label={title}
    className="map-drawer flex w-[26rem] shrink-0 flex-col border-l border-rust/55 bg-chrome-2 animate-panel-in motion-reduce:animate-none"
  >
    <header className="flex items-center justify-between gap-2 border-b border-rust/40 px-3 py-2">
      <h2 className="m-0 truncate text-heading text-amber">{title}</h2>
      <button
        type="button"
        className="cursor-pointer rounded-sm px-2 text-title leading-none text-label hover:text-amber"
        aria-label="Fermer le panneau"
        onClick={onClose}
      >
        ×
      </button>
    </header>
    <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
  </aside>
)
