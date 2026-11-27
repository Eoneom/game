import React, { useEffect, useMemo, useState } from 'react'

import {
  AdminCombatSimulatorDataResponse,
  AdminCombatSimulatorResultStackWire,
  AdminCombatSimulatorRoundSummaryWire,
  AdminCombatSimulatorTechnologyLevelsWire,
  CombatStrategy,
  DefenseCode,
  FactionCode,
  TechnologyCode,
  TroopCode,
} from '@eoneom/api-client'
import { DefenseTranslations } from '#defense/translations'
import { defenseImageSrc } from '#defense/image'
import { AdminRouteGate } from '#admin/session'
import { CombatStrategyLabels } from '#movement/translations'
import { TechnologyTranslations } from '#technology/translations'
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
  combatSimulatorCountOptions,
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

/** Avoid `field-input` `w-full` — it breaks flex row proportions for unit vs count. */
const stackSelectClass =
  'm-0 min-h-9 rounded-sm border border-rust/60 bg-chrome px-2 py-1 font-mono text-sm leading-tight text-amber shadow-[inset_0_1px_0_rgba(232,197,71,0.08)] outline-none focus:border-amber focus:ring-1 focus:ring-amber/35'

type StackEditorProps = {
  title: string
  faction: CombatSimulatorFaction
  onFactionChange: (faction: CombatSimulatorFaction) => void
  stacks: CombatSimulatorStackRow[]
  onChange: (stacks: CombatSimulatorStackRow[]) => void
}

const lossVisual = (loss: AdminCombatSimulatorResultStackWire): { key: string, src: string, name: string } =>
  'defense_code' in loss
    ? {
      key: loss.defense_code,
      src: defenseImageSrc(loss.defense_code),
      name: DefenseTranslations[loss.defense_code].name,
    }
    : {
      key: loss.troop_code,
      src: troopImageSrc(loss.troop_code),
      name: TroopTranslations[loss.troop_code].name,
    }

