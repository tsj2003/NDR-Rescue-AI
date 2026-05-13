import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    let { callId, shipmentId, status, transcript, extractedData } = body

    // If shipmentId provided, auto-look up the most recent QUEUED call
    if (!callId && shipmentId) {
      const call = await prisma.callExecution.findFirst({
        where: { shipmentId },
        orderBy: { createdAt: 'desc' },
      })
      if (!call) return NextResponse.json({ error: 'No call found for shipment' }, { status: 404 })
      callId = call.id
    }

    if (!callId) return NextResponse.json({ error: 'Missing call_id or shipmentId' }, { status: 400 })

    // Build a realistic transcript if not provided
    const call = await prisma.callExecution.findUnique({
      where: { id: callId },
      include: { shipment: true },
    })
    const name = call?.shipment?.customerName?.split(' ')[0] ?? 'there'
    const tracking = call?.shipment?.trackingNumber ?? 'your package'

    const defaultTranscript = [
      `Agent: Hello, am I speaking with ${name}? I'm calling from Global Logistics about package ${tracking} that couldn't be delivered.`,
      `Customer: Yes, this is ${name}. I was expecting it but wasn't home.`,
      `Agent: No worries at all! Could you share a convenient time slot for redelivery — morning, afternoon, or evening?`,
      `Customer: Tomorrow afternoon between 2 and 6 PM works perfectly for me.`,
      `Agent: Perfect! I've booked your redelivery for tomorrow 2PM–6PM. You'll get a confirmation SMS. Anything else I can help with?`,
      `Customer: No, that's all. Thank you so much!`,
      `Agent: Great, have a wonderful day. Goodbye!`,
    ].join('\n')

    const defaultExtracted = {
      redelivery_slot: 'Tomorrow 2PM-6PM',
      consent: true,
      address_update: null,
      will_pickup: false,
      cancel: false,
    }

    // Fire against our own webhook
    const secret = process.env.WEBHOOK_SECRET || 'my-super-secret-webhook-key'
    const webhookUrl = `${process.env.APP_URL || 'http://localhost:3000'}/api/webhook/bolna?secret=${secret}`

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        call_id: callId,
        status: status || 'completed',
        transcript: transcript || defaultTranscript,
        extracted_data: extractedData || defaultExtracted,
      }),
    })

    const result = await response.json()
    return NextResponse.json({ ok: true, callId, webhookResult: result })
  } catch (error) {
    console.error('Simulate webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
