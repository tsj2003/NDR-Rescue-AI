import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        callExecutions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })
    if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(shipment)
  } catch (error) {
    console.error('[shipments/id GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const data: Record<string, unknown> = {}
    if (body.customerPhone) {
      let phone = body.customerPhone.replace(/\D/g, '')
      if (phone.length === 10) phone = `+91${phone}`
      else if (!phone.startsWith('+')) phone = `+${phone}`
      data.customerPhone = phone
    }
    if (body.customerName) data.customerName = body.customerName
    if (body.dropAddress) data.dropAddress = body.dropAddress

    const shipment = await prisma.shipment.update({ where: { id }, data })
    return NextResponse.json({ success: true, shipment })
  } catch (error) {
    console.error('[shipments/id PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
