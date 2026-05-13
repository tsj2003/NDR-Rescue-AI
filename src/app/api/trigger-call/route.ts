import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { normalizePhone } from '@/lib/auth'

const BOLNA_API_KEY = process.env.BOLNA_API_KEY
const BOLNA_AGENT_ID = process.env.BOLNA_AGENT_ID
const APP_URL = process.env.APP_URL || 'http://localhost:3000'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'my-super-secret-webhook-key'

export async function POST(req: Request) {
  try {
    const { shipmentId } = await req.json()

    if (!shipmentId) {
      return NextResponse.json({ error: 'shipmentId is required' }, { status: 400 })
    }

    const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } })

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
    }

    if (!shipment.consentObtained) {
      return NextResponse.json({ error: 'Customer consent not obtained' }, { status: 400 })
    }

    if (shipment.state !== 'FAILED_ATTEMPT') {
      return NextResponse.json(
        { error: `Cannot trigger call — shipment is in state: ${shipment.state}` },
        { status: 409 }
      )
    }

    const webhookUrl = `${APP_URL}/api/webhook/bolna?secret=${WEBHOOK_SECRET}`
    const phoneNumber = normalizePhone(shipment.customerPhone)

    const isLive = BOLNA_API_KEY &&
      !BOLNA_API_KEY.startsWith('your-') &&
      BOLNA_AGENT_ID &&
      !BOLNA_AGENT_ID.startsWith('your-')

    let callId: string

    if (isLive) {
      // ── LIVE: Bolna v2 API ────────────────────────────────────────────
      const bolnaRes = await fetch('https://api.bolna.ai/call', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${BOLNA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: BOLNA_AGENT_ID,
          recipient_phone_number: phoneNumber,
          bypass_call_guardrails: true,
          // Bolna V2: 'variables' injects into {placeholder} slots in agent prompt
          variables: {
            customerName: shipment.customerName,
            trackingNumber: shipment.trackingNumber,
            dropAddress: shipment.dropAddress,
            failureReason: shipment.failureReason.replace(/_/g, ' ').toLowerCase(),
          },
        }),
      })

      if (!bolnaRes.ok) {
        const err = await bolnaRes.text()
        console.error('[trigger-call] Bolna error:', err)
        return NextResponse.json({ error: 'Bolna API error', detail: err }, { status: 502 })
      }

      const bolnaData = await bolnaRes.json()
      // v2 returns execution_id
      callId = bolnaData.execution_id ?? bolnaData.call_id ?? bolnaData.id ?? `bolna-${Date.now()}`
      console.log(`[trigger-call] Live call queued: ${callId} → ${phoneNumber}`)
    } else {
      // ── MOCK: development fallback ─────────────────────────────────────
      callId = `mock-call-${Date.now()}`
      console.log(`[trigger-call] MOCK call (no live API key): ${callId}`)
    }

    // Transactional: create execution + update shipment + write audit
    await prisma.$transaction([
      prisma.callExecution.create({
        data: { id: callId, shipmentId: shipment.id, state: 'QUEUED' },
      }),
      prisma.shipment.update({
        where: { id: shipment.id },
        data: { state: 'CALL_SCHEDULED' },
      }),
      prisma.auditEvent.create({
        data: {
          shipmentId: shipment.id,
          event: 'CALL_TRIGGERED',
          details: {
            callId,
            phone: phoneNumber,
            mode: isLive ? 'live' : 'mock',
            webhookUrl,
          },
        },
      }),
    ])

    return NextResponse.json({ success: true, callId, mode: isLive ? 'live' : 'mock' })
  } catch (error) {
    console.error('[trigger-call]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
