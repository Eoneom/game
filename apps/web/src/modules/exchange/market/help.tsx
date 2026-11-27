import React, { useId, useState } from 'react'

import { textButtonClass } from '#exchange/styles'

/** « Comment ça marche ? » (slice 046): the rules of the faction exchange (slice 035). */
export const ExchangeHelp: React.FC = () => {
  const [ open, setOpen ] = useState(false)
  const panelId = useId()

  return (
    <section className="space-y-2" aria-label="Comment ça marche ?">
      <button type="button" className={textButtonClass} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)}>
        <span aria-hidden>{open ? '▾' : '▸'} </span>Comment ça marche ?
      </button>
      <div id={panelId} hidden={!open} className="space-y-2 text-body text-amber-dim [&_p]:max-w-[72ch]">
        <p className="m-0">
          Les ordres sont à cours limité et se paient en eau pure, entre joueurs de votre faction uniquement. Un ordre
          s&apos;exécute contre le meilleur prix en face, puis le plus ancien à prix égal, au prix de l&apos;ordre qui
          attendait dans le carnet. Pas de frais.
        </p>
        <p className="m-0">
          Les ressources et les transporteurs restent réservés jusqu&apos;à l&apos;exécution, l&apos;annulation ou
          l&apos;expiration de l&apos;ordre, 7 jours après sa création. Les convois de bourse ne peuvent pas être
          interceptés et ne comptent pas dans la limite de déplacements.
        </p>
      </div>
    </section>
  )
}
