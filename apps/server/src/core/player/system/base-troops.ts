import { FactionCode } from '#core/faction/constant/code'
import { CombatRole } from '#core/troop/constant/combat-role'
import { TroopRole } from '#core/troop/constant/role'
import { TroopEntity } from '#core/troop/entity'
import { TroopService } from '#core/troop/service'
import type { TroopCount } from '#core/troop/type'

function idleTroops(troops: TroopEntity[]): TroopEntity[] {
  return troops.filter(troop => troop.count > 0 && troop.movement_id === null)
}

function sortByFactionRoster({
  troops,
  faction,
}: {
  troops: TroopEntity[]
  faction: FactionCode
}): TroopEntity[] {
  const faction_order = TroopService.codesForFaction(faction)
  const order_index = new Map(
    faction_order.map((code, index) => [ code, index ]),
  )
  return [ ...troops ].sort((left, right) => {
    const left_index = order_index.get(left.code) ?? Number.MAX_SAFE_INTEGER
    const right_index = order_index.get(right.code) ?? Number.MAX_SAFE_INTEGER
    if (left_index !== right_index) {
      return left_index - right_index
    }
    return left.code.localeCompare(right.code)
  })
}

/** Picks a single stack for a system `base` movement (count 1). */
export function selectTroopsForSystemBase({
  troops,
  faction,
}: {
  troops: TroopEntity[]
  faction: FactionCode
}): TroopCount[] | null {
  const idle = idleTroops(troops)
  if (idle.length === 0) {
    return null
  }

  const founder = TroopService.findByRole({
    troops: idle,
    role: TroopRole.FOUNDER,
  })
  if (founder) {
    return [
      {
        code: founder.code,
        count: 1,
      },
    ]
  }

  const combat = sortByFactionRoster({
    troops: idle.filter(
      troop => TroopService.combatRoleFor(troop.code) === CombatRole.COMBAT,
    ),
    faction,
  })
  if (combat[0]) {
    return [
      {
        code: combat[0].code,
        count: 1,
      },
    ]
  }

  const fallback = sortByFactionRoster({
    troops: idle,
    faction,
  })
  return [
    {
      code: fallback[0].code,
      count: 1,
    },
  ]
}
