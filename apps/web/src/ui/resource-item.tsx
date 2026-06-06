import React from 'react'
import classNames from 'classnames'

interface Props {
  icon: React.ReactNode
  value: string
  className?: string
}

export const ResourceItem: React.FC<Props> = ({ className, icon, value }) => {
  return (
    <div
      className={classNames(
        'resource-item flex items-center gap-1.5 font-mono text-sm transition',
        className === 'danger' && 'text-danger',
        className === 'success' && 'text-terminal',
        (!className || (className !== 'danger' && className !== 'success')) && 'text-amber',
        className !== 'danger' && className !== 'success' ? className : undefined
      )}
    >
      <span
        className={
          className === 'danger'
            ? 'inline-flex h-5 w-5 shrink-0 items-center justify-center text-danger'
            : 'inline-flex h-5 w-5 shrink-0 items-center justify-center text-label'
        }
      >
        {icon}
      </span>
      <span>{value}</span>
    </div>
  )
}
