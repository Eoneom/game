import assert from 'assert'
import { AdminAccessService } from './service'
import { parseAdminPlayerNames } from './parse-allowlist'

describe('AdminAccessService', () => {
  it('returns false when allowlist is empty', () => {
    assert.strictEqual(AdminAccessService.isAllowlistedPlayerName({
      player_name: 'Valentin',
      allowlist: [],
    }), false)
  })

  it('matches commander name exactly', () => {
    assert.strictEqual(AdminAccessService.isAllowlistedPlayerName({
      player_name: 'Valentin',
      allowlist: [ 'Valentin', 'Ops' ],
    }), true)
    assert.strictEqual(AdminAccessService.isAllowlistedPlayerName({
      player_name: 'valentin',
      allowlist: [ 'Valentin' ],
    }), false)
  })
})

describe('parseAdminPlayerNames', () => {
  it('parses comma-separated trimmed names', () => {
    assert.deepStrictEqual(
      parseAdminPlayerNames(' Valentin , Ops,'),
      [ 'Valentin', 'Ops' ]
    )
  })

  it('returns empty for missing env', () => {
    assert.deepStrictEqual(parseAdminPlayerNames(undefined), [])
    assert.deepStrictEqual(parseAdminPlayerNames('   '), [])
  })
})
