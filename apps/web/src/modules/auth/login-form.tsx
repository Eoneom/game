import React, { FormEvent, useState } from 'react'
import { toast } from 'react-toastify'

import { useLogin } from '#auth/hooks'
import { Button } from '#ui/button'

export const AuthLoginForm: React.FC = () => {
  const [playerName, setPlayerName] = useState('')
  const { mutate: login } = useLogin()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation()
    event.preventDefault()

    if (!playerName) {
      toast.error('Le nom est requis pour se connecter')
      return
    }

    login(playerName)
  }

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
      <form
        className="surface-chrome relative z-10 w-full max-w-md animate-boot-sweep motion-reduce:animate-none space-y-4 rounded-sm border border-amber/40 p-6 neon-amber motion-safe-neon"
        onSubmit={onSubmit}
      >
        <h1 className="m-0 text-center text-2xl tracking-[0.2em] text-amber">EONEOM</h1>
        <p className="m-0 text-center text-sm text-amber-dim">
          Entrez votre nom de commandant pour rejoindre la colonie.
        </p>
        <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-label">
          Nom
          <input
            type="text"
            placeholder="Nom"
            value={playerName}
            onChange={event => setPlayerName(event.target.value)}
            autoComplete="username"
            className="field-input text-base normal-case tracking-normal"
          />
        </label>
        <Button type="submit" className="w-full">
          Se connecter
        </Button>
      </form>
    </div>
  )
}
