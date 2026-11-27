import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'

interface ResourcePanelContextValue {
  isOpen: boolean
  open: () => void
  close: () => void
  toggle: () => void
}

const ResourcePanelContext = createContext<ResourcePanelContextValue | null>(null)

/**
 * Open state of the header resource panel (slice 041). Lives above the header and the workspace
 * so the city dashboard (042) can open the same panel. Not persisted.
 */
export const ResourcePanelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ isOpen, setOpen ] = useState(false)
  const open = useCallback(() => setOpen(true), [])
  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen(current => !current), [])
  const value = useMemo(() => ({ isOpen, open, close, toggle }), [ isOpen, open, close, toggle ])

  return (
    <ResourcePanelContext.Provider value={value}>
      {children}
    </ResourcePanelContext.Provider>
  )
}

export const useResourcePanel = (): ResourcePanelContextValue => {
  const ctx = useContext(ResourcePanelContext)
  if (!ctx) {
    throw new Error('useResourcePanel must be used inside ResourcePanelProvider')
  }
  return ctx
}
