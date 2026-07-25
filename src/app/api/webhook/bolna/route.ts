import { NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import prisma from '@/lib/prisma'
import { getServerEnv } from '@/lib/env'
import {
  buildNoAnswerFallback,
  deriveOutcome,
  FALLBACK_STATUS,
  mapCallState,
  normalizeBolnaExtraction,
} from '@/lib/recovery'
import { sendRecoveryFollowup } from '@/lib/notifications'

export async function POST(req: Request) {
  try {
    const env = getServerEnv()
    const url = new URL(req.url)
    const secret = url.searchParams.get('secret')
    if (secret !== env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let payload: Record<string, unknown>
    try {
      payload = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const callId = (payload.id ?? payload.call_id ?? payload.execution_id) as string | undefined
    if (!callId) {
      return NextResponse.json({ error: 'Missing call id' }, { status: 400 })
    }

    const newCallState = mapCallState((payload.status as string | undefined) ?? '')
    const execution = await prisma.callExecution.findUnique({
      where: { id: callId },
      include: { shipment: true },
    })

    if (!execution) {
      console.warn(`[webhook/bolna] Call ${callId} not found - accepting to avoid retry storm`)
      return NextResponse.json({ success: true, skipped: true, reason: 'call_not_found' })
    }

    if (
      ['COMPLETED', 'NO_ANSWER', 'FAILED'].includes(execution.state) &&
      execution.webhookCount > 0 &&
      (newCallState === execution.state || execution.state === 'COMPLETED')
    ) {
      return NextResponse.json({ success: true, skipped: true, reason: 'already_terminal' })
    }

    const transcript = (payload.transcript as string | undefined) ?? null
    const extractedRaw = (payload.extracted_data ?? payload.extractedData ?? null) as Record<string, unknown> | null
    const extraction = normalizeBolnaExtraction(extractedRaw)
    const { finalOutcome, newShipmentState, expectedSlot } = deriveOutcome(extraction, newCallState, transcript)

    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.callExecution.update({
        where: { id: callId },
        data: {
          state: newCallState,
          transcript: transcript ?? execution.transcript ?? undefined,
          extractedData:
            (extractedRaw as Prisma.InputJsonValue | undefined) ??
            (execution.extractedData as Prisma.InputJsonValue | undefined) ??
            undefined,
          finalOutcome: finalOutcome ?? undefined,
          recordingUrl: (payload.recording_url as string | undefined) ?? execution.recordingUrl ?? undefined,
          webhookCount: { increment: 1 },
        },
      }),
    ]

    if (newCallState === 'NO_ANSWER' || newCallState === 'FAILED') {
      const fallback = buildNoAnswerFallback({
        execution,
        shipment: execution.shipment,
        appUrl: env.APP_URL,
        maxAttempts: env.MAX_CALL_ATTEMPTS,
        retryDelayMinutes: env.NO_ANSWER_RETRY_MINUTES,
      })

      updates.push(
        prisma.shipment.update({
          where: { id: execution.shipmentId },
          data: {
            state: fallback.fallbackStatus === FALLBACK_STATUS.MANUAL_REVIEW ? 'MANUAL_REVIEW' : 'CALL_SCHEDULED',
            recoveryToken: fallback.recoveryToken,
            smsFollowupLink: fallback.smsFollowupLink,
            retryCount: fallback.retryCount,
            fallbackStatus: fallback.fallbackStatus,
            nextRetryAt: fallback.nextRetryAt,
            lastFallbackAt: new Date(),
            manualReviewReason: fallback.manualReviewReason,
          },
        }),
        prisma.auditEvent.create({
          data: {
            shipmentId: execution.shipmentId,
            event: fallback.auditEvent,
            details: {
              ...fallback.auditDetails,
              callId,
              callState: newCallState,
            },
          },
        })
      )

      await prisma.$transaction(updates)

      const followupResults = await sendRecoveryFollowup({
        customerName: execution.shipment.customerName,
        trackingNumber: execution.shipment.trackingNumber,
        customerPhone: execution.shipment.customerPhone,
        recoveryLink: fallback.smsFollowupLink,
      })

      await prisma.auditEvent.create({
        data: {
          shipmentId: execution.shipmentId,
          event: 'FOLLOWUP_MESSAGE_ATTEMPTED',
          details: {
            callId,
            provider: 'twilio',
            results: followupResults,
          },
        },
      })

      return NextResponse.json({
        success: true,
        fallback: {
          status: fallback.fallbackStatus,
          nextRetryAt: fallback.nextRetryAt,
          smsFollowupLink: fallback.smsFollowupLink,
          followupResults,
        },
      })
    }

    if (newShipmentState && newShipmentState !== execution.shipment.state) {
      updates.push(
        prisma.shipment.update({
          where: { id: execution.shipmentId },
          data: {
            state: newShipmentState,
            ...(expectedSlot ? { expectedSlot } : {}),
            ...(extraction.addressUpdate ? { dropAddress: extraction.addressUpdate } : {}),
            fallbackStatus: FALLBACK_STATUS.COMPLETE,
            nextRetryAt: null,
            manualReviewReason: null,
            lastFallbackAt: new Date(),
          },
        }),
        prisma.auditEvent.create({
          data: {
            shipmentId: execution.shipmentId,
            event: 'STATE_CHANGED',
            details: {
              from: execution.shipment.state,
              to: newShipmentState,
              callId,
              finalOutcome,
              expectedSlot,
              normalizedExtraction: {
                redeliverySlot: extraction.redeliverySlot,
                addressUpdate: extraction.addressUpdate,
                willPickup: extraction.willPickup,
                canceled: extraction.canceled,
                escalate: extraction.escalate,
                unreachable: extraction.unreachable,
              },
              via: 'bolna_webhook',
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
