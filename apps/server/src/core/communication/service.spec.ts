import { CommunicationService } from '#core/communication/service'
import { CommunicationError } from '#core/communication/error'
import { FactionCode } from '#core/faction/constant/code'
import { PlayerEntity } from '#core/player/entity'

describe('CommunicationService', () => {
  describe('normalizeMailSubject', () => {
    it('trims the subject', () => {
      expect(CommunicationService.normalizeMailSubject('  Salut  ')).toBe('Salut')
    })

    it.each([
      '',
      '   ',
      'x'.repeat(121),
      undefined,
      42
    ])('rejects %p', (subject) => {
      expect(() => CommunicationService.normalizeMailSubject(subject)).toThrow(CommunicationError.SUBJECT_INVALID)
    })

    it('accepts 120 characters after trimming', () => {
      expect(CommunicationService.normalizeMailSubject(` ${'x'.repeat(120)} `)).toHaveLength(120)
    })
  })

  describe('normalizeMailBody', () => {
    it('keeps line breaks', () => {
      expect(CommunicationService.normalizeMailBody('a\n\nb')).toBe('a\n\nb')
    })

    it.each([
      '',
      '  \n ',
      'x'.repeat(5001),
      null
    ])('rejects %p', (body) => {
      expect(() => CommunicationService.normalizeMailBody(body)).toThrow(CommunicationError.BODY_INVALID)
    })

    it('accepts 5000 characters', () => {
      expect(CommunicationService.normalizeMailBody('x'.repeat(5000))).toHaveLength(5000)
    })
  })

  describe('normalizeChatBody', () => {
    it('trims and accepts 500 characters', () => {
      expect(CommunicationService.normalizeChatBody(` ${'x'.repeat(500)} `)).toHaveLength(500)
    })

    it.each([
      '',
      '   ',
      'x'.repeat(501)
    ])('rejects %p', (body) => {
      expect(() => CommunicationService.normalizeChatBody(body)).toThrow(CommunicationError.BODY_INVALID)
    })
  })

  describe('normalizeAbuseReason', () => {
    it('returns null when absent or blank', () => {
      expect(CommunicationService.normalizeAbuseReason(undefined)).toBeNull()
      expect(CommunicationService.normalizeAbuseReason('  ')).toBeNull()
    })

    it('accepts 500 characters and rejects 501', () => {
      expect(CommunicationService.normalizeAbuseReason('x'.repeat(500))).toHaveLength(500)
      expect(() => CommunicationService.normalizeAbuseReason('x'.repeat(501))).toThrow(CommunicationError.REASON_INVALID)
    })
  })

  describe('assertMailRecipient', () => {
    const sender = PlayerEntity.initPlayer({
      name: 'sender',
      faction_code: FactionCode.THE_CONFEDERATION
    })

    it('rejects the sender', () => {
      expect(() => CommunicationService.assertMailRecipient({
        sender_id: sender.id,
        recipient: sender
      })).toThrow(CommunicationError.RECIPIENT_IS_SELF)
    })

    it('rejects a system-controlled player', () => {
      const system = PlayerEntity.initPlayer({
        name: 'system',
        faction_code: FactionCode.THE_ASH_LITURGY,
        system_controlled: true
      })
      expect(() => CommunicationService.assertMailRecipient({
        sender_id: sender.id,
        recipient: system
      })).toThrow(CommunicationError.RECIPIENT_SYSTEM)
    })

    it('accepts a human of any faction', () => {
      const other = PlayerEntity.initPlayer({
        name: 'other',
        faction_code: FactionCode.THE_TECHNOLOGICAL_SINGULARITY
      })
      expect(() => CommunicationService.assertMailRecipient({
        sender_id: sender.id,
        recipient: other
      })).not.toThrow()
    })
  })

  describe('canAccessChannel', () => {
    const player = {
      faction_code: FactionCode.THE_CONFEDERATION,
      system_controlled: false
    }

    it('lets every human read global', () => {
      expect(CommunicationService.canAccessChannel({
        player,
        channel_key: 'global'
      })).toBe(true)
    })

    it('limits a faction channel to its members', () => {
      expect(CommunicationService.canAccessChannel({
        player,
        channel_key: `faction:${FactionCode.THE_CONFEDERATION}`
      })).toBe(true)
      expect(CommunicationService.canAccessChannel({
        player,
        channel_key: `faction:${FactionCode.THE_ASH_LITURGY}`
      })).toBe(false)
    })

    it('never lets a system-controlled player in', () => {
      expect(CommunicationService.canAccessChannel({
        player: {
          ...player,
          system_controlled: true
        },
        channel_key: 'global'
      })).toBe(false)
    })
  })

  describe('channelFactionCode', () => {
    it('reads the faction of a faction key', () => {
      expect(CommunicationService.channelFactionCode(`faction:${FactionCode.THE_ASH_LITURGY}`)).toBe(FactionCode.THE_ASH_LITURGY)
      expect(CommunicationService.channelFactionCode('global')).toBeNull()
    })
  })
})
