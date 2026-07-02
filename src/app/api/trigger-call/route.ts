import { NextResponse } from 'next/server'
import { RecoveryCallError, startRecoveryCall } from '@/lib/bolna'

export async function POST(req: Request) {
  try {
    const { shipmentId } = await req.json()

    if (!shipmentId) {
      return NextResponse.json({ error: 'shipmentId is required' }, { status: 400 })
    }

    const result = await startRecoveryCall({ shipmentId, reason: 'manual_trigger' })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof RecoveryCallError) {
      return NextResponse.json(
        { error: error.message, ...(error.detail ? { detail: error.detail } : {}) },
        { status: error.status }
      )
    }
    console.error('[trigger-call]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
