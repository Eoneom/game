import { RequestError } from '@eoneom/api-client'
import {
  NextFunction,
  Request,
  Response,
} from 'express'
import {
  AdminCombatSimulatorDataResponse,
  AdminCombatSimulatorRequest,
  AdminCombatSimulatorResponse,
  AdminCombatSimulatorResultStackWire,
} from '@eoneom/api-client/src/endpoints/admin/combat-simulator'
import { simulateCombat } from '#command/combat/simulate'
import {
  BattleStack,
  CombatModifiers,
  isDefenseStack
} from '#core/combat/type/battle-stack'
import {
  parseCityPlasma,
  parseDefenseStacks
} from '#web/handler/admin/combat-simulator/parse-defenses'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
import { TechnologyService } from '#core/technology/service'
import { TroopCode } from '#core/troop/constant/code'

const TROOP_CODE_VALUES = new Set<string>(Object.values(TroopCode))
const COMBAT_STRATEGY_VALUES = new Set<string>(Object.values(CombatStrategy))
function parseStacks(
  raw: unknown,
): { ok: true; stacks: BattleStack[] } | { ok: false; error_code: RequestError } {
  if (!Array.isArray(raw)) {
    return { ok: false, error_code: RequestError.TROOPS_NOT_FOUND }
  }

  const stacks: BattleStack[] = []
  const seen_troop_codes = new Set<string>()

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error_code: RequestError.TROOPS_NOT_FOUND }
    }
    const troop_code = (entry as { troop_code?: unknown }).troop_code
    const count = (entry as { count?: unknown }).count

    if (typeof troop_code !== 'string' || !TROOP_CODE_VALUES.has(troop_code)) {
      return { ok: false, error_code: RequestError.TROOP_CODE_NOT_FOUND }
    }
    if (seen_troop_codes.has(troop_code)) {
      return { ok: false, error_code: RequestError.TROOP_CODE_DUPLICATE }
    }
    seen_troop_codes.add(troop_code)
    if (
      typeof count !== 'number'
      || !Number.isInteger(count)
      || count < 0
    ) {
      return { ok: false, error_code: RequestError.COUNT_NOT_FOUND }
    }

    stacks.push({
      code: troop_code as TroopCode,
      count,
    })
  }

  return { ok: true, stacks }
}

function parseStrategy(
  raw: unknown,
): { ok: true; strategy: CombatStrategy } | { ok: false; error_code: RequestError } {
  if (typeof raw !== 'string' || !COMBAT_STRATEGY_VALUES.has(raw)) {
    return { ok: false, error_code: RequestError.COMBAT_STRATEGY_NOT_FOUND }
  }
  return { ok: true, strategy: raw as CombatStrategy }
}

function parseTechnologyLevel(raw: unknown): number | null {
  if (raw === undefined) {
    return 0
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
    return null
  }
  return raw
}

function parseCombatModifiers(raw: unknown): { ok: true; modifiers: CombatModifiers } | { ok: false; error_code: RequestError } {
  if (raw === undefined || raw === null) {
    return {
      ok: true,
      modifiers: TechnologyService.getCombatModifiers({
        ballistic_alloys_level: 0,
        organic_plating_level: 0,
      }),
    }
  }
  if (typeof raw !== 'object') {
    return {
      ok: false,
      error_code: RequestError.TECHNOLOGY_LEVEL_NOT_FOUND
    }
  }
  const ballistic_alloys_level = parseTechnologyLevel((raw as { ballistic_alloys?: unknown }).ballistic_alloys)
  const organic_plating_level = parseTechnologyLevel((raw as { organic_plating?: unknown }).organic_plating)
  const fortification_level = parseTechnologyLevel((raw as { fortification?: unknown }).fortification)
  if (ballistic_alloys_level === null || organic_plating_level === null || fortification_level === null) {
    return {
      ok: false,
      error_code: RequestError.TECHNOLOGY_LEVEL_NOT_FOUND
    }
  }
  const modifiers = TechnologyService.getCombatModifiers({
    ballistic_alloys_level,
    organic_plating_level,
  })
  return {
    ok: true,
    modifiers: fortification_level > 0
      ? {
        ...modifiers,
        fortification: TechnologyService.getFortificationMultiplier({ fortification_level }),
      }
      : modifiers,
  }
}

function toWireStacks(stacks: BattleStack[]): AdminCombatSimulatorResultStackWire[] {
  return stacks.map(s => isDefenseStack(s)
    ? {
      defense_code: s.code,
      count: s.count,
    }
    : {
      troop_code: s.code,
      count: s.count,
    })
}