const TroopLossList: React.FC<{
  losses: AdminCombatSimulatorResultStackWire[]
  compact?: boolean
}> = ({ losses, compact = false }) => {
  if (losses.length === 0) {
    return <span>—</span>
  }

  return (
    <ul
      className={
        compact
          ? 'm-0 flex list-none flex-wrap gap-1 p-0'
          : 'm-0 flex list-none flex-col gap-1 p-0'
      }
    >
      {losses.map(loss => {
        const visual = lossVisual(loss)
        return (
          <li key={visual.key} className="flex items-center gap-1">
            <img
              src={visual.src}
              alt={visual.name}
              className="h-6 w-6 shrink-0 rounded-sm border border-rust/50 object-cover"
              loading="lazy"
              decoding="async"
            />
            <span className="text-[11px] leading-tight">
              {compact ? (
                <span className="text-amber-dim">×{loss.count}</span>
              ) : (
                <>
                  {visual.name}
                  <span className="text-amber-dim"> ×{loss.count}</span>
                </>
              )}
            </span>
          </li>
        )
      })}
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
          const count_options = combatSimulatorCountOptions(count)
          return (
            <div key={index} className="flex items-stretch gap-2">
              <EntityThumb
                size="xl"
                src={troopImageSrc(row.troop_code)}
                alt={troop_name}
                className="shrink-0"
              />
              <div className="flex min-h-20 min-w-0 flex-1 flex-col justify-between gap-1">
                <div
                  className="grid h-9 flex-none grid-cols-[minmax(0,1fr)_3.25rem_auto] items-stretch gap-2"
                >
                  <select
                    className={`${stackSelectClass} min-w-0`}
                    value={row.troop_code}
                    onChange={e => updateRow(index, { troop_code: e.target.value as TroopCode })}
                  >
                    {row_codes.map(code => (
                      <option key={code} value={code}>
                        {TroopTranslations[code].name}
                      </option>
                    ))}
                  </select>
                  <select
                    className={`${stackSelectClass} w-[3.25rem] shrink-0 px-1 text-center tabular-nums`}
                    value={count}
                    onChange={e => updateRow(index, { count: Number.parseInt(e.target.value, 10) })}
                  >
                    {count_options.map(value => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="h-9 shrink-0 rounded-sm border border-rust/50 px-2 text-xs text-amber-dim hover:border-danger hover:text-amber disabled:opacity-50"
                    onClick={() => removeRow(index)}
                    disabled={stacks.length <= 1}
                  >
                    Retirer
                  </button>
                </div>
                <p className="m-0 flex min-h-0 flex-1 items-center text-[11px] leading-tight text-amber-dim">
                  Unité — ATK {per_unit.attack} / DEF {per_unit.defense} / VIE {per_unit.life}
                  {' · '}
                  Ligne — ATK {per_unit.attack * count} / DEF {per_unit.defense * count} / VIE{' '}
                  {per_unit.life * count}
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

type SimulatorTechnologyLevels = Required<AdminCombatSimulatorTechnologyLevelsWire>

const DEFAULT_TECHNOLOGY_LEVELS: SimulatorTechnologyLevels = {
  ballistic_alloys: 0,
  organic_plating: 0,
  fortification: 0,
}

type SimulatorTechnologyCode = TechnologyCode.BALLISTIC_ALLOYS | TechnologyCode.ORGANIC_PLATING | TechnologyCode.FORTIFICATION

const ATTACKER_TECHNOLOGY_CODES: SimulatorTechnologyCode[] = [
  TechnologyCode.BALLISTIC_ALLOYS,
  TechnologyCode.ORGANIC_PLATING,
]

/** Fortification only scales the defender's city defenses (slice 029). */
const DEFENDER_TECHNOLOGY_CODES: SimulatorTechnologyCode[] = [
  ...ATTACKER_TECHNOLOGY_CODES,
  TechnologyCode.FORTIFICATION,
]

type DefenseCounts = Record<DefenseCode, number>

const DEFAULT_DEFENSE_COUNTS = Object.fromEntries(
  Object.values(DefenseCode).map(code => [ code, 0 ])
) as DefenseCounts

/** Defender city defenses: a count per type, 0 = none. */
const DefenseStackEditor: React.FC<{
  counts: DefenseCounts
  onChange: (counts: DefenseCounts) => void
  city_plasma: string
  onCityPlasmaChange: (value: string) => void
}> = ({ counts, onChange, city_plasma, onCityPlasmaChange }) => (
  <section className="admin-surface-panel mt-3 flex flex-col gap-2 rounded-sm p-3">
    <h2 className="m-0 text-sm font-normal text-amber">Défenses du défenseur (ville)</h2>
    <div className="flex flex-wrap items-end gap-3">
      {Object.values(DefenseCode).map(code => (
        <label key={code} className="flex items-center gap-2 text-sm">
          <img
            src={defenseImageSrc(code)}
            alt=""
            className="h-8 w-8 shrink-0 rounded-sm border border-rust/50 object-cover"
          />
          <span className="flex flex-col gap-1">
            <span className="field-label text-label">{DefenseTranslations[code].name}</span>
            <input
              type="number"
              min={0}
              step={1}
              className="field-input w-24 py-1 text-sm"
              value={counts[code]}
              onChange={e => onChange({ ...counts, [code]: parseTechnologyLevel(e.target.value) })}
            />
          </span>
        </label>
      ))}
      <label className="flex flex-col gap-1 text-sm">
        <span className="field-label text-label">Plasma de la ville (vide = illimité)</span>
        <input
          type="number"
          min={0}
          step={1}
          className="field-input w-32 py-1 text-sm"
          value={city_plasma}
          onChange={e => onCityPlasmaChange(e.target.value)}
        />
      </label>
    </div>
  </section>
)

const parseTechnologyLevel = (raw: string): number => {
  const value = Number.parseInt(raw, 10)
  return Number.isNaN(value) || value < 0 ? 0 : value
}

const TechnologyLevelInputs: React.FC<{
  side: string
  codes: SimulatorTechnologyCode[]
  levels: SimulatorTechnologyLevels
  onChange: (levels: SimulatorTechnologyLevels) => void
}> = ({ side, codes, levels, onChange }) => (
  <>
    {codes.map(code => (
      <label key={code} className="flex flex-col gap-1 text-sm">
        <span className="field-label text-label">
          {TechnologyTranslations[code].name} ({side})
        </span>
        <input
          type="number"
          min={0}
          step={1}
          className="field-input w-24 py-1 text-sm"
          value={levels[code]}
          onChange={e => onChange({ ...levels, [code]: parseTechnologyLevel(e.target.value) })}
        />
      </label>
    ))}
  </>
)

const RoundResultCard: React.FC<{ row: AdminCombatSimulatorRoundSummaryWire }> = ({ row }) => (
  <article className="admin-surface-nested flex min-w-0 flex-col gap-1 rounded-sm p-2 text-[11px] text-amber-dim">
    <h3 className="m-0 text-xs font-normal text-amber">Round {row.round}</h3>
    <p className="m-0 leading-tight">
      Att. ATK {row.attacker_attack_pool} / VIE {row.attacker_life_pool}
    </p>
    <p className="m-0 leading-tight">
      Déf. ATK {row.defender_attack_pool} / VIE {row.defender_life_pool}
    </p>
    {(row.defender_plasma_spent ?? 0) > 0 || (row.shield_reduction ?? 0) > 0 ? (
      <p className="m-0 leading-tight">
        Plasma {row.defender_plasma_spent ?? 0} · Bouclier -{Math.round((row.shield_reduction ?? 0) * 100)} %
      </p>
    ) : null}
    <div>
      <p className="m-0 mb-0.5 text-[10px] uppercase tracking-wide text-amber-dim">Pertes att.</p>
      <TroopLossList losses={row.attacker_losses} compact />
    </div>
    <div>
      <p className="m-0 mb-0.5 text-[10px] uppercase tracking-wide text-amber-dim">Pertes déf.</p>
      <TroopLossList losses={row.defender_losses} compact />
    </div>
  </article>
)

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
  const [ attacker_technology_levels, setAttackerTechnologyLevels ] =
    useState<SimulatorTechnologyLevels>(DEFAULT_TECHNOLOGY_LEVELS)
  const [ defender_technology_levels, setDefenderTechnologyLevels ] =
    useState<SimulatorTechnologyLevels>(DEFAULT_TECHNOLOGY_LEVELS)
  const [ defender_defense_counts, setDefenderDefenseCounts ] =
    useState<DefenseCounts>(DEFAULT_DEFENSE_COUNTS)
  const [ defender_city_plasma, setDefenderCityPlasma ] = useState('')
  const [ show_json, setShowJson ] = useState(false)

  const can_submit = useMemo(
    () => attacker_stacks.length > 0 && defender_stacks.length > 0,
    [ attacker_stacks.length, defender_stacks.length ],
  )

  useEffect(() => {
    if (!is_admin || !can_submit) {
      return
    }

    const city_plasma = Number.parseInt(defender_city_plasma, 10)
    const timer = window.setTimeout(() => {
      runSimulation({
        attacker_stacks,
        defender_stacks,
        defender_defense_stacks: Object.values(DefenseCode)
          .filter(code => defender_defense_counts[code] > 0)
          .map(code => ({ defense_code: code, count: defender_defense_counts[code] })),
        attacker_strategy,
        defender_strategy,
        attacker_technology_levels: {
          ballistic_alloys: attacker_technology_levels.ballistic_alloys,
          organic_plating: attacker_technology_levels.organic_plating,
        },
        defender_technology_levels,
        ...(Number.isNaN(city_plasma) || city_plasma < 0 ? {} : { defender_city_plasma: city_plasma }),
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
    attacker_technology_levels,
    defender_technology_levels,
    defender_defense_counts,
    defender_city_plasma,
    runSimulation,
  ])

  const display_result = result

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <header className="admin-surface-toolbar mb-3 shrink-0 space-y-1">
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

        <div className="admin-surface-toolbar mt-3 flex flex-wrap items-end gap-4">
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

        <div className="admin-surface-toolbar mt-3 flex flex-wrap items-end gap-4">
          <TechnologyLevelInputs
            side="att."
            codes={ATTACKER_TECHNOLOGY_CODES}
            levels={attacker_technology_levels}
            onChange={setAttackerTechnologyLevels}
          />
          <TechnologyLevelInputs
            side="déf."
            codes={DEFENDER_TECHNOLOGY_CODES}
            levels={defender_technology_levels}
            onChange={setDefenderTechnologyLevels}
          />
        </div>

        <DefenseStackEditor
          counts={defender_defense_counts}
          onChange={setDefenderDefenseCounts}
          city_plasma={defender_city_plasma}
          onCityPlasmaChange={setDefenderCityPlasma}
        />
      </div>

      <div
        className={`admin-surface-panel flex shrink-0 flex-col gap-2 rounded-sm p-3 transition-opacity ${sim_pending ? 'opacity-80' : ''}`}
      >
        {sim_pending ? (
          <p className="m-0 text-center text-xs text-amber-dim">Mise à jour de la simulation…</p>
        ) : null}

        {display_result ? (
          <>
            {display_result.winner ? (
              <p className="m-0 rounded-sm border border-amber/40 bg-chrome-3 px-3 py-1.5 text-center text-sm text-amber">
                {WINNER_LABEL[display_result.winner]}
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {display_result.round_summaries.map(row => (
                <RoundResultCard key={row.round} row={row} />
              ))}
            </div>

            <button
              type="button"
              className="self-start text-xs text-amber-dim underline hover:text-amber"
              onClick={() => setShowJson(v => !v)}
            >
              {show_json ? 'Masquer le JSON' : 'Afficher le JSON'}
            </button>
            {show_json ? (
              <pre className="admin-surface-code max-h-40 overflow-y-auto whitespace-pre-wrap break-all rounded-sm p-2 text-[11px]">
                {JSON.stringify(display_result, null, 2)}
              </pre>
            ) : null}
          </>
        ) : (
          <p className="m-0 text-center text-sm text-amber-dim">
            Résultats des 5 rounds affichés ici après la première simulation.
          </p>
        )}
      </div>
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
