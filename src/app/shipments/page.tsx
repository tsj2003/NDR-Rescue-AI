'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const GFONT = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
const GICON = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'

type Shipment = {
  id: string; trackingNumber: string; customerName: string; customerPhone: string
  failureReason: string; state: string; updatedAt: string
}

const STATE_LABELS: Record<string, string> = {
  FAILED_ATTEMPT: 'Failed Attempt',
  CALL_SCHEDULED: 'Call Scheduled',
  REDELIVERY_CONFIRMED: 'Recovered',
  CANCELED: 'Canceled',
}
const STATE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  FAILED_ATTEMPT: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
  CALL_SCHEDULED: { bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
  REDELIVERY_CONFIRMED: { bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  CANCELED: { bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
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
            <a key={n.label} href={n.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
              background: active === n.label ? '#f0edef' : 'transparent',
              color: active === n.label ? '#0f172a' : '#45464d',
              textDecoration: 'none', fontSize: 13, fontWeight: active === n.label ? 600 : 500,
              transition: 'all 0.15s',
            }}>
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

export default function ShipmentsPage() {
  const router = useRouter()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [triggering, setTriggering] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/shipments').then(r => r.json()).then(d => { setShipments(Array.isArray(d) ? d : d.shipments ?? []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  async function triggerCall(shipmentId: string) {
    setTriggering(shipmentId)
    try {
      const res = await fetch('/api/trigger-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipmentId }) })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Call queued — ID: ${data.callId?.slice(0, 8)}…`, { duration: 4000 })
        const updated = await fetch('/api/shipments').then(r => r.json())
        setShipments(Array.isArray(updated) ? updated : updated.shipments ?? [])
      } else {
        toast.error(data.error || 'Failed to trigger call')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setTriggering(null)
    }
  }

  const tabs = ['All', 'Failed Attempt', 'Call Scheduled', 'Recovered']
  const stateMap: Record<string, string> = { 'Failed Attempt': 'FAILED_ATTEMPT', 'Call Scheduled': 'CALL_SCHEDULED', 'Recovered': 'REDELIVERY_CONFIRMED' }

  const filtered = shipments.filter(s => {
    const matchesSearch = !search || s.trackingNumber.toLowerCase().includes(search.toLowerCase()) || s.customerName.toLowerCase().includes(search.toLowerCase())
    const matchesTab = activeTab === 'All' || s.state === stateMap[activeTab]
    return matchesSearch && matchesTab
  })

  const counts = {
    All: shipments.length,
    'Failed Attempt': shipments.filter(s => s.state === 'FAILED_ATTEMPT').length,
    'Call Scheduled': shipments.filter(s => s.state === 'CALL_SCHEDULED').length,
    'Recovered': shipments.filter(s => s.state === 'REDELIVERY_CONFIRMED').length,
  }

  return (
    <>
      <link href={GFONT} rel="stylesheet" />
      <link href={GICON} rel="stylesheet" />
      <style>{`* { font-family: 'Inter', sans-serif; box-sizing: border-box; } body { margin: 0; background: #f8fafc; }
      tr:hover td { background: #fafafa; }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar active="Shipments" />
        <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
          {/* Header */}
          <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e4e2e4', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Shipments</h1>
              <p style={{ fontSize: 12, color: '#76777d', margin: '2px 0 0', fontWeight: 400 }}>
                {shipments.filter(s => s.state === 'FAILED_ATTEMPT').length} failed deliveries pending AI recovery
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#9ca3af' }}>search</span>
                <input
                  id="shipment-search"
                  placeholder="Search by tracking, customer…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ height: 36, paddingLeft: 36, paddingRight: 12, border: '1px solid #e4e2e4', borderRadius: 8, fontSize: 13, color: '#1b1b1d', background: '#fff', outline: 'none', width: 240 }}
                />
              </div>
              <button onClick={() => toast.info('Export coming soon!')} style={{ height: 36, padding: '0 14px', border: '1px solid #e4e2e4', borderRadius: 8, background: '#fff', fontSize: 13, fontWeight: 500, color: '#374151', cursor: 'pointer' }}>
                Export CSV
              </button>
            </div>
          </header>

          <div style={{ padding: 32 }}>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {tabs.map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: '1px solid',
                  background: activeTab === t ? '#0f172a' : '#fff',
                  color: activeTab === t ? '#fff' : '#45464d',
                  borderColor: activeTab === t ? '#0f172a' : '#e4e2e4',
                  transition: 'all 0.15s',
                }}>
                  {t} ({counts[t as keyof typeof counts]})
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid #e4e2e4', borderRadius: 12, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e4e2e4' }}>
                    {['TRACKING #', 'CUSTOMER', 'PHONE', 'FAILURE REASON', 'STATUS', 'UPDATED', 'ACTIONS'].map(h => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 600, color: '#9ca3af', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>Loading shipments…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#9ca3af' }}>No shipments found</td></tr>
                  ) : filtered.map(s => {
                    const sc = STATE_STYLE[s.state] || STATE_STYLE.CANCELED
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid #f0edef', cursor: 'pointer', transition: 'background 0.1s' }}
                        onClick={() => router.push(`/shipments/${s.id}`)}>
                        <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', fontSize: 12 }}>{s.trackingNumber}</td>
                        <td style={{ padding: '14px 20px', color: '#1b1b1d', fontWeight: 500 }}>{s.customerName}</td>
                        <td style={{ padding: '14px 20px', color: '#45464d', fontFamily: 'monospace', fontSize: 12 }}>{s.customerPhone}</td>
                        <td style={{ padding: '14px 20px', color: '#45464d' }}>{s.failureReason.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '14px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                            {STATE_LABELS[s.state] || s.state}
                          </span>
                        </td>
                        <td style={{ padding: '14px 20px', color: '#9ca3af', fontSize: 12 }}>
                          {new Date(s.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '14px 20px' }} onClick={e => e.stopPropagation()}>
                          {s.state === 'FAILED_ATTEMPT' ? (
                            <button
                              id={`trigger-call-${s.id}`}
                              onClick={() => triggerCall(s.id)}
                              disabled={triggering === s.id}
                              style={{ padding: '6px 14px', background: triggering === s.id ? '#374151' : '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: triggering === s.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
                              {triggering === s.id ? '…' : 'Trigger Call'}
                            </button>
                          ) : (
                            <button
                              onClick={() => router.push(`/shipments/${s.id}`)}
                              style={{ padding: '6px 14px', background: '#fff', color: '#374151', border: '1px solid #e4e2e4', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ padding: '12px 20px', borderTop: '1px solid #f0edef', fontSize: 12, color: '#9ca3af' }}>
                Showing {filtered.length} of {shipments.length} shipments
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
