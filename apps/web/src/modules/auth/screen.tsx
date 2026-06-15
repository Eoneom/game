import React from 'react'

interface Props {
  children: React.ReactNode
}

export const AuthScreen: React.FC<Props> = ({ children }) => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-chrome p-6 scanlines relative">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(44,36,30,0.72), rgba(53,44,36,0.86)), var(--background-image-tex-metal)',
          backgroundSize: 'auto, 160px',
        }}
      />
      {children}
    </div>
  )
}
