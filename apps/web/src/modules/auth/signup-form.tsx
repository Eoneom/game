import React, { FormEvent, useState } from 'react'
import { toast } from 'react-toastify'
import { FactionCode, playableFactionCodes } from '@eoneom/api-client'

import { useSignup } from '#auth/hooks'
import { FactionTranslations } from '#faction/translations'
import { Button } from '#ui/button'

interface Props {
  onGoToLogin: () => void
}

export const AuthSignupForm: React.FC<Props> = ({ onGoToLogin }) => {
  const [playerName, setPlayerName] = useState('')
  const [cityName, setCityName] = useState('')
  const [factionCode, setFactionCode] = useState<FactionCode>(FactionCode.THE_CONFEDERATION)
  const { mutate: signup } = useSignup()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.stopPropagation()
    event.preventDefault()

    if (!playerName) {
      toast.error('Le nom est requis pour s\'inscrire')
      return
    }

    if (!cityName) {
      toast.error('Le nom de la ville est requis pour s\'inscrire')
      return
    }

    if (!factionCode) {
      toast.error('La faction est requise pour s\'inscrire')
      return
    }

    signup({
      playerName,
      cityName,
      factionCode,
    })
  }

  return (
    <form
      className="surface-chrome relative z-10 w-full max-w-md animate-boot-sweep motion-reduce:animate-none space-y-4 rounded-sm border border-amber/40 p-6 neon-amber motion-safe-neon"
      onSubmit={onSubmit}
    >
      <h1 className="m-0 text-center text-2xl tracking-[0.2em] text-amber">EONEOM</h1>
      <p className="m-0 text-center text-sm text-amber-dim">
        Choisissez votre faction et fondez votre première ville.
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
      <label className="flex flex-col gap-1 text-xs uppercase tracking-wider text-label">
        Ville
        <input
          type="text"
          placeholder="Ville"
          value={cityName}
          onChange={event => setCityName(event.target.value)}
          autoComplete="off"
          className="field-input text-base normal-case tracking-normal"
        />
      </label>
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="px-0 text-xs uppercase tracking-wider text-label">Faction</legend>
        {playableFactionCodes().map(code => (
          <label
            key={code}
            className="flex cursor-pointer items-center gap-2 text-sm normal-case tracking-normal text-amber"
          >
            <input
              type="radio"
              name="faction"
              value={code}
              checked={factionCode === code}
              onChange={() => setFactionCode(code)}
            />
            {FactionTranslations[code].name}
          </label>
        ))}
      </fieldset>
      <Button type="submit" className="w-full">
        S'inscrire
      </Button>
      <p className="m-0 text-center text-sm text-amber-dim">
        <button
          type="button"
          className="cursor-pointer border-0 bg-transparent p-0 text-amber underline-offset-4 hover:underline"
          onClick={onGoToLogin}
        >
          Déjà un commandant ? Se connecter
        </button>
      </p>
    </form>
  )
}
