import { Factory } from '#adapter/factory'
import { runCommand } from '#command/run'
import { bootstrapPlayer } from '#command/player/bootstrap'
import { AppService } from '#app/service'
import { CityListQuery } from '#query/city/list'
import { CityGetQuery } from '#query/city/get'
import {
  HARROW_FIRST_CITY_NAME,
  nextSystemCityNameForPrefix,
  SYSTEM_EMPIRE_BOOTSTRAP_ORDER,
  SYSTEM_FIRST_CITY_NAME,
  SYSTEM_ASH_LITURGY_MIN_DISTANCE_FROM_ALPHA,
  type SystemEmpireBootstrapConfig,
} from '#core/player/constant/system'
import { Coordinates } from '#core/world/value/coordinates'

export interface EnsureSystemPlayerResult {
  player_id: string
  created: boolean
}

export interface EnsureSystemPlayersResult {
  empires: EnsureSystemPlayerResult[]
}

async function alphaCapitalCoordinates(): Promise<Coordinates | null> {
  const config = SYSTEM_EMPIRE_BOOTSTRAP_ORDER[0]
  const repository = Factory.getRepository()
  const exists = await repository.player.exist(config.player_name)
  if (!exists) {
    return null
  }
  const alpha = await repository.player.getByName(config.player_name)
  const { cities } = await new CityListQuery().run({ player_id: alpha.id })
  const main_city = cities[0]
  if (!main_city) {
    return null
  }
  const details = await new CityGetQuery().run({
    city_id: main_city.id,
    player_id: alpha.id,
  })
  return details.cell.coordinates
}

async function resolveFirstCityCell(
  config: SystemEmpireBootstrapConfig,
): Promise<Awaited<ReturnType<typeof AppService.selectCityFirstCell>>> {
  if (config.spawn === 'min_distance_from_alpha') {
    const alpha_capital = await alphaCapitalCoordinates()
    if (!alpha_capital) {
      throw new Error('system:alpha-capital-missing-for-harrow-spawn')
    }
    return AppService.selectCityFirstCell({
      min_manhattan_distance_from: [
        {
          coordinates: alpha_capital,
          distance: SYSTEM_ASH_LITURGY_MIN_DISTANCE_FROM_ALPHA,
        },
      ],
    })
  }
  return AppService.selectCityFirstCell()
}

async function ensureOneSystemEmpire(
  config: SystemEmpireBootstrapConfig,
): Promise<EnsureSystemPlayerResult> {
  const repository = Factory.getRepository()
  const exists = await repository.player.exist(config.player_name)
  if (exists) {
    const player = await repository.player.getByName(config.player_name)
    return {
      player_id: player.id,
      created: false,
    }
  }

  const first_city_name = config.city_name_prefix === 'Core'
    ? SYSTEM_FIRST_CITY_NAME
    : config.city_name_prefix === 'Cinder'
      ? HARROW_FIRST_CITY_NAME
      : nextSystemCityNameForPrefix(config.city_name_prefix, [])

  const city_first_cell = await resolveFirstCityCell(config)
  const result = await bootstrapPlayer({
    player_name: config.player_name,
    city_name: first_city_name,
    faction_code: config.faction_code,
    system_controlled: true,
    city_first_cell,
  })

  return {
    player_id: result.player_id,
    created: true,
  }
}

export async function ensureSystemPlayers(): Promise<EnsureSystemPlayersResult> {
  return runCommand('player:ensure-system', async () => {
    const empires: EnsureSystemPlayerResult[] = []
    for (const config of SYSTEM_EMPIRE_BOOTSTRAP_ORDER) {
      empires.push(await ensureOneSystemEmpire(config))
    }
    return { empires }
  })
}

/** @deprecated Prefer `ensureSystemPlayers` — ensures Alpha only for legacy callers. */
export async function ensureSystemPlayer(): Promise<EnsureSystemPlayerResult> {
  const { empires } = await ensureSystemPlayers()
  const alpha = empires[0]
  if (!alpha) {
    throw new Error('system:alpha-bootstrap-missing')
  }
  return alpha
}
