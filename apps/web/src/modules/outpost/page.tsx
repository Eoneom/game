import React from 'react'

import {
  formatCoordinates,
  transformDecimals,
  transformHourlyEarnings
} from '#helpers/transform'
import { useGetOutpost, useSetOutpostPermanent } from '#outpost/hooks'
import { useSettleCity } from '#city/hooks'
import { OutpostSettle } from '#outpost/settle'
import { Button } from '#ui/button'
import { OutpostType } from '@eoneom/api-client'
import { IconMushroom } from '#ui/icon/mushroom'
import { IconPlastic } from '#ui/icon/plastic'

interface Props {
  outpostId: string
}

const formatTerrainCoeff = (value: number): string => {
  return `×${value.toFixed(2)}`
}

export const OutpostPage: React.FC<Props> = ({ outpostId }) => {
  const { data: outpost } = useGetOutpost(outpostId)
  const setPermanent = useSetOutpostPermanent(outpostId)
  const settleCity = useSettleCity()

  if (!outpost || outpost.id !== outpostId) {
    return (
      <section id="content" className="city-page">
        <p className="city-page__loading">Chargement…</p>
      </section>
    )
  }

  const isPermanent = outpost.type === OutpostType.PERMANENT

  return (
    <section id="content" className="city-page">
      <header className="city-page__hero">
        <div className="city-page__hero-main">
          <h1 className="city-page__title">Avant-poste</h1>
          <p className="city-page__lede">
            {isPermanent
              ? 'Vue d’ensemble de votre avant-poste permanent et de ses flux de ressources.'
              : 'Avant-poste temporaire — rendez-le permanent pour produire des ressources.'}
          </p>
        </div>
        <p className="details-coordinates city-page__coords" title="Position sur la carte">
          {formatCoordinates(outpost.coordinates)}
        </p>
      </header>

      {outpost.type === OutpostType.TEMPORARY && (
        <>
          <Button onClick={() => setPermanent.mutate()}>
            Rendre permanent
          </Button>
          <OutpostSettle outpostId={outpostId} onSettle={name => settleCity.mutate(name)} />
        </>
      )}

      <div className="city-page__grid">
        <article className="city-panel" aria-labelledby="outpost-stock-heading">
          <h2 id="outpost-stock-heading" className="city-panel__title">
            Ressources en stock
          </h2>
          <ul className="app-list app-list--kv city-panel__list">
            <li>
              <span className="city-panel__kv-label">
                <IconPlastic /> Plastique (stock)
              </span>
              <span>{transformDecimals(outpost.plastic)}</span>
            </li>
            <li>
              <span className="city-panel__kv-label">
                <IconMushroom /> Champignon (stock)
              </span>
              <span>{transformDecimals(outpost.mushroom)}</span>
            </li>
          </ul>
        </article>

        {isPermanent && (
          <article className="city-panel" aria-labelledby="outpost-production-heading">
            <h2 id="outpost-production-heading" className="city-panel__title">
              Production et terrain
            </h2>
            <p className="city-panel__lede">
              Débits par heure. Les multiplicateurs de cellule s’appliquent à la production «&nbsp;actuelle&nbsp;».
              Fermiers et recycleurs stationnés produisent ici.
            </p>
            <h3 className="city-subheading">Actuelle (avec terrain)</h3>
            <ul className="app-list app-list--kv city-panel__list">
              <li>
                <span className="city-panel__kv-label">
                  <IconPlastic /> Plastique
                </span>
                <span>{transformHourlyEarnings(outpost.earnings_per_second.plastic)}</span>
              </li>
              <li>
                <span className="city-panel__kv-label">
                  <IconMushroom /> Champignon
                </span>
                <span>{transformHourlyEarnings(outpost.earnings_per_second.mushroom)}</span>
              </li>
            </ul>
            <h3 className="city-subheading">Base des unités (avant terrain)</h3>
            <ul className="app-list app-list--kv city-panel__list">
              <li>
                <span className="city-panel__kv-label">
                  <IconPlastic /> Plastique
                </span>
                <span>{transformHourlyEarnings(outpost.pre_cell_earnings_per_second.plastic)}</span>
              </li>
              <li>
                <span className="city-panel__kv-label">
                  <IconMushroom /> Champignon
                </span>
                <span>{transformHourlyEarnings(outpost.pre_cell_earnings_per_second.mushroom)}</span>
              </li>
            </ul>
            <h3 className="city-subheading" id="outpost-coeff-subheading">
              Coefficients de terrain (cellule)
            </h3>
            <p className="city-panel__coeff-hint" id="outpost-coeff-hint">
              Multiplicateurs de la cellule où se trouve l’avant-poste.
            </p>
            <div
              className="city-coeff-chips"
              aria-labelledby="outpost-coeff-subheading"
              aria-describedby="outpost-coeff-hint"
            >
              <span className="city-coeff-chip">
                <IconPlastic /> {formatTerrainCoeff(outpost.cell_resource_coefficient.plastic)}
              </span>
              <span className="city-coeff-chip">
                <IconMushroom /> {formatTerrainCoeff(outpost.cell_resource_coefficient.mushroom)}
              </span>
            </div>
          </article>
        )}
      </div>
    </section>
  )
}
