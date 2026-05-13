import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { customerName, customerPhone, dropAddress, failureReason } = await req.json()

    if (!customerName || !customerPhone || !dropAddress) {
      return NextResponse.json({ error: 'Name, phone, and address are required' }, { status: 400 })
    }

    // Normalize phone to E.164
    let phone = customerPhone.replace(/\D/g, '')
    if (phone.length === 10) phone = `+91${phone}`
    else if (!phone.startsWith('+')) phone = `+${phone}`

    // Get the demo org
    const org = await prisma.organization.findFirst()
    if (!org) return NextResponse.json({ error: 'No organization found' }, { status: 500 })

    // Generate tracking number
    const count = await prisma.shipment.count()
    const trackingNumber = `TRK${String(10001 + count).padStart(5, '0')}`

    const shipment = await prisma.shipment.create({
      data: {
        organizationId: org.id,
        trackingNumber,
        customerName,
        customerPhone: phone,
        dropAddress,
        failureReason: (failureReason || 'ADDRESS_NOT_FOUND').replace(/ /g, '_').toUpperCase(),
        state: 'FAILED_ATTEMPT',
        consentObtained: true,
      },
    })

    return NextResponse.json({ success: true, shipment })
  } catch (error) {
    console.error('[shipments/create]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
