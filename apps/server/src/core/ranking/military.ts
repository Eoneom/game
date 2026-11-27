import { defense_characteristics } from '#core/defense/constant/characteristic'
import {
  BattleStack,
  BattleStateJson,
  isDefenseStack
} from '#core/combat/type/battle-stack'
import { RankingService } from '#core/ranking/service'
import { troop_characteristics } from '#core/troop/constant/characteristic'

type MilitaryCredit = {
  player_id: string
  value: number
}

/** Resource value of destroyed troop and defense lines. */
function lostValue(lines: BattleStack[]): number {
  return lines.reduce((sum, line) => {
    if (line.count <= 0) {
      return sum
    }
    return sum + (isDefenseStack(line)
      ? RankingService.defenseValue({
        code: line.code,
        count: line.count
      })
      : RankingService.troopValue({
        code: line.code,
        count: line.count
      }))
  }, 0)
}

/** Raw attack of a stack, before modifiers: troop `attack_capacity × count`, defense `attack × count`. */
function rawAttack(stack: BattleStack): number {
  if (stack.count <= 0) {
    return 0
  }
  return isDefenseStack(stack)
    ? defense_characteristics[stack.code].attack * stack.count
    : troop_characteristics[stack.code].attack_capacity * stack.count
}

/** Owner of a defender stack: reinforcement stacks carry `player_id`, everything else (defenses included) is the host's. */
function defenderOwner(stack: BattleStack, host_player_id: string): string {
  return !isDefenseStack(stack) && stack.player_id ? stack.player_id : host_player_id
}

/**
 * Splits `value` between the host and reinforcement owners in proportion to `attack_by_owner`.
 * Each reinforcement owner gets `floor(value × attack / total)`; the host gets the remainder, so the shares
 * always add up to `value`. With no attack at all (or no reinforcements) the host gets everything.
 */
export function splitDefenderCredit({
  value,
  host_player_id,
  attack_by_owner,
}: {
  value: number
  host_player_id: string
  attack_by_owner: Map<string, number>
}): MilitaryCredit[] {
  const total_attack = [ ...attack_by_owner.values() ].reduce((sum, attack) => sum + attack, 0)
  const credits: MilitaryCredit[] = []
  let distributed = 0

  if (total_attack > 0) {
    for (const [
      player_id,
      attack 
    ] of attack_by_owner) {
      if (player_id === host_player_id) {
        continue
      }
      const share = Math.floor(value * attack / total_attack)
      distributed += share
      credits.push({
        player_id,
        value: share
      })
    }
  }

  return [
    {
      player_id: host_player_id,
      value: value - distributed
    },
    ...credits,
  ]
}

/**
 * Military value earned by each side of a finished battle (slice 034), before excluding system players.
 * - The attacker gains the value of every defender loss: the cumulative loss lines (troops, defenses,
 *   consumed minefields) plus, on an attacker win, the defender stacks still standing, which are destroyed
 *   with the capture (`destroyed_defender_stacks`).
 * - The defender side gains the value of the attacker's losses, split between the host and reinforcement owners
 *   by raw attack in the battle snapshot (survivors + losses = the stacks at battle start).
 * Credits of 0 are dropped.
 */
export function militaryCredits({
  attacker_player_id,
  defender_player_id,
  state_json,
  destroyed_defender_stacks,
}: {
  attacker_player_id: string
  defender_player_id: string
  state_json: BattleStateJson
  destroyed_defender_stacks: BattleStack[]
}): MilitaryCredit[] {
  const attacker_credit: MilitaryCredit = {
    player_id: attacker_player_id,
    value: lostValue([
      ...state_json.cumulative_defender_losses,
      ...destroyed_defender_stacks
    ]),
  }

  const attack_by_owner = new Map<string, number>()
  for (const stack of [
    ...state_json.defender_stacks,
    ...state_json.cumulative_defender_losses 
  ]) {
    const owner = defenderOwner(stack, defender_player_id)
    attack_by_owner.set(owner, (attack_by_owner.get(owner) ?? 0) + rawAttack(stack))
  }

  const defender_credits = splitDefenderCredit({
    value: lostValue(state_json.cumulative_attacker_losses),
    host_player_id: defender_player_id,
    attack_by_owner,
  })

  return [
    attacker_credit,
    ...defender_credits 
  ].filter(credit => credit.value > 0)
}
