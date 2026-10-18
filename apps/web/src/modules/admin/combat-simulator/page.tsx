import React, { useMemo, useState } from 'react'
import { Navigate } from '@tanstack/react-router'

import {
  AdminCombatSimulatorDataResponse,
  CombatStrategy,
  TroopCode,
} from '@eoneom/api-client'
import { useObservabilitySession } from '#admin/system-player-observability/hooks'
import { CombatStrategyLabels } from '#movement/translations'
import { TroopTranslations } from '#troop/translations'
import {
  COMBAT_STRATEGY_OPTIONS,
  CombatSimulatorStackRow,
  PVP_COMBAT_TROOP_CODES,
  defaultCombatSimulatorStack,
  useCombatSimulator,
} from './hooks'

const WINNER_LABEL: Record<NonNullable<AdminCombatSimulatorDataResponse['winner']>, string> = {
  attacker: 'Victoire de l\'attaquant',
  defender: 'Victoire du défenseur',
  draw: 'Match nul',
}

type StackEditorProps = {
  title: string
  stacks: CombatSimulatorStackRow[]
  onChange: (stacks: CombatSimulatorStackRow[]) => void
}

const StackEditor: React.FC<StackEditorProps> = ({ title, stacks, onChange }) => {
  const updateRow = (index: number, patch: Partial<CombatSimulatorStackRow>) => {
    onChange(stacks.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  const removeRow = (index: number) => {
    onChange(stacks.filter((_, i) => i !== index))
  }

  const addRow = () => {
    onChange([ ...stacks, defaultCombatSimulatorStack() ])
  }

  return (
    <section className="admin-surface-panel flex flex-col gap-2 rounded-sm p-3">
      <h2 className="m-0 text-sm font-normal text-amber">{title}</h2>
      <div className="space-y-2">
        {stacks.map((row, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select
              className="field-input min-w-[10rem] py-1 text-sm"
              value={row.troop_code}
              onChange={e => updateRow(index, { troop_code: e.target.value as TroopCode })}
            >
              {PVP_COMBAT_TROOP_CODES.map(code => (
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
        ))}
      </div>
      <button
        type="button"
        className="self-start rounded-sm border border-rust/60 bg-chrome-3 px-2 py-1 text-sm text-amber shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:border-amber/50"
        onClick={addRow}
      >
        Ajouter une stack
      </button>
    </section>
  )
}

const formatLosses = (
  losses: { troop_code: TroopCode; count: number }[],
): string => {
  if (losses.length === 0) {
    return '—'
  }
  return losses
    .map(l => `${TroopTranslations[l.troop_code].name} ×${l.count}`)
    .join(', ')
}

export const CombatSimulatorPage: React.FC = () => {
  const { data: session, isPending } = useObservabilitySession()
  const { mutate: runSimulation, isPending: sim_pending, data: result } = useCombatSimulator(
    session?.is_admin,
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

  if (isPending) {
    return <p className="text-amber-dim">Chargement…</p>
  }

  if (!session?.is_admin) {
    return <Navigate to="/inbox/report" />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
      <header className="admin-surface-toolbar shrink-0 space-y-1">
        <h1 className="m-0 text-lg text-amber">Simulateur de combat</h1>
        <p className="m-0 text-sm text-amber-dim">
          Simulation hors persistance — moteur PvP (5 rounds max), réservé aux opérateurs.
        </p>
      </header>

      <div className="grid shrink-0 gap-3 lg:grid-cols-2">
        <StackEditor
          title="Attaquant"
          stacks={attacker_stacks}
          onChange={setAttackerStacks}
        />
        <StackEditor
          title="Défenseur"
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
        <button
          type="button"
          className="rounded-sm border border-amber/40 bg-chrome-3 px-3 py-1.5 text-sm text-amber shadow-[0_1px_3px_rgba(0,0,0,0.2)] hover:border-amber/70 disabled:opacity-50"
          disabled={!can_submit || sim_pending}
          onClick={() => {
            runSimulation({
              attacker_stacks,
              defender_stacks,
              attacker_strategy,
              defender_strategy,
            })
          }}
        >
          {sim_pending ? 'Simulation…' : 'Lancer la simulation'}
        </button>
      </div>

      {result ? (
        <div className="admin-surface-panel flex min-h-0 flex-col gap-3 rounded-sm p-3">
          {result.winner ? (
            <p className="m-0 rounded-sm border border-amber/40 bg-chrome-3 px-3 py-2 text-center text-sm text-amber">
              {WINNER_LABEL[result.winner]}
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
                {result.round_summaries.map(row => (
                  <tr key={row.round} className="border-b border-rust/30">
                    <td className="px-2 py-1">{row.round}</td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      ATK {row.attacker_attack_pool} / VIE {row.attacker_life_pool}
                    </td>
                    <td className="px-2 py-1 whitespace-nowrap">
                      ATK {row.defender_attack_pool} / VIE {row.defender_life_pool}
                    </td>
                    <td className="px-2 py-1">{formatLosses(row.attacker_losses)}</td>
                    <td className="px-2 py-1">{formatLosses(row.defender_losses)}</td>
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
              {JSON.stringify(result, null, 2)}
            </pre>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
