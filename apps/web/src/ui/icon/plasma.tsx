import React from 'react'

export const IconPlasma: React.FC = () => {
  return (
    <svg
      className="game-icon game-icon--plasma h-5 w-5 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {/* Outer torus */}
      <path
        fill="currentColor"
        opacity="0.35"
        d="M12 3.5c-4.7 0-8.5 2.9-8.5 6.5s3.8 6.5 8.5 6.5 8.5-2.9 8.5-6.5S16.7 3.5 12 3.5zm0 11.5c-3.6 0-6.5-2.1-6.5-5s2.9-5 6.5-5 6.5 2.1 6.5 5-2.9 5-6.5 5z"
      />
      {/* Coil ring */}
      <path
        fill="currentColor"
        d="M12 5c-3.6 0-6.5 2.2-6.5 5s2.9 5 6.5 5 6.5-2.2 6.5-5-2.9-5-6.5-5zm0 8.2c-2.3 0-4.2-1.4-4.2-3.2S9.7 6.8 12 6.8s4.2 1.4 4.2 3.2-1.9 3.2-4.2 3.2z"
      />
      {/* Plasma core */}
      <circle fill="currentColor" cx="12" cy="10" r="2.4" />
      <circle fill="currentColor" opacity="0.45" cx="12" cy="10" r="1.2" />
      {/* Lower containment base */}
      <path
        fill="currentColor"
        opacity="0.7"
        d="M7.5 17.2h9c.6 0 1 .4 1 1v1.3c0 .6-.4 1-1 1h-9c-.6 0-1-.4-1-1V18.2c0-.6.4-1 1-1z"
      />
      <path
        fill="currentColor"
        opacity="0.4"
        d="M9 15.5h6v1.2H9z"
      />
    </svg>
  )
}
