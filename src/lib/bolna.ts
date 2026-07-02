import prisma from '@/lib/prisma'
import { normalizePhone } from '@/lib/auth'
import { getServerEnv } from '@/lib/env'
import { FALLBACK_STATUS } from '@/lib/recovery'

export class RecoveryCallError extends Error {
  constructor(
    message: string,
    public status = 400,
    public detail?: string
  ) {
    super(message)
  }
}

function formatBolnaError(status: number, body: string): string {
  if (!body) return `Bolna request failed with status ${status}`

  try {
    const parsed = JSON.parse(body) as { message?: unknown; error?: unknown; detail?: unknown }
    const message = parsed.message ?? parsed.detail ?? parsed.error
    if (typeof message === 'string') return message
    if (message !== undefined) return JSON.stringify(message)
  } catch {
    // Keep the raw response below.
  }

  return body
}

export async function startRecoveryCall(params: {
  shipmentId: string
  reason?: 'manual_trigger' | 'scheduled_retry'
}) {
  const env = getServerEnv()
  const shipment = await prisma.shipment.findUnique({
    where: { id: params.shipmentId },
    include: {
      callExecutions: {
        orderBy: { createdAt: 'desc' },
        select: { id: true, state: true, attemptNumber: true },
      },
    },
  })

  if (!shipment) throw new RecoveryCallError('Shipment not found', 404)
  if (!shipment.consentObtained) throw new RecoveryCallError('Customer consent not obtained', 400)
  if (shipment.state === 'REDELIVERY_CONFIRMED' || shipment.state === 'CANCELED') {
    throw new RecoveryCallError(`Cannot trigger call - shipment is already ${shipment.state}`, 409)
  }

  const activeCall = shipment.callExecutions.find((call) => call.state === 'QUEUED' || call.state === 'IN_PROGRESS')
  if (activeCall) {
    throw new RecoveryCallError(`Call ${activeCall.id} is already active for this shipment`, 409)
  }

  const webhookUrl = `${env.APP_URL}/api/webhook/bolna?secret=${env.WEBHOOK_SECRET}`
  const phoneNumber = normalizePhone(shipment.customerPhone)

  const isLive =
    env.BOLNA_API_KEY &&
    !env.BOLNA_API_KEY.startsWith('your-') &&
    env.BOLNA_AGENT_ID &&
    !env.BOLNA_AGENT_ID.startsWith('your-')

  let callId: string

  if (isLive) {
    const bolnaRes = await fetch('https://api.bolna.ai/call', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.BOLNA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        agent_id: env.BOLNA_AGENT_ID,
        recipient_phone_number: phoneNumber,
        ...(env.BOLNA_FROM_PHONE_NUMBER ? { from_phone_number: env.BOLNA_FROM_PHONE_NUMBER } : {}),
        bypass_call_guardrails: true,
        user_data: {
          customerName: shipment.customerName,
          trackingNumber: shipment.trackingNumber,
          dropAddress: shipment.dropAddress,
          failureReason: shipment.failureReason.replace(/_/g, ' ').toLowerCase(),
        },
      }),
    })

    if (!bolnaRes.ok) {
      const detail = formatBolnaError(bolnaRes.status, await bolnaRes.text())
      throw new RecoveryCallError('Bolna API error', 502, detail)
    }

    const bolnaData = (await bolnaRes.json()) as { execution_id?: string; call_id?: string; id?: string }
    callId = bolnaData.execution_id ?? bolnaData.call_id ?? bolnaData.id ?? `bolna-${Date.now()}`
  } else {
    callId = `mock-call-${Date.now()}`
  }

  const nextAttemptNumber = Math.max(0, ...shipment.callExecutions.map((call) => call.attemptNumber || 1)) + 1
  const isRetry = params.reason === 'scheduled_retry'

  await prisma.$transaction([
    prisma.callExecution.create({
      data: {
        id: callId,
        shipmentId: shipment.id,
        state: 'QUEUED',
        attemptNumber: nextAttemptNumber,
      },
    }),
    prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        state: 'CALL_SCHEDULED',
        ...(isRetry
          ? {
              fallbackStatus: FALLBACK_STATUS.RETRY_CALL_QUEUED,
              nextRetryAt: null,
              lastFallbackAt: new Date(),
            }
          : {}),
      },
    }),
    prisma.auditEvent.create({
      data: {
        shipmentId: shipment.id,
        event: isRetry ? 'RETRY_CALL_TRIGGERED' : 'CALL_TRIGGERED',
        details: {
          callId,
          phone: phoneNumber,
          mode: isLive ? 'live' : 'mock',
          webhookUrl,
          attemptNumber: nextAttemptNumber,
        },
      },
    }),
  ])

  return {
    success: true,
    callId,
    attemptNumber: nextAttemptNumber,
    mode: isLive ? 'live' : 'mock',
    webhookUrl,
  }
}