function winnerWire(winner: BattleWinner | null): AdminCombatSimulatorDataResponse['winner'] {
  if (winner === null) {
    return null
  }
  return winner
}

export const adminCombatSimulatorPostHandler = async (
  req: Request<AdminCombatSimulatorRequest>,
  res: Response<AdminCombatSimulatorResponse>,
  next: NextFunction,
) => {
  const attacker_parsed = parseStacks(req.body.attacker_stacks)
  if (!attacker_parsed.ok) {
    return res.status(400).json({
      status: 'nok',
      error_code: attacker_parsed.error_code,
    })
  }

  const defender_parsed = parseStacks(req.body.defender_stacks)
  if (!defender_parsed.ok) {
    return res.status(400).json({
      status: 'nok',
      error_code: defender_parsed.error_code,
    })
  }

  const defender_defenses_parsed = parseDefenseStacks(req.body.defender_defense_stacks)
  if (!defender_defenses_parsed.ok) {
    return res.status(400).json({
      status: 'nok',
      error_code: defender_defenses_parsed.error_code,
    })
  }

  const city_plasma_parsed = parseCityPlasma(req.body.defender_city_plasma)
  if (!city_plasma_parsed.ok) {
    return res.status(400).json({
      status: 'nok',
      error_code: city_plasma_parsed.error_code,
    })
  }

  const attacker_strategy_parsed = parseStrategy(req.body.attacker_strategy)
  if (!attacker_strategy_parsed.ok) {
    return res.status(400).json({
      status: 'nok',
      error_code: attacker_strategy_parsed.error_code,
    })
  }

  const defender_strategy_parsed = parseStrategy(req.body.defender_strategy)
  if (!defender_strategy_parsed.ok) {
    return res.status(400).json({
      status: 'nok',
      error_code: defender_strategy_parsed.error_code,
    })
  }

  const attacker_modifiers_parsed = parseCombatModifiers(req.body.attacker_technology_levels)
  if (!attacker_modifiers_parsed.ok) {
    return res.status(400).json({
      status: 'nok',
      error_code: attacker_modifiers_parsed.error_code,
    })
  }

  const defender_modifiers_parsed = parseCombatModifiers(req.body.defender_technology_levels)
  if (!defender_modifiers_parsed.ok) {
    return res.status(400).json({
      status: 'nok',
      error_code: defender_modifiers_parsed.error_code,
    })
  }

  try {
    const result = simulateCombat({
      attacker_stacks: attacker_parsed.stacks,
      defender_stacks: [
        ...defender_parsed.stacks,
        ...defender_defenses_parsed.stacks,
      ],
      attacker_strategy: attacker_strategy_parsed.strategy,
      defender_strategy: defender_strategy_parsed.strategy,
      attacker_modifiers: attacker_modifiers_parsed.modifiers,
      defender_modifiers: defender_modifiers_parsed.modifiers,
      ...(city_plasma_parsed.plasma !== undefined ? { defender_plasma: city_plasma_parsed.plasma } : {}),
    })

    const data: AdminCombatSimulatorDataResponse = {
      winner: winnerWire(result.winner),
      round_summaries: result.round_summaries.map(summary => ({
        round: summary.round,
        attacker_attack_pool: summary.attacker_attack_pool,
        defender_attack_pool: summary.defender_attack_pool,
        attacker_life_pool: summary.attacker_life_pool,
        defender_life_pool: summary.defender_life_pool,
        attacker_losses: toWireStacks(summary.attacker_losses),
        defender_losses: toWireStacks(summary.defender_losses),
        ...(summary.defender_plasma_spent !== undefined ? { defender_plasma_spent: summary.defender_plasma_spent } : {}),
        ...(summary.shield_reduction !== undefined ? { shield_reduction: summary.shield_reduction } : {}),
        ...(summary.spore_reduction !== undefined ? { spore_reduction: summary.spore_reduction } : {}),
        ...(summary.barbed_wire_reduction !== undefined ? { barbed_wire_reduction: summary.barbed_wire_reduction } : {}),
        ...(summary.decoy_absorbed !== undefined ? { decoy_absorbed: summary.decoy_absorbed } : {}),
        ...(summary.railgun_doubled !== undefined ? { railgun_doubled: summary.railgun_doubled } : {}),
      })),
      final_attacker_stacks: toWireStacks(result.final_attacker_stacks),
      final_defender_stacks: toWireStacks(result.final_defender_stacks),
    }

    return res.json({
      status: 'ok',
      data,
    })
  } catch (err) {
    next(err)
  }
}
