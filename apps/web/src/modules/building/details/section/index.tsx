import React from 'react'

interface Props {
  children: React.ReactNode
}

export const BuildingDetailsSection: React.FC<Props> = ({ children }) => {
  return (
    <div className="border-t border-rust/50 pt-3">
      {children}
    </div>
  )
}
