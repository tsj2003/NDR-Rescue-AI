import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

type RecoveryAction = 'redelivery_slot' | 'address_update' | 'will_pickup' | 'cancel'

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const shipment = await prisma.shipment.findUnique({
      where: { recoveryToken: token },
      select: {
        trackingNumber: true,
        customerName: true,
        dropAddress: true,
        failureReason: true,
        state: true,
        expectedSlot: true,
      },
    })

    if (!shipment) return NextResponse.json({ error: 'Recovery link not found' }, { status: 404 })
    return NextResponse.json(shipment)
  } catch (error) {
    console.error('[recovery/token GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const body = (await req.json()) as {
      action?: RecoveryAction
      redeliverySlot?: string
      addressUpdate?: string
    }

    const shipment = await prisma.shipment.findUnique({ where: { recoveryToken: token } })
    if (!shipment) return NextResponse.json({ error: 'Recovery link not found' }, { status: 404 })

    if (shipment.state === 'REDELIVERY_CONFIRMED' || shipment.state === 'CANCELED') {
      return NextResponse.json({ success: true, alreadyResolved: true, shipment })
    }

    if (!body.action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 })
    }

    const data: {
      state: 'REDELIVERY_CONFIRMED' | 'CANCELED'
      expectedSlot?: string
      dropAddress?: string
      fallbackStatus: string
      nextRetryAt: null
      manualReviewReason: null
      lastFallbackAt: Date
    } = {
      state: body.action === 'cancel' ? 'CANCELED' : 'REDELIVERY_CONFIRMED',
      fallbackStatus: 'COMPLETE',
      nextRetryAt: null,
      manualReviewReason: null,
      lastFallbackAt: new Date(),
    }

    if (body.action === 'redelivery_slot') {
      if (!body.redeliverySlot?.trim()) {
        return NextResponse.json({ error: 'redeliverySlot is required' }, { status: 400 })
      }
      data.expectedSlot = body.redeliverySlot.trim()
    }

    if (body.action === 'address_update') {
      if (!body.addressUpdate?.trim()) {
        return NextResponse.json({ error: 'addressUpdate is required' }, { status: 400 })
      }
      data.dropAddress = body.addressUpdate.trim()
      data.expectedSlot = body.redeliverySlot?.trim() || 'Customer confirmed updated address'
    }

    if (body.action === 'will_pickup') {
      data.expectedSlot = 'Customer will pick up from hub'
    }

    const [updated] = await prisma.$transaction([
      prisma.shipment.update({ where: { id: shipment.id }, data }),
      prisma.auditEvent.create({
        data: {
          shipmentId: shipment.id,
          event: 'CUSTOMER_SELF_SERVE_CONFIRMED',
          details: {
            action: body.action,
            redeliverySlot: body.redeliverySlot ?? null,
            addressUpdate: body.addressUpdate ?? null,
            via: 'sms_whatsapp_recovery_link',
          },
        },
      }),
    ])

    return NextResponse.json({ success: true, shipment: updated })
  } catch (error) {
    console.error('[recovery/token PATCH]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
