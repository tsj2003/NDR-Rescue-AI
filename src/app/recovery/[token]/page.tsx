'use client'

import { use, useEffect, useState } from 'react'
import { toast } from 'sonner'

type Shipment = {
  trackingNumber: string
  customerName: string
  dropAddress: string
  failureReason: string
  state: string
  expectedSlot?: string | null
}

const SLOTS = ['Today 6PM-9PM', 'Tomorrow 9AM-12PM', 'Tomorrow 12PM-5PM', 'Tomorrow 5PM-9PM']

export default function RecoveryPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [loading, setLoading] = useState(true)
  const [slot, setSlot] = useState(SLOTS[1])
  const [address, setAddress] = useState('')
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/recovery/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) toast.error(data.error)
        else {
          setShipment(data)
          setAddress(data.dropAddress)
        }
      })
      .finally(() => setLoading(false))
  }, [token])

  async function submit(action: 'redelivery_slot' | 'address_update' | 'will_pickup' | 'cancel') {
    setSubmitting(action)
    try {
      const res = await fetch(`/api/recovery/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          redeliverySlot: slot,
          addressUpdate: address,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Could not save recovery choice')
        return
      }
      setShipment(data.shipment)
      toast.success('Delivery recovery saved')
    } catch {
      toast.error('Connection error')
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #f7f5ed; font-family: Inter, sans-serif; }`}</style>
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <section style={{ width: '100%', maxWidth: 560, background: '#fff', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 16, padding: 28, boxShadow: '0 20px 60px rgba(6,78,59,0.08)' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#064e3b', marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>
            NR
          </div>
          <h1 style={{ fontFamily: 'Instrument Serif, serif', color: '#064e3b', fontSize: 34, margin: '0 0 8px' }}>Recover your delivery</h1>
          {loading ? (
            <p style={{ color: '#64748b' }}>Loading shipment...</p>
          ) : !shipment ? (
            <p style={{ color: '#b91c1c' }}>This recovery link is invalid or expired.</p>
          ) : shipment.state === 'REDELIVERY_CONFIRMED' || shipment.state === 'CANCELED' ? (
            <div style={{ padding: 18, borderRadius: 12, background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', fontWeight: 700 }}>
              This delivery is already resolved. {shipment.expectedSlot ? `Slot: ${shipment.expectedSlot}` : ''}
            </div>
          ) : (
            <>
              <p style={{ color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>
                Hi {shipment.customerName}, we could not deliver package <strong>{shipment.trackingNumber}</strong>. Choose the fastest recovery path below.
              </p>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Redelivery slot
              </label>
              <select value={slot} onChange={(e) => setSlot(e.target.value)} style={{ width: '100%', height: 44, borderRadius: 8, border: '1px solid rgba(6,78,59,0.2)', padding: '0 12px', color: '#064e3b', marginBottom: 16 }}>
                {SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>

              <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Delivery address
              </label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3} style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(6,78,59,0.2)', padding: 12, color: '#064e3b', resize: 'vertical', marginBottom: 18 }} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button onClick={() => submit('redelivery_slot')} disabled={!!submitting} style={{ height: 44, borderRadius: 99, border: 'none', background: '#064e3b', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>
                  {submitting === 'redelivery_slot' ? 'Saving...' : 'Confirm Slot'}
                </button>
                <button onClick={() => submit('address_update')} disabled={!!submitting} style={{ height: 44, borderRadius: 99, border: '1px solid rgba(6,78,59,0.2)', background: '#fff', color: '#064e3b', fontWeight: 800, cursor: 'pointer' }}>
                  Update Address
                </button>
                <button onClick={() => submit('will_pickup')} disabled={!!submitting} style={{ height: 44, borderRadius: 99, border: '1px solid rgba(6,78,59,0.2)', background: '#fff', color: '#064e3b', fontWeight: 800, cursor: 'pointer' }}>
                  I will pick up
                </button>
                <button onClick={() => submit('cancel')} disabled={!!submitting} style={{ height: 44, borderRadius: 99, border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontWeight: 800, cursor: 'pointer' }}>
                  Cancel Delivery
                </button>
              </div>
            </>
          )}
        </section>
      </main>
    </>
  )
}
