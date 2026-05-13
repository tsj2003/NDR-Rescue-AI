import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        callExecutions: { orderBy: { createdAt: 'desc' } },
        auditEvents: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(shipment)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
