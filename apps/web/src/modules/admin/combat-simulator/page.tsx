import React, { useEffect, useMemo, useState } from 'react'

import {
  AdminCombatSimulatorDataResponse,
  CombatStrategy,
  FactionCode,
  TroopCode,
} from '@eoneom/api-client'
import { AdminRouteGate } from '#admin/session'
import { CombatStrategyLabels } from '#movement/translations'
import { troopImageSrc } from '#troop/image'
import { TroopTranslations } from '#troop/translations'
import { EntityThumb } from '#ui/entity-thumb'
import {
  COMBAT_STRATEGY_OPTIONS,
  CombatSimulatorFaction,
  CombatSimulatorStackRow,
  COMBAT_SIMULATOR_FACTION_OPTIONS,
  defaultCombatSimulatorStack,
  useCombatSimulator,
} from './hooks'
import {
  availableTroopCodesForRow,
  canAddCombatSimulatorStack,
  computeSideCombatTotals,
  firstUnusedTroopCode,
  troopCombatStats,
} from './stack-utils'

const SIMULATION_DEBOUNCE_MS = 300

const WINNER_LABEL: Record<NonNullable<AdminCombatSimulatorDataResponse['winner']>, string> = {
  attacker: 'Victoire de l\'attaquant',
  defender: 'Victoire du défenseur',
  draw: 'Match nul',
}

type StackEditorProps = {
  title: string
  faction: CombatSimulatorFaction
  onFactionChange: (faction: CombatSimulatorFaction) => void
  stacks: CombatSimulatorStackRow[]
  onChange: (stacks: CombatSimulatorStackRow[]) => void
}

