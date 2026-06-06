import React from 'react'
import classNames from 'classnames'

interface Props {
  onClick?: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: 'primary' | 'danger' | 'ghost'
  type?: 'button' | 'submit'
  className?: string
}

export const Button: React.FC<Props> = ({
  onClick,
  disabled,
  children,
  variant = 'primary',
  type = 'button',
  className,
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={() => onClick && onClick()}
      className={classNames(
        'cursor-pointer rounded-sm border px-3 py-2 text-sm uppercase tracking-wide transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' &&
          'neon-amber motion-safe-neon border-copper bg-copper/30 text-amber hover:bg-copper/50',
        variant === 'danger' &&
          'border-danger bg-danger-deep/50 text-amber hover:bg-danger-deep/70',
        variant === 'ghost' &&
          'border-rust/50 bg-transparent text-amber-dim hover:border-rust hover:text-amber',
        className
      )}
    >
      {children}
    </button>
  )
}
