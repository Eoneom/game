import { AllianceRole } from '@eoneom/api-client'
import { describe, expect, it } from 'vitest'

import { allianceDisplayName, canKick, canManageMembers } from './translations'

describe('alliance translations', () => {
  it('prefixes names with the alliance tag', () => {
    expect(allianceDisplayName('Alice', 'ABC')).toBe('[ABC] Alice')
    expect(allianceDisplayName('Alice', null)).toBe('Alice')
  })

  it('lets officers and the chef manage members', () => {
    expect(canManageMembers(AllianceRole.CHEF)).toBe(true)
    expect(canManageMembers(AllianceRole.OFFICIER)).toBe(true)
    expect(canManageMembers(AllianceRole.MEMBRE)).toBe(false)
  })

  it('follows the kick matrix', () => {
    expect(canKick({ viewer: AllianceRole.CHEF, target: AllianceRole.OFFICIER })).toBe(true)
    expect(canKick({ viewer: AllianceRole.CHEF, target: AllianceRole.CHEF })).toBe(false)
    expect(canKick({ viewer: AllianceRole.OFFICIER, target: AllianceRole.MEMBRE })).toBe(true)
    expect(canKick({ viewer: AllianceRole.OFFICIER, target: AllianceRole.OFFICIER })).toBe(false)
    expect(canKick({ viewer: AllianceRole.MEMBRE, target: AllianceRole.MEMBRE })).toBe(false)
  })
})
