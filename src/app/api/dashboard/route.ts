import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { subDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [
      totalShipments,
      recoveredShipments,
      failedShipments,
      inProgressShipments,
    ] = await Promise.all([
      prisma.shipment.count(),
      prisma.shipment.count({ where: { state: 'REDELIVERY_CONFIRMED' } }),
      prisma.shipment.count({ where: { state: { in: ['FAILED_ATTEMPT', 'MANUAL_REVIEW'] } } }),
      prisma.shipment.count({ where: { state: { in: ['CALL_SCHEDULED', 'CALL_IN_PROGRESS'] } } }),
    ])

    const recoveryRate =
      totalShipments > 0 ? ((recoveredShipments / totalShipments) * 100).toFixed(1) : '0.0'

    // Average resolution time from FAILED_ATTEMPT creation to REDELIVERY_CONFIRMED (via call completion)
    const completedCalls = await prisma.callExecution.findMany({
      where: { state: 'COMPLETED', finalOutcome: 'REDELIVERY_SLOT_BOOKED' },
      include: { shipment: { select: { createdAt: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    let avgResolutionHours: number | null = null
    if (completedCalls.length > 0) {
      const totalMs = completedCalls.reduce((acc, c) => {
        return acc + (new Date(c.updatedAt).getTime() - new Date(c.shipment.createdAt).getTime())
      }, 0)
      avgResolutionHours = Math.round(totalMs / completedCalls.length / 3_600_000)
    }

    // Weekly trend: last 7 days
    const since = subDays(new Date(), 6)
    const recentShipments = await prisma.shipment.findMany({
      where: { createdAt: { gte: since } },
      select: { state: true, createdAt: true },
    })

    const trendMap: Record<string, { recovered: number; failed: number }> = {}
    for (let i = 0; i < 7; i++) {
      const d = format(subDays(new Date(), 6 - i), 'MMM d')
      trendMap[d] = { recovered: 0, failed: 0 }
    }
    for (const s of recentShipments) {
      const day = format(new Date(s.createdAt), 'MMM d')
      if (!trendMap[day]) trendMap[day] = { recovered: 0, failed: 0 }
      if (s.state === 'REDELIVERY_CONFIRMED') {
        trendMap[day].recovered++
      } else {
        // Count everything else (Failed, Scheduled, Canceled) as part of the NDR volume
        trendMap[day].failed++
      }
    }

    const weeklyTrend = Object.entries(trendMap).map(([date, v]) => ({ date, ...v }))

    return NextResponse.json({
      totalShipments,
      recoveredShipments,
      failedShipments,
      inProgressShipments,
      recoveryRate,
      avgResolutionHours,
      weeklyTrend,
    })
  } catch (error) {
    console.error('[dashboard]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}