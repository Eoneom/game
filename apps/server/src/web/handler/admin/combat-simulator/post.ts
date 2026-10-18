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
  AdminCombatSimulatorStackWire,
} from '@eoneom/api-client/src/endpoints/admin/combat-simulator'
import { simulateCombat } from '#command/combat/simulate'
import { BattleStack } from '#core/combat/type/battle-stack'
import { BattleWinner } from '#core/combat/value/battle-winner'
import { CombatStrategy } from '#core/combat/value/combat-strategy'
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

function toWireStacks(stacks: BattleStack[]): AdminCombatSimulatorStackWire[] {
  return stacks.map(s => ({
    troop_code: s.code,
    count: s.count,
  }))
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

  try {
    const result = simulateCombat({
      attacker_stacks: attacker_parsed.stacks,
      defender_stacks: defender_parsed.stacks,
      attacker_strategy: attacker_strategy_parsed.strategy,
      defender_strategy: defender_strategy_parsed.strategy,
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
