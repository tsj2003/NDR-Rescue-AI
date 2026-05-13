import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

// Maps Bolna status strings → our CallState enum
function mapCallState(status: string): 'QUEUED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER' {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'done':
      return 'COMPLETED'
    case 'in_progress':
    case 'ringing':
    case 'answered':
      return 'IN_PROGRESS'
    case 'failed':
    case 'error':
      return 'FAILED'
    case 'no_answer':
    case 'busy':
    case 'no-answer':
      return 'NO_ANSWER'
    default:
      return 'IN_PROGRESS'
  }
}

// Maps extracted data fields → FinalOutcome enum + new shipment state
function extractOutcome(data: Record<string, unknown> | null): {
  finalOutcome: string | null
  newShipmentState: string | null
  expectedSlot: string | null
} {
  if (!data) return { finalOutcome: null, newShipmentState: null, expectedSlot: null }

  if (data.redelivery_slot || data.slot || data.preferred_slot) {
    return {
      finalOutcome: 'REDELIVERY_SLOT_BOOKED',
      newShipmentState: 'REDELIVERY_CONFIRMED',
      expectedSlot: String(data.redelivery_slot ?? data.slot ?? data.preferred_slot ?? ''),
    }
  }
  if (data.correct_address || data.address_update) {
    return { finalOutcome: 'ADDRESS_CORRECTED', newShipmentState: 'REDELIVERY_CONFIRMED', expectedSlot: null }
  }
  if (data.will_pickup === true || data.customer_will_pickup === true) {
    return { finalOutcome: 'WILL_PICKUP', newShipmentState: 'REDELIVERY_CONFIRMED', expectedSlot: null }
  }
  if (data.cancel === true || data.canceled === true) {
    return { finalOutcome: 'CANCELED_BY_CUSTOMER', newShipmentState: 'CANCELED', expectedSlot: null }
  }
  if (data.escalate === true || data.unreachable === true) {
    return { finalOutcome: 'ESCALATED_TO_HUMAN', newShipmentState: 'MANUAL_REVIEW', expectedSlot: null }
  }

  return { finalOutcome: null, newShipmentState: 'MANUAL_REVIEW', expectedSlot: null }
}

export async function POST(req: Request) {
  try {
    // 1. Validate secret
    const url = new URL(req.url)
    const secret = url.searchParams.get('secret')
    if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse payload
    let payload: Record<string, unknown>
    try {
      payload = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const callId = payload.call_id as string | undefined
    if (!callId) {
      return NextResponse.json({ error: 'Missing call_id' }, { status: 400 })
    }

    // 3. Lookup — idempotency: if already COMPLETED, accept but skip update
    const execution = await prisma.callExecution.findUnique({
      where: { id: callId },
      include: { shipment: { select: { id: true, state: true } } },
    })

    if (!execution) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 })
    }

    // Idempotency guard: skip re-processing already-completed calls
    if (execution.state === 'COMPLETED' && execution.webhookCount > 0) {
      return NextResponse.json({ success: true, skipped: true, reason: 'already_completed' })
    }

    // 4. Compute new states
    const newCallState = mapCallState(payload.status as string)
    const extractedData = (payload.extracted_data ?? null) as Record<string, unknown> | null
    const { finalOutcome, newShipmentState, expectedSlot } = extractOutcome(extractedData)

    const shipmentUpdateNeeded =
      newShipmentState && newShipmentState !== execution.shipment?.state

    // 5. Transactional update
    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.callExecution.update({
        where: { id: callId },
        data: {
          state: newCallState,
          transcript: (payload.transcript as string | undefined) ?? execution.transcript ?? undefined,
          extractedData: (extractedData as Prisma.InputJsonValue | undefined) ?? (execution.extractedData as Prisma.InputJsonValue | undefined) ?? undefined,
          finalOutcome: finalOutcome as ('REDELIVERY_SLOT_BOOKED' | 'ADDRESS_CORRECTED' | 'WILL_PICKUP' | 'CANCELED_BY_CUSTOMER' | 'ESCALATED_TO_HUMAN' | 'UNREACHABLE' | null) ?? undefined,
          recordingUrl: (payload.recording_url as string | undefined) ?? execution.recordingUrl ?? undefined,
          webhookCount: { increment: 1 },
        },
      }),
    ]

    if (shipmentUpdateNeeded) {
      updates.push(
        prisma.shipment.update({
          where: { id: execution.shipmentId },
          data: {
            state: newShipmentState as Parameters<typeof prisma.shipment.update>[0]['data']['state'],
            ...(expectedSlot ? { expectedSlot } : {}),
            ...(finalOutcome === 'REDELIVERY_SLOT_BOOKED' ? { consentTime: new Date() } : {}),
          },
        })
      )
      updates.push(
        prisma.auditEvent.create({
          data: {
            shipmentId: execution.shipmentId,
            event: 'STATE_CHANGED',
            details: {
              from: execution.shipment?.state,
              to: newShipmentState,
              callId,
              finalOutcome,
              via: 'webhook',
            },
          },
        })
      )
    }

    await prisma.$transaction(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[webhook/bolna]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
