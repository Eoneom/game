import classNames from 'classnames'
import React from 'react'

interface Props {
  children: React.ReactNode
  content: React.ReactNode
  position: 'top' | 'bottom' | 'right' | 'left'
}

export const Tooltip: React.FC<Props> = ({ children, content, position }) => {
  return (
    <div className="tooltip group relative inline-flex">
      {children}
      <span
        className={classNames(
          'tooltip-text pointer-events-none absolute z-50 hidden w-max max-w-xs rounded-sm border border-rust/70 bg-chrome px-2 py-1 text-xs text-amber shadow-lg group-hover:block',
          position === 'bottom' && 'left-1/2 top-full mt-1 -translate-x-1/2',
          position === 'top' && 'bottom-full left-1/2 mb-1 -translate-x-1/2',
          position === 'right' && 'left-full top-1/2 ml-1 -translate-y-1/2',
          position === 'left' && 'right-full top-1/2 mr-1 -translate-y-1/2'
        )}
      >
        {content}
      </span>
    </div>
  )
}
