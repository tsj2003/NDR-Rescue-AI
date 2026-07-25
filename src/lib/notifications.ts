import { getServerEnv } from '@/lib/env'

type FollowupChannel = 'sms' | 'whatsapp'

export type FollowupResult = {
  channel: FollowupChannel
  status: 'sent' | 'skipped' | 'failed'
  provider: 'twilio'
  providerMessageId?: string
  reason?: string
}

function twilioAuthHeader(accountSid: string, authToken: string) {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`
}

function normalizeWhatsappAddress(phone: string) {
  return phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`
}

function followupBody(params: {
  customerName: string
  trackingNumber: string
  recoveryLink: string
}) {
  return `Hi ${params.customerName}, we could not reach you by phone about package ${params.trackingNumber}. Please confirm redelivery here: ${params.recoveryLink}`
}

async function sendTwilioMessage(params: {
  accountSid: string
  authToken: string
  to: string
  from?: string
  messagingServiceSid?: string
  body: string
}) {
  const form = new URLSearchParams()
  form.set('To', params.to)
  form.set('Body', params.body)
  if (params.messagingServiceSid) form.set('MessagingServiceSid', params.messagingServiceSid)
  else if (params.from) form.set('From', params.from)

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${params.accountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: twilioAuthHeader(params.accountSid, params.authToken),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form,
  })

  const text = await response.text()
  let payload: { sid?: string; message?: string; code?: number } = {}
  try {
    payload = JSON.parse(text) as typeof payload
  } catch {
    payload = { message: text }
  }

  if (!response.ok) {
    throw new Error(payload.message || `Twilio request failed with ${response.status}`)
  }

  return payload.sid
}

export async function sendRecoveryFollowup(params: {
  customerName: string
  trackingNumber: string
  customerPhone: string
  recoveryLink: string
}): Promise<FollowupResult[]> {
  const env = getServerEnv()
  const channels = env.FOLLOWUP_CHANNELS.split(',')
    .map((channel) => channel.trim().toLowerCase())
    .filter(Boolean) as FollowupChannel[]

  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    return channels.map((channel) => ({
      channel,
      status: 'skipped',
      provider: 'twilio',
      reason: 'TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN not configured',
    }))
  }

  const body = followupBody(params)
  const results: FollowupResult[] = []

  for (const channel of channels) {
    if (channel === 'sms') {
      if (!env.TWILIO_SMS_FROM && !env.TWILIO_MESSAGING_SERVICE_SID) {
        results.push({
          channel,
          status: 'skipped',
          provider: 'twilio',
          reason: 'TWILIO_SMS_FROM or TWILIO_MESSAGING_SERVICE_SID not configured',
        })
        continue
      }

      try {
        const sid = await sendTwilioMessage({
          accountSid: env.TWILIO_ACCOUNT_SID,
          authToken: env.TWILIO_AUTH_TOKEN,
          to: params.customerPhone,
          from: env.TWILIO_SMS_FROM,
          messagingServiceSid: env.TWILIO_MESSAGING_SERVICE_SID,
          body,
        })
        results.push({ channel, status: 'sent', provider: 'twilio', providerMessageId: sid })
      } catch (error) {
        results.push({
          channel,
          status: 'failed',
          provider: 'twilio',
          reason: error instanceof Error ? error.message : 'Unknown Twilio SMS error',
        })
      }
      continue
    }

    if (channel === 'whatsapp') {
      if (!env.TWILIO_WHATSAPP_FROM) {
        results.push({
          channel,
          status: 'skipped',
          provider: 'twilio',
          reason: 'TWILIO_WHATSAPP_FROM not configured',
        })
        continue
      }

      try {
        const sid = await sendTwilioMessage({
          accountSid: env.TWILIO_ACCOUNT_SID,
          authToken: env.TWILIO_AUTH_TOKEN,
          to: normalizeWhatsappAddress(params.customerPhone),
          from: normalizeWhatsappAddress(env.TWILIO_WHATSAPP_FROM),
          body,
        })
        results.push({ channel, status: 'sent', provider: 'twilio', providerMessageId: sid })
      } catch (error) {
        results.push({
          channel,
          status: 'failed',
          provider: 'twilio',
          reason: error instanceof Error ? error.message : 'Unknown Twilio WhatsApp error',
        })
      }
    }
  }

  return results
}
