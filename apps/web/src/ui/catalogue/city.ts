import { City } from '#types'
import { CatalogueCityResources, CatalogueResources } from '#ui/catalogue/state'

/** Stock of the city for the red cost chips. */
export const catalogueStock = (city: City | undefined): Required<CatalogueResources> | undefined => city
  ? { plastic: city.plastic, mushroom: city.mushroom, plasma: city.plasma, water: city.water }
  : undefined

/** Stock, rates and warehouses of `GET /city/:city_id` for `catalogueCardState`. */
export const catalogueCityResources = (city: City | undefined): CatalogueCityResources | undefined => city
  ? {
    stock: { plastic: city.plastic, mushroom: city.mushroom, plasma: city.plasma, water: city.water },
    earnings_per_second: city.earnings_per_second,
    warehouses_capacity: city.warehouses_capacity,
  }
  : undefined
