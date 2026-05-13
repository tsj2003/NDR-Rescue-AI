'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
    <aside style={{ width: 240, height: '100vh', position: 'fixed', left: 0, top: 0, borderRight: '1px solid rgba(6,78,59,0.15)', background: '#f7f5ed', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '24px 16px', zIndex: 50 }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 32 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
          </div>
          <span style={{ fontSize: 17, fontWeight: 900, color: '#064e3b', letterSpacing: '-0.02em', fontFamily: "'Inter', sans-serif" }}>NDR Rescue</span>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(n => (
            <a key={n.label} href={n.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: active === n.label ? 'rgba(6,78,59,0.08)' : 'transparent', color: active === n.label ? '#064e3b' : '#334155', textDecoration: 'none', fontSize: 13, fontWeight: active === n.label ? 600 : 500, transition: 'all 0.15s', fontFamily: "'Inter', sans-serif" }}
              onMouseEnter={e => { if (active !== n.label) (e.currentTarget as HTMLElement).style.background = 'rgba(6,78,59,0.04)' }}
              onMouseLeave={e => { if (active !== n.label) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{n.icon}</span>
              {n.label}
            </a>
          ))}
        </nav>
      </div>
      <div>
        <div style={{ height: 1, background: 'rgba(6,78,59,0.15)', margin: '0 0 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,78,59,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#064e3b' }}>person</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#064e3b', fontFamily: "'Inter', sans-serif" }}>Ops Team</span>
          </div>
          <button id="logout-btn" onClick={logout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
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
  CANCELED: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
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
        maxWidth: '72%', padding: '12px 16px', borderRadius: isAI ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        background: isAI ? '#064e3b' : '#fff', border: isAI ? 'none' : '1px solid rgba(6,78,59,0.15)',
        color: isAI ? '#fff' : '#064e3b', fontSize: 14, lineHeight: 1.5, fontFamily: "'Inter', sans-serif",
        boxShadow: isAI ? '0 4px 12px rgba(6,78,59,0.2)' : '0 2px 8px rgba(6,78,59,0.05)'
      }}>
        {!isAI && <span style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Customer</span>}
        {isAI && <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Agent (Priya)</span>}
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

  useEffect(() => {
    if (!shipment) return
    const isCallActive = shipment.state === 'CALL_SCHEDULED' || shipment.callExecutions.some(c => c.state === 'QUEUED' || c.state === 'IN_PROGRESS')
    if (isCallActive) {
      const interval = setInterval(load, 3000)
      return () => clearInterval(interval)
    }
  }, [shipment?.state, shipment?.callExecutions?.[0]?.state])

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
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href={GICON} rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #f7f5ed; }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f5ed' }}><Sidebar active="Shipments" />
        <main style={{ marginLeft: 240, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#94a3b8' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
            <span style={{ fontFamily: "'Inter', sans-serif" }}>Loading shipment…</span>
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
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href={GICON} rel="stylesheet" />
      <style>{`* { font-family: 'Inter', sans-serif; box-sizing: border-box; } body { margin: 0; background: #f7f5ed; }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f5ed' }}>
        <Sidebar active="Shipments" />
        <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
          {/* Header */}
          <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(247,245,237,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(6,78,59,0.15)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => router.push('/shipments')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b', padding: '4px 6px', borderRadius: 6, transition: 'background 0.2s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(6,78,59,0.05)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='none'}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>arrow_back</span>
            </button>
            <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>Shipments</span>
            <span style={{ color: '#cbd5e1' }}>/</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#064e3b', fontFamily: 'monospace' }}>{shipment.trackingNumber}</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {shipment.state.replace(/_/g, ' ')}
              </span>
            </div>
          </header>

          <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
            {/* Top 2-col grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
              {/* Shipment Details */}
              <div style={{ background: '#fff', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px -10px rgba(6,78,59,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: '#064e3b', margin: 0 }}>Shipment Details</h2>
                  {shipment.state === 'REDELIVERY_CONFIRMED' && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '3px 10px', borderRadius: 999 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Recovered
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#94a3b8', marginTop: 2, flexShrink: 0 }}>{f.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#64748b', margin: '0 0 2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{f.label}</p>
                        {f.chip ? (
                          <span style={{ display: 'inline-flex', fontSize: 12, fontWeight: 600, background: f.chipColor, color: f.chipText, border: `1px solid ${f.chipBorder}`, padding: '2px 10px', borderRadius: 999 }}>{f.value}</span>
                        ) : f.highlight ? (
                          <span style={{ display: 'inline-flex', fontSize: 13, fontWeight: 600, background: '#d8b4fe', color: '#064e3b', padding: '3px 12px', borderRadius: 999 }}>{f.value}</span>
                        ) : (
                          <p style={{ fontSize: 14, fontWeight: 500, color: f.valueColor || '#334155', margin: 0, fontFamily: f.mono ? 'monospace' : 'inherit' }}>{f.value}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Call Timeline */}
              <div style={{ background: '#fff', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px -10px rgba(6,78,59,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: '#064e3b', margin: 0 }}>Call Timeline</h2>
                  {shipment.state === 'CALL_SCHEDULED' && (
                    <button
                      id="simulate-webhook-btn"
                      onClick={simulateWebhook}
                      disabled={simulating}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: simulating ? '#64748b' : '#064e3b', color: '#fff', border: 'none', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: simulating ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>play_arrow</span>
                      {simulating ? 'Simulating…' : 'Simulate Webhook'}
                    </button>
                  )}
                </div>

                {shipment.callExecutions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>phone_missed</span>
                    <p style={{ fontSize: 14, margin: 0, fontWeight: 500, color: '#64748b' }}>No calls yet</p>
                    <p style={{ fontSize: 13, margin: '4px 0 0' }}>Trigger a call from the shipments list</p>
                  </div>
                ) : (
                  <>
                    {shipment.callExecutions.map((call, idx) => {
                      const cs = CALL_STATE_STYLE[call.state] || CALL_STATE_STYLE.QUEUED
                      return (
                        <div key={call.id} style={{ position: 'relative', paddingLeft: 32, marginBottom: 20 }}>
                          {idx < shipment.callExecutions.length - 1 && (
                            <div style={{ position: 'absolute', left: 11, top: 24, width: 2, height: 'calc(100% + 8px)', background: 'rgba(6,78,59,0.1)' }} />
                          )}
                          <div style={{ position: 'absolute', left: 0, top: 2, width: 24, height: 24, borderRadius: '50%', background: cs.color, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 4px ${cs.color}20` }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: '#fff', fontVariationSettings: "'FILL' 1" }}>{cs.icon}</span>
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#064e3b' }}>Call {call.state.replace(/_/g, ' ')}</span>
                              {call.finalOutcome && (
                                <span style={{ fontSize: 10, fontWeight: 700, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '2px 8px', borderRadius: 999 }}>
                                  {call.finalOutcome.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 4px', fontFamily: 'monospace' }}>
                              {new Date(call.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p style={{ fontSize: 10, color: '#94a3b8', margin: 0, fontFamily: 'monospace' }}>{call.id.slice(0, 20)}…</p>
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
              <div style={{ background: '#fff', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 16, padding: 28, marginBottom: 24, boxShadow: '0 4px 20px -10px rgba(6,78,59,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: '#064e3b', margin: 0 }}>AI Call Transcript</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 11, background: 'rgba(6,78,59,0.05)', color: '#064e3b', padding: '4px 12px', borderRadius: 999, fontWeight: 600 }}>2m 13s</span>
                    <button style={{ background: 'none', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#064e3b', display: 'flex', alignItems: 'center', transition: 'background 0.2s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background='rgba(6,78,59,0.05)'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background='none'}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                    </button>
                  </div>
                </div>
                <div style={{ padding: 24, background: '#f7f5ed', borderRadius: 12, maxHeight: 400, overflowY: 'auto', border: '1px solid rgba(6,78,59,0.05)' }}>
                  {transcriptLines.length > 0 ? transcriptLines.map((line, i) => (
                    <TranscriptBubble key={i} role={line.role} text={line.text} />
                  )) : (
                    <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, color: '#334155', lineHeight: 1.6 }}>{latestCall.transcript}</div>
                  )}
                </div>
              </div>
            )}

            {/* Extracted Data */}
            {latestCall?.extractedData && (
              <div style={{ background: '#fff', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 16, padding: 28, boxShadow: '0 4px 20px -10px rgba(6,78,59,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                  <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: '#064e3b', margin: 0 }}>AI Extracted Data</h2>
                  <span style={{ fontSize: 11, background: '#d8b4fe', color: '#064e3b', padding: '4px 12px', borderRadius: 999, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
                    Auto-analyzed
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {Object.entries(latestCall.extractedData).map(([k, v]) => {
                    const icons: Record<string, string> = { redelivery_slot: 'calendar_today', consent: 'verified', address_update: 'location_on', will_pickup: 'store', cancel: 'cancel', escalate: 'support_agent' }
                    const isHighlight = k === 'redelivery_slot' && v
                    return (
                      <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, borderRadius: 12, background: isHighlight ? '#d8b4fe' : '#f7f5ed', border: isHighlight ? '1px solid #c084fc' : '1px solid rgba(6,78,59,0.1)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: isHighlight ? '#064e3b' : '#64748b', marginTop: 1 }}>{icons[k] || 'data_object'}</span>
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: isHighlight ? '#064e3b' : '#64748b', margin: '0 0 4px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: v === null || v === false ? '#94a3b8' : isHighlight ? '#064e3b' : '#064e3b', margin: 0 }}>
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
