import React from 'react'

interface Props {
  children: React.ReactNode
}

export const LayoutDetailsEmpty: React.FC<Props> = ({ children }) => {
  return (
    <div className="flex h-full min-h-[12rem] flex-col items-center justify-center px-4 text-center">
      <p className="m-0 text-sm text-amber-dim">{children}</p>
    </div>
  )
}
