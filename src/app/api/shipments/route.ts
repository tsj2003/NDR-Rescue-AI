import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const shipments = await prisma.shipment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { callExecutions: true }
    })
    return NextResponse.json(shipments)
  } catch (error) {
    console.error('[shipments GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
