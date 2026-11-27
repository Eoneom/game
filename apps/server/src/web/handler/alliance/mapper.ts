import { AllianceDetails } from '@eoneom/api-client/src/endpoints/alliance/shared'
import { AllianceEntity } from '#core/alliance/entity'

export const allianceDetailsMapper = (alliance: AllianceEntity): AllianceDetails => ({
  id: alliance.id,
  name: alliance.name,
  tag: alliance.tag,
  description: alliance.description,
  faction_code: alliance.faction_code,
  created_at: alliance.created_at,
})
