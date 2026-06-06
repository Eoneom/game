import React from 'react'

export const IconPlastic: React.FC = () => {
  return (
    <svg
      className="game-icon game-icon--plastic h-5 w-5 shrink-0"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 24"
      aria-hidden="true"
      focusable="false"
    >
      {/* Cap */}
      <path
        fill="currentColor"
        d="M5.2 1.2h5.6c.4 0 .7.3.7.7v1.1c0 .2-.1.4-.3.5H4.8c-.2-.1-.3-.3-.3-.5V1.9c0-.4.3-.7.7-.7z"
      />
      {/* Neck ring */}
      <path
        fill="currentColor"
        opacity="0.85"
        d="M5.5 3.5h5c.3 0 .5.2.5.5v.7c0 .3-.2.5-.5.5h-5c-.3 0-.5-.2-.5-.5V4c0-.3.2-.5.5-.5z"
      />
      {/* Neck */}
      <path
        fill="currentColor"
        d="M6.2 5.2h3.6c.2 0 .4.2.4.4v1.6c0 .2-.2.4-.4.4H6.2c-.2 0-.4-.2-.4-.4V5.6c0-.2.2-.4.4-.4z"
      />
      {/* Body */}
      <path
        fill="currentColor"
        d="M3.4 7.8c0-.5.4-.9.9-.9h7.4c.5 0 .9.4.9.9v12.6c0 1.1-.9 2-2 2H5.4c-1.1 0-2-.9-2-2V7.8z"
      />
      {/* Mid ridges */}
      <path
        fill="currentColor"
        opacity="0.45"
        d="M4.2 11.2h7.6v.7H4.2zm0 2.2h7.6v.7H4.2zm0 2.2h7.6v.7H4.2z"
      />
      {/* Highlight strip */}
      <path
        fill="currentColor"
        opacity="0.25"
        d="M5.2 8.4h1.2v11.2c0 .3-.2.5-.5.5h-.2c-.3 0-.5-.2-.5-.5V8.4z"
      />
    </svg>
  )
}
