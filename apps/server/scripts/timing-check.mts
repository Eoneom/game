import { BuildingCode } from '../src/core/building/constant/code.ts'
import { PricingService } from '../src/core/pricing/service.ts'
import { building_earnings } from '../src/core/building/constant/earnings.ts'
import {
  STARTING_PLASTIC,
  STARTING_MUSHROOM
} from '../src/core/city/constant/index.ts'
import { gameTimeScale } from '../src/shared/game-time-scale.ts'

function earningsPerSecond(
  code: BuildingCode.RECYCLING_PLANT | BuildingCode.MUSHROOM_FARM,
  level: number,
  coefficient: number
): number {
  const { base, multiplier } = building_earnings[code]
  const base_value = Math.pow(multiplier, level - 1) * base
  const per_game_second = Math.round(base_value * coefficient * 100) / 100
  return Math.round(per_game_second * gameTimeScale * 100) / 100
}

const coeff = {
  plastic: 1,
  mushroom: 1,
  plasma: 0
}
const GATHER_S = 5

function cost(code: BuildingCode, level: number) {
  return PricingService.getBuildingLevelCost({
    code,
    level,
    architecture_level: 0
  })
}

function timeToAfford(
  stock: { plastic: number; mushroom: number },
  eps: { plastic: number; mushroom: number },
  need: { plastic: number; mushroom: number }
): number {
  let s = { ...stock }
  let time = 0
  while (time <= 7200) {
    if (s.plastic >= need.plastic && s.mushroom >= need.mushroom) {
      return time
    }
    s.plastic += eps.plastic * GATHER_S
    s.mushroom += eps.mushroom * GATHER_S
    time += GATHER_S
  }
  return -1
}

for (const code of [
  BuildingCode.RECYCLING_PLANT,
  BuildingCode.MUSHROOM_FARM,
  BuildingCode.PLASTIC_WAREHOUSE,
  BuildingCode.SOLAR_PANEL
]) {
  const c = cost(code, 1)
  console.log(
    code,
    'L1',
    c.resource,
    'dur',
    c.duration
  )
}

const r1 = cost(BuildingCode.RECYCLING_PLANT, 1)
let t = r1.duration
let stock = {
  plastic: STARTING_PLASTIC - r1.resource.plastic,
  mushroom: STARTING_MUSHROOM - r1.resource.mushroom
}
const epsAfterR1 = {
  plastic: earningsPerSecond(BuildingCode.RECYCLING_PLANT, 1, coeff.plastic),
  mushroom: 0
}
const f1 = cost(BuildingCode.MUSHROOM_FARM, 1)
const wait = timeToAfford(stock, epsAfterR1, f1.resource)
console.log('recycling L1 total', t, 'then farm L1 wait', wait, 'farm dur', f1.duration, 'grand', t + wait + f1.duration)
