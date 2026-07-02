import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { RecoveryCallError, startRecoveryCall } from '@/lib/bolna'
import { getServerEnv } from '@/lib/env'

export async function POST(req: Request) {
  try {
    const env = getServerEnv()
    const url = new URL(req.url)
    const suppliedSecret = req.headers.get('x-cron-secret') ?? url.searchParams.get('secret')
    if (env.CRON_SECRET && suppliedSecret !== env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dueShipments = await prisma.shipment.findMany({
      where: {
        consentObtained: true,
        state: 'CALL_SCHEDULED',
        fallbackStatus: 'RETRY_SCHEDULED',
        nextRetryAt: { lte: new Date() },
      },
      select: { id: true, trackingNumber: true },
      take: 25,
      orderBy: { nextRetryAt: 'asc' },
    })

    const results = []
    for (const shipment of dueShipments) {
      try {
        const result = await startRecoveryCall({ shipmentId: shipment.id, reason: 'scheduled_retry' })
        results.push({ shipmentId: shipment.id, trackingNumber: shipment.trackingNumber, ok: true, callId: result.callId })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown retry error'
        const status = error instanceof RecoveryCallError ? error.status : 500
        results.push({ shipmentId: shipment.id, trackingNumber: shipment.trackingNumber, ok: false, status, error: message })
      }
    }

    return NextResponse.json({ processed: results.length, results })
  } catch (error) {
    console.error('[recovery/retry-due]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
