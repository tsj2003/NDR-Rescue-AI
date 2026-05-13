'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const GFONT = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
const GICON = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'

type CallExecution = {
  id: string; state: string; createdAt: string; updatedAt: string
  transcript?: string | null; extractedData?: Record<string, unknown> | null; finalOutcome?: string | null
}
type ShipmentDetail = {
  id: string; trackingNumber: string; customerName: string; customerPhone: string
  dropAddress: string; failureReason: string; state: string; consentObtained: boolean
  expectedSlot?: string | null; updatedAt: string
  callExecutions: CallExecution[]
}

function Sidebar({ active }: { active: string }) {
  const router = useRouter()
  const nav = [
    { icon: 'dashboard', label: 'Overview', href: '/dashboard' },
    { icon: 'local_shipping', label: 'Shipments', href: '/shipments' },
    { icon: 'phone_in_talk', label: 'Calls', href: '/dashboard' },
    { icon: 'analytics', label: 'Analytics', href: '/dashboard' },
    { icon: 'settings', label: 'Settings', href: '/dashboard' },
  ]
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }
  return (
    <aside style={{ width: 240, height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid #e4e2e4', background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 16px', zIndex: 50 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>NDR Rescue</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(n => (
            <a key={n.label} href={n.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: active === n.label ? '#f0edef' : 'transparent', color: active === n.label ? '#0f172a' : '#45464d', textDecoration: 'none', fontSize: 13, fontWeight: active === n.label ? 600 : 500 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{n.icon}</span>
              {n.label}
            </a>
          ))}
        </nav>
      </div>
      <div>
        <div style={{ height: 1, background: '#e4e2e4', margin: '0 0 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#e4e2e4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#45464d' }}>person</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#1b1b1d' }}>Ops Team</span>
          </div>
          <button id="logout-btn" onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#76777d', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}

const STATE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  FAILED_ATTEMPT: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  CALL_SCHEDULED: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  REDELIVERY_CONFIRMED: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  CANCELED: { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
}
const CALL_STATE_STYLE: Record<string, { color: string; icon: string }> = {
  QUEUED: { color: '#d97706', icon: 'schedule' },
  IN_PROGRESS: { color: '#2563eb', icon: 'phone_in_talk' },
  COMPLETED: { color: '#059669', icon: 'check_circle' },
  FAILED: { color: '#b91c1c', icon: 'cancel' },
}

function TranscriptBubble({ text, role }: { text: string; role: 'ai' | 'customer' }) {
  const isAI = role === 'ai'
  return (
    <div style={{ display: 'flex', justifyContent: isAI ? 'flex-start' : 'flex-end', marginBottom: 12 }}>
      <div style={{
        maxWidth: '72%', padding: '10px 14px', borderRadius: isAI ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
        background: isAI ? '#0f172a' : '#f0edef',
        color: isAI ? '#fff' : '#1b1b1d', fontSize: 13, lineHeight: 1.5,
      }}>
        {!isAI && <span style={{ fontSize: 10, fontWeight: 600, color: '#76777d', display: 'block', marginBottom: 4 }}>Customer</span>}
        {isAI && <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.6)', display: 'block', marginBottom: 4 }}>AI Agent (Priya)</span>}
        {text}
      </div>
    </div>
  )
}

function parseTranscript(raw: string | null | undefined) {
  if (!raw) return []
  return raw.split('\n').filter(Boolean).map((line, i) => {
    const isAgent = line.toLowerCase().startsWith('agent:') || line.toLowerCase().startsWith('ai:') || i % 2 === 0
    const text = line.replace(/^(agent:|ai:|customer:)/i, '').trim()
    return { role: isAgent ? 'ai' as const : 'customer' as const, text }
  })
}

export default function ShipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [shipment, setShipment] = useState<ShipmentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)

  async function load() {
    const res = await fetch(`/api/shipments/${id}`)
    if (res.ok) { const d = await res.json(); setShipment(d) }
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function simulateWebhook() {
    setSimulating(true)
    try {
      const res = await fetch('/api/dev/simulate-bolna-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipmentId: id }) })
      const data = await res.json()
      if (res.ok) {
        toast.success('Webhook simulated — refreshing…')
        setTimeout(() => load(), 600)
      } else {
        toast.error(data.error || 'Simulation failed')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setSimulating(false)
    }
  }

  if (loading) return (
    <>
      <link href={GFONT} rel="stylesheet" />
      <link href={GICON} rel="stylesheet" />
      <style>{`* { font-family: 'Inter', sans-serif; } body { margin: 0; background: #f8fafc; }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}><Sidebar active="Shipments" />
        <main style={{ marginLeft: 240, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#9ca3af' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
            Loading shipment…
          </div>
        </main>
      </div>
    </>
  )

  if (!shipment) return null

  const latestCall = shipment.callExecutions?.[0]
  const sc = STATE_STYLE[shipment.state] || STATE_STYLE.CANCELED
  const transcriptLines = parseTranscript(latestCall?.transcript)

  return (
    <>
      <link href={GFONT} rel="stylesheet" />
      <link href={GICON} rel="stylesheet" />
      <style>{`* { font-family: 'Inter', sans-serif; box-sizing: border-box; } body { margin: 0; background: #f8fafc; }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar active="Shipments" />
        <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
          {/* Header */}
          <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e4e2e4', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/shipments')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#76777d', padding: '4px 6px', borderRadius: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
            </button>
            <span style={{ color: '#9ca3af', fontSize: 13 }}>Shipments</span>
            <span style={{ color: '#c6c6cd' }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>{shipment.trackingNumber}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {shipment.state.replace(/_/g, ' ')}
              </span>
            </div>
          </header>

          <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
            {/* Top 2-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {/* Shipment Details */}
              <div style={{ background: '#fff', border: '1px solid #e4e2e4', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>Shipment Details</h2>
                  {shipment.state === 'REDELIVERY_CONFIRMED' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: 999 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Recovered
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { icon: 'tag', label: 'Tracking #', value: shipment.trackingNumber, mono: true },
                    { icon: 'person', label: 'Customer', value: shipment.customerName },
                    { icon: 'phone', label: 'Phone', value: shipment.customerPhone, mono: true },
                    { icon: 'location_on', label: 'Drop Address', value: shipment.dropAddress },
                    { icon: 'warning', label: 'Failure Reason', value: shipment.failureReason.replace(/_/g, ' '), chip: true, chipColor: '#fef2f2', chipText: '#b91c1c', chipBorder: '#fecaca' },
                    { icon: 'verified', label: 'Consent', value: shipment.consentObtained ? 'Obtained ✓' : 'Not obtained', valueColor: shipment.consentObtained ? '#059669' : '#b91c1c' },
                    ...(shipment.expectedSlot ? [{ icon: 'calendar_today', label: 'Booked Slot', value: shipment.expectedSlot, highlight: true }] : []),
                  ].map(f => (
                    <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#9ca3af', marginTop: 2, flexShrink: 0 }}>{f.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', margin: '0 0 2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{f.label}</p>
                        {f.chip ? (
                          <span style={{ display: 'inline-flex', fontSize: 12, fontWeight: 600, background: f.chipColor, color: f.chipText, border: `1px solid ${f.chipBorder}`, padding: '2px 10px', borderRadius: 999 }}>{f.value}</span>
                        ) : f.highlight ? (
                          <span style={{ display: 'inline-flex', fontSize: 13, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '3px 12px', borderRadius: 999 }}>{f.value}</span>
                        ) : (
                          <p style={{ fontSize: 13, fontWeight: 500, color: f.valueColor || '#1b1b1d', margin: 0, fontFamily: f.mono ? 'monospace' : 'inherit' }}>{f.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call Timeline */}
              <div style={{ background: '#fff', border: '1px solid #e4e2e4', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>Call Timeline</h2>
                  {shipment.state === 'CALL_SCHEDULED' && (
                    <button
                      id="simulate-webhook-btn"
                      onClick={simulateWebhook}
                      disabled={simulating}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: simulating ? '#374151' : '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: simulating ? 'not-allowed' : 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_arrow</span>
                      {simulating ? 'Simulating…' : 'Simulate Webhook'}
                    </button>
                  )}
                </div>

                {shipment.callExecutions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9ca3af' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>phone_missed</span>
                    <p style={{ fontSize: 13, margin: 0 }}>No calls yet</p>
                    <p style={{ fontSize: 12, margin: '4px 0 0' }}>Trigger a call from the shipments list</p>
                  </div>
                ) : (
                  <>
                    {shipment.callExecutions.map((call, idx) => {
                      const cs = CALL_STATE_STYLE[call.state] || CALL_STATE_STYLE.QUEUED
                      return (
                        <div key={call.id} style={{ position: 'relative', paddingLeft: 28, marginBottom: 20 }}>
                          {idx < shipment.callExecutions.length - 1 && (
                            <div style={{ position: 'absolute', left: 9, top: 24, width: 2, height: 'calc(100% + 8px)', background: '#e4e2e4' }} />
                          )}
                          <div style={{ position: 'absolute', left: 0, top: 4, width: 18, height: 18, borderRadius: '50%', background: cs.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 11, color: '#fff', fontVariationSettings: "'FILL' 1" }}>{cs.icon}</span>
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#1b1b1d' }}>Call {call.state.replace(/_/g, ' ')}</span>
                              {call.finalOutcome && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 999 }}>
                                  {call.finalOutcome.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 11, color: '#9ca3af', margin: '0 0 4px', fontFamily: 'monospace' }}>
                              {new Date(call.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p style={{ fontSize: 10, color: '#c6c6cd', margin: 0, fontFamily: 'monospace' }}>{call.id.slice(0, 20)}…</p>
                          </div>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>

            {/* Transcript */}
            {latestCall?.transcript && (
              <div style={{ background: '#fff', border: '1px solid #e4e2e4', borderRadius: 12, padding: 24, marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>AI Call Transcript</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, background: '#f0edef', color: '#45464d', padding: '3px 10px', borderRadius: 999, fontWeight: 500 }}>2m 13s</span>
                    <button style={{ background: 'none', border: '1px solid #e4e2e4', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#45464d', display: 'flex', alignItems: 'center' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                    </button>
                  </div>
                </div>
                <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, maxHeight: 360, overflowY: 'auto' }}>
                  {transcriptLines.length > 0 ? transcriptLines.map((line, i) => (
                    <TranscriptBubble key={i} role={line.role} text={line.text} />
                  )) : (
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, color: '#45464d', lineHeight: 1.6 }}>{latestCall.transcript}</div>
                  )}
                </div>
              </div>
            )}

            {/* Extracted Data */}
            {latestCall?.extractedData && (
              <div style={{ background: '#fff', border: '1px solid #e4e2e4', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', margin: 0 }}>AI Extracted Data</h2>
                  <span style={{ fontSize: 11, background: '#f0edef', color: '#45464d', padding: '3px 10px', borderRadius: 999, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>auto_awesome</span>
                    Auto-analyzed
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                  {Object.entries(latestCall.extractedData).map(([k, v]) => {
                    const icons: Record<string, string> = { redelivery_slot: 'calendar_today', consent: 'verified', address_update: 'location_on', will_pickup: 'store', cancel: 'cancel', escalate: 'support_agent' }
                    const isHighlight = k === 'redelivery_slot' && v
                    return (
                      <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 8, background: isHighlight ? '#eff6ff' : '#f8fafc', border: isHighlight ? '1px solid #bfdbfe' : '1px solid #f0edef' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16, color: isHighlight ? '#2563eb' : '#9ca3af', marginTop: 1 }}>{icons[k] || 'data_object'}</span>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: isHighlight ? '#1d4ed8' : '#9ca3af', margin: '0 0 3px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</p>
                          <p style={{ fontSize: 13, fontWeight: 600, color: v === null || v === false ? '#c6c6cd' : isHighlight ? '#1d4ed8' : '#1b1b1d', margin: 0 }}>
                            {v === null ? 'null' : v === true ? 'true' : v === false ? 'false' : String(v)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  )
}
