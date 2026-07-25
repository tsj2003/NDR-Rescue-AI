import { describe, expect, it } from 'vitest'
import { sendRecoveryFollowup } from '../lib/notifications'

describe('sendRecoveryFollowup', () => {
  it('skips provider sends when Twilio credentials are absent', async () => {
    const previousSid = process.env.TWILIO_ACCOUNT_SID
    const previousToken = process.env.TWILIO_AUTH_TOKEN
    const previousChannels = process.env.FOLLOWUP_CHANNELS
    const previousDatabaseUrl = process.env.DATABASE_URL

    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test'
    delete process.env.TWILIO_ACCOUNT_SID
    delete process.env.TWILIO_AUTH_TOKEN
    process.env.FOLLOWUP_CHANNELS = 'sms,whatsapp'

    const results = await sendRecoveryFollowup({
      customerName: 'Priya',
      trackingNumber: 'TRK10001',
      customerPhone: '+919876543210',
      recoveryLink: 'https://example.com/recovery/token',
    })

    expect(results).toEqual([
      expect.objectContaining({ channel: 'sms', status: 'skipped', provider: 'twilio' }),
      expect.objectContaining({ channel: 'whatsapp', status: 'skipped', provider: 'twilio' }),
    ])

    process.env.TWILIO_ACCOUNT_SID = previousSid
    process.env.TWILIO_AUTH_TOKEN = previousToken
    process.env.FOLLOWUP_CHANNELS = previousChannels
    process.env.DATABASE_URL = previousDatabaseUrl
  })
})
