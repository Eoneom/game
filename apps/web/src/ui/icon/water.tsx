import React from 'react'

/** Eau pure (slice 035): a purified drop over a filter bar. */
export const IconWater: React.FC = () => {
  return (
    <svg
      className="game-icon game-icon--water h-5 w-5 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {/* Drop body */}
      <path
        fill="currentColor"
        opacity="0.35"
        d="M12 3.2C9.8 6.1 6.2 10.9 6.2 14a5.8 5.8 0 0 0 11.6 0c0-3.1-3.6-7.9-5.8-10.8z"
      />
      {/* Drop outline */}
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        d="M12 3.2C9.8 6.1 6.2 10.9 6.2 14a5.8 5.8 0 0 0 11.6 0c0-3.1-3.6-7.9-5.8-10.8z"
      />
      {/* Highlight */}
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.85"
        d="M9.3 14.4a2.7 2.7 0 0 0 2.7 2.7"
      />
      {/* Filter bar */}
      <path
        fill="currentColor"
        opacity="0.6"
        d="M7 21h10c.3 0 .5.2.5.5s-.2.5-.5.5H7a.5.5 0 0 1 0-1z"
      />
    </svg>
  )
}
