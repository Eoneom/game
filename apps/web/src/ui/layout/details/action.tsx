import React from 'react'

interface Props {
  children: React.ReactNode
}

/**
 * Action block of a details panel (slice 043): requirement, cost, then the action button, right under
 * the header so the action is visible without scrolling. Kept outside `LayoutDetailsContent` so its
 * lists keep their own styles.
 */
export const LayoutDetailsAction: React.FC<Props> = ({ children }) => {
  return (
    <section aria-label="Action" className="details-action my-3 space-y-3 border-y border-rust/50 py-3">
      {children}
    </section>
  )
}
