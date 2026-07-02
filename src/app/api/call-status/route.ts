import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const shipmentId = url.searchParams.get('shipmentId')
    const callId = url.searchParams.get('callId')

    if (!shipmentId && !callId) {
      return NextResponse.json({ error: 'shipmentId or callId is required' }, { status: 400 })
    }

    const call = callId
      ? await prisma.callExecution.findUnique({ where: { id: callId }, include: { shipment: true } })
      : await prisma.callExecution.findFirst({
          where: { shipmentId: shipmentId ?? undefined },
          orderBy: { createdAt: 'desc' },
          include: { shipment: true },
        })

    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 })

    return NextResponse.json({
      callId: call.id,
      state: call.state,
      attemptNumber: call.attemptNumber,
      finalOutcome: call.finalOutcome,
      updatedAt: call.updatedAt,
      shipment: {
        id: call.shipment.id,
        trackingNumber: call.shipment.trackingNumber,
        state: call.shipment.state,
        fallbackStatus: call.shipment.fallbackStatus,
        nextRetryAt: call.shipment.nextRetryAt,
        smsFollowupLink: call.shipment.smsFollowupLink,
        manualReviewReason: call.shipment.manualReviewReason,
      },
    })
  } catch (error) {
    console.error('[call-status]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
