import React, { FormEvent, useState } from 'react'
import { toast } from 'react-toastify'

import { useLogin } from '#auth/hooks'
import { Button } from '#ui/button'

interface Props {
  onGoToSignup: () => void
}

export const AuthLoginForm: React.FC<Props> = ({ onGoToSignup }) => {
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
      <p className="m-0 text-center text-sm text-amber-dim">
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-amber underline-offset-4 hover:underline"
          onClick={onGoToSignup}
        >
          Créer un compte
        </button>
      </p>
    </form>
  )
}