const TroopLossList: React.FC<{
  losses: { troop_code: TroopCode; count: number }[]
}> = ({ losses }) => {
  if (losses.length === 0) {
    return <span>—</span>
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-1 p-0">
      {losses.map(loss => (
        <li key={loss.troop_code} className="flex items-center gap-1.5">
          <img
            src={troopImageSrc(loss.troop_code)}
            alt={TroopTranslations[loss.troop_code].name}
            className="h-7 w-7 shrink-0 rounded-sm border border-rust/50 object-cover"
            loading="lazy"
            decoding="async"
          />
          <span>
            {TroopTranslations[loss.troop_code].name}
            <span className="text-amber-dim"> ×{loss.count}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

const SideTotalsSummary: React.FC<{ stacks: CombatSimulatorStackRow[] }> = ({ stacks }) => {
  const totals = useMemo(() => computeSideCombatTotals(stacks), [ stacks ])

  return (
    <p className="m-0 text-xs text-amber-dim">
      Totaux (base, hors stratégie) — ATK {totals.attack} / DEF {totals.defense} / VIE {totals.life}
    </p>
  )
}

const StackEditor: React.FC<StackEditorProps> = ({
  title,
  faction,
  onFactionChange,
  stacks,
  onChange,
}) => {
  const updateRow = (index: number, patch: Partial<CombatSimulatorStackRow>) => {
    onChange(stacks.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index: number) => {
    onChange(stacks.filter((_, i) => i !== index))
  }

  const addRow = () => {
    const next_code = firstUnusedTroopCode(faction, stacks)
    if (!next_code) {
      return
    }
    onChange([ ...stacks, { troop_code: next_code, count: 10 } ])
  }

  const can_add = canAddCombatSimulatorStack(faction, stacks)

  return (
    <section className="admin-surface-panel flex flex-col gap-2 rounded-sm p-3">
      <h2 className="m-0 text-sm font-normal text-amber">{title}</h2>
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label text-label">Faction</span>
        <select
          className="field-input max-w-xs py-1 text-sm"
          value={faction}
          onChange={e => onFactionChange(e.target.value as CombatSimulatorFaction)}
        >
          {COMBAT_SIMULATOR_FACTION_OPTIONS.map(option => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <div className="space-y-2">
        {stacks.map((row, index) => {
          const row_codes = availableTroopCodesForRow(faction, stacks, index)
          const per_unit = troopCombatStats(row.troop_code)
          const count = row.count
          const troop_name = TroopTranslations[row.troop_code].name
          return (
            <div key={index} className="flex gap-2">
              <EntityThumb
                size="md"
                src={troopImageSrc(row.troop_code)}
                alt={troop_name}
                className="mt-0.5"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="field-input min-w-[10rem] py-1 text-sm"
                  value={row.troop_code}
                  onChange={e => updateRow(index, { troop_code: e.target.value as TroopCode })}
                >
                  {row_codes.map(code => (
                    <option key={code} value={code}>
                      {TroopTranslations[code].name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="field-input w-24 py-1 text-sm"
                  value={row.count}
                  onChange={e => updateRow(index, { count: Number.parseInt(e.target.value, 10) || 0 })}
                />
                <button
                  type="button"
                  className="rounded-sm border border-rust/50 px-2 py-1 text-xs text-amber-dim hover:border-danger hover:text-amber"
                  onClick={() => removeRow(index)}
                  disabled={stacks.length <= 1}
                >
                  Retirer
                </button>
              </div>
              <p className="m-0 text-[11px] text-amber-dim">
                Unité — ATK {per_unit.attack} / DEF {per_unit.defense} / VIE {per_unit.life}
                {' · '}
                Ligne — ATK {per_unit.attack * count} / DEF {per_unit.defense * count} / VIE {per_unit.life * count}
              </p>
              </div>
            </div>
          )
        })}
      </div>
      <button
        type="button"
        className="self-start rounded-sm border border-rust/60 bg-chrome-3 px-2 py-1 text-sm text-amber shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:border-amber/50 disabled:opacity-50"
        onClick={addRow}
        disabled={!can_add}
      >
        Ajouter une stack
      </button>
      <SideTotalsSummary stacks={stacks} />
    </section>
  )
}

const CombatSimulatorContent: React.FC<{ is_admin: boolean }> = ({ is_admin }) => {
  const { mutate: runSimulation, isPending: sim_pending, data: result } = useCombatSimulator(is_admin)

  const [ attacker_faction, setAttackerFaction ] = useState<CombatSimulatorFaction>(
    FactionCode.THE_CONFEDERATION,
  )
  const [ defender_faction, setDefenderFaction ] = useState<CombatSimulatorFaction>(
    FactionCode.THE_TECHNOLOGICAL_SINGULARITY,
  )
  const [ attacker_stacks, setAttackerStacks ] = useState<CombatSimulatorStackRow[]>([
    { troop_code: TroopCode.LEGIONNAIRE, count: 20 },
  ])
  const [ defender_stacks, setDefenderStacks ] = useState<CombatSimulatorStackRow[]>([
    { troop_code: TroopCode.PRIME_UNIT, count: 20 },
  ])
  const [ attacker_strategy, setAttackerStrategy ] = useState<CombatStrategy>(
    CombatStrategy.BALANCED,
  )
  const [ defender_strategy, setDefenderStrategy ] = useState<CombatStrategy>(
    CombatStrategy.BALANCED,
  )
  const [ show_json, setShowJson ] = useState(false)

  const can_submit = useMemo(
    () => attacker_stacks.length > 0 && defender_stacks.length > 0,
    [ attacker_stacks.length, defender_stacks.length ],
  )

  useEffect(() => {
    if (!is_admin || !can_submit) {
      return
    }

    const timer = window.setTimeout(() => {
      runSimulation({
        attacker_stacks,
        defender_stacks,
        attacker_strategy,
        defender_strategy,
      })
    }, SIMULATION_DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [
    is_admin,
    can_submit,
    attacker_stacks,
    defender_stacks,
    attacker_strategy,
    defender_strategy,
    runSimulation,
  ])

  const display_result = result

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <header className="admin-surface-toolbar shrink-0 space-y-1">
        <h1 className="m-0 text-lg text-amber">Simulateur de combat</h1>
        <p className="m-0 text-sm text-amber-dim">
          Simulation hors persistance — moteur PvP (5 rounds max), réservé aux opérateurs.
          La simulation se met à jour automatiquement lorsque les paramètres changent.
        </p>
      </header>

      <div className="grid shrink-0 gap-3 lg:grid-cols-2">
        <StackEditor
          title="Attaquant"
          faction={attacker_faction}
          onFactionChange={next => {
            setAttackerFaction(next)
            setAttackerStacks([ defaultCombatSimulatorStack(next) ])
          }}
          stacks={attacker_stacks}
          onChange={setAttackerStacks}
        />
        <StackEditor
          title="Défenseur"
          faction={defender_faction}
          onFactionChange={next => {
            setDefenderFaction(next)
            setDefenderStacks([ defaultCombatSimulatorStack(next) ])
          }}
          stacks={defender_stacks}
          onChange={setDefenderStacks}
        />
      </div>

      <div className="admin-surface-toolbar flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label text-label">Stratégie attaquant</span>
          <select
            className="field-input py-1 text-sm"
            value={attacker_strategy}
            onChange={e => setAttackerStrategy(e.target.value as CombatStrategy)}
          >
            {COMBAT_STRATEGY_OPTIONS.map(value => (
              <option key={value} value={value}>
                {CombatStrategyLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="field-label text-label">Stratégie défenseur</span>
          <select
            className="field-input py-1 text-sm"
            value={defender_strategy}
            onChange={e => setDefenderStrategy(e.target.value as CombatStrategy)}
          >
            {COMBAT_STRATEGY_OPTIONS.map(value => (
              <option key={value} value={value}>
                {CombatStrategyLabels[value]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {display_result || sim_pending ? (
        <div
          className={`admin-surface-panel relative flex min-h-0 flex-col gap-3 rounded-sm p-3 transition-opacity ${sim_pending ? 'opacity-80' : ''}`}
        >
          {sim_pending ? (
            <p className="m-0 text-center text-xs text-amber-dim">Mise à jour de la simulation…</p>
          ) : null}

          {display_result ? (
            <>
              {display_result.winner ? (
                <p className="m-0 rounded-sm border border-amber/40 bg-chrome-3 px-3 py-2 text-center text-sm text-amber">
                  {WINNER_LABEL[display_result.winner]}
                </p>
              ) : null}

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm text-amber-dim">
                  <thead>
                    <tr className="border-b border-rust/50 text-amber">
                      <th className="px-2 py-1 font-normal">Round</th>
                      <th className="px-2 py-1 font-normal">Pools att.</th>
                      <th className="px-2 py-1 font-normal">Pools déf.</th>
                      <th className="px-2 py-1 font-normal">Pertes att.</th>
                      <th className="px-2 py-1 font-normal">Pertes déf.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {display_result.round_summaries.map(row => (
                      <tr key={row.round} className="border-b border-rust/30">
                        <td className="px-2 py-1">{row.round}</td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          ATK {row.attacker_attack_pool} / VIE {row.attacker_life_pool}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          ATK {row.defender_attack_pool} / VIE {row.defender_life_pool}
                        </td>
                        <td className="px-2 py-1 align-top">
                          <TroopLossList losses={row.attacker_losses} />
                        </td>
                        <td className="px-2 py-1 align-top">
                          <TroopLossList losses={row.defender_losses} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="self-start text-xs text-amber-dim underline hover:text-amber"
                onClick={() => setShowJson(v => !v)}
              >
                {show_json ? 'Masquer le JSON' : 'Afficher le JSON'}
              </button>
              {show_json ? (
                <pre className="admin-surface-code overflow-x-auto whitespace-pre-wrap break-all rounded-sm p-2 text-[11px]">
                  {JSON.stringify(display_result, null, 2)}
                </pre>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export const CombatSimulatorPage: React.FC = () => {
  return (
    <AdminRouteGate>
      {session => <CombatSimulatorContent is_admin={session.is_admin} />}
    </AdminRouteGate>
  )
}
