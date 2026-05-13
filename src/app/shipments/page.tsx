'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const GICON = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'

type Shipment = {
  id: string; trackingNumber: string; customerName: string; customerPhone: string
  failureReason: string; state: string; updatedAt: string
}

type NewShipment = { customerName: string; customerPhone: string; dropAddress: string; failureReason: string }

const FAILURE_REASONS = [
  'ADDRESS_NOT_FOUND',
  'CUSTOMER_NOT_AVAILABLE',
  'GATE_LOCKED',
  'REFUSED_DELIVERY',
  'INCORRECT_ADDRESS',
  'RESCHEDULED_BY_CUSTOMER',
]

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
  CANCELED: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
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
            <a key={n.label} href={n.href} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8,
              background: active === n.label ? 'rgba(6,78,59,0.08)' : 'transparent',
              color: active === n.label ? '#064e3b' : '#334155',
              textDecoration: 'none', fontSize: 13, fontWeight: active === n.label ? 600 : 500,
              transition: 'all 0.15s', fontFamily: "'Inter', sans-serif"
            }}
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

export default function ShipmentsPage() {
  const router = useRouter()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('All')
  const [triggering, setTriggering] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<NewShipment>({ customerName: '', customerPhone: '', dropAddress: '', failureReason: 'ADDRESS_NOT_FOUND' })
  const [submitting, setSubmitting] = useState(false)
  const [editingPhone, setEditingPhone] = useState<{ id: string; value: string } | null>(null)

  async function reloadShipments() {
    const d = await fetch('/api/shipments').then(r => r.json())
    setShipments(Array.isArray(d) ? d : d.shipments ?? [])
  }

  useEffect(() => {
    reloadShipments().then(() => setLoading(false))
  }, [])

  useEffect(() => {
    const hasActiveCall = shipments.some(s => s.state === 'CALL_SCHEDULED')
    if (hasActiveCall) {
      const interval = setInterval(reloadShipments, 3000)
      return () => clearInterval(interval)
    }
  }, [shipments])

  async function triggerCall(shipmentId: string) {
    setTriggering(shipmentId)
    try {
      const res = await fetch('/api/trigger-call', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shipmentId }) })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Call queued — ID: ${data.callId?.slice(0, 8)}…`, { duration: 4000 })
        await reloadShipments()
      } else {
        toast.error(data.error || 'Failed to trigger call')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setTriggering(null)
    }
  }

  async function addShipment() {
    if (!form.customerName || !form.customerPhone || !form.dropAddress) {
      toast.error('Name, phone and address are required'); return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/shipments/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Shipment ${data.shipment.trackingNumber} created!`)
        setShowModal(false)
        setForm({ customerName: '', customerPhone: '', dropAddress: '', failureReason: 'ADDRESS_NOT_FOUND' })
        await reloadShipments()
      } else {
        toast.error(data.error || 'Failed to create shipment')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setSubmitting(false)
    }
  }

  async function savePhone(id: string, phone: string) {
    if (!phone.trim()) { setEditingPhone(null); return }
    try {
      const res = await fetch(`/api/shipments/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerPhone: phone }) })
      if (res.ok) {
        toast.success('Phone updated ✅')
        await reloadShipments()
      } else {
        toast.error('Failed to update phone')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setEditingPhone(null)
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
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href={GICON} rel="stylesheet" />
      <style>{`* { font-family: 'Inter', sans-serif; box-sizing: border-box; } body { margin: 0; background: #f7f5ed; }
      tr:hover td { background: rgba(6,78,59,0.02); }
      .modal-input { width: 100%; height: 38px; padding: 0 12px; border: 1px solid rgba(6,78,59,0.2); border-radius: 8px; font-size: 13px; outline: none; color: #064e3b; background: #fff; }
      .modal-input:focus { border-color: #064e3b; box-shadow: 0 0 0 3px rgba(6,78,59,0.1); }
      .modal-select { width: 100%; height: 38px; padding: 0 12px; border: 1px solid rgba(6,78,59,0.2); border-radius: 8px; font-size: 13px; outline: none; color: #064e3b; background: #fff; }
      `}</style>

      {/* Add Shipment Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,78,59,0.2)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowModal(false)}>
          <div style={{ background: '#f7f5ed', borderRadius: 16, padding: 32, width: 440, boxShadow: '0 24px 64px rgba(6,78,59,0.15)', border: '1px solid rgba(6,78,59,0.1)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontFamily: "'Instrument Serif', serif", fontSize: 28, color: '#064e3b' }}>Add Shipment</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 22 }}>✕</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>CUSTOMER NAME *</label>
                <input id="add-customer-name" className="modal-input" placeholder="e.g. Rahul Sharma"
                  value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PHONE NUMBER *</label>
                <input id="add-customer-phone" className="modal-input" placeholder="e.g. 9876543210"
                  value={form.customerPhone} onChange={e => setForm(f => ({ ...f, customerPhone: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>DELIVERY ADDRESS *</label>
                <input id="add-drop-address" className="modal-input" placeholder="e.g. 42 MG Road, Bengaluru"
                  value={form.dropAddress} onChange={e => setForm(f => ({ ...f, dropAddress: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FAILURE REASON</label>
                <select id="add-failure-reason" className="modal-select"
                  value={form.failureReason} onChange={e => setForm(f => ({ ...f, failureReason: e.target.value }))}>
                  {FAILURE_REASONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => setShowModal(false)}
                style={{ flex: 1, height: 44, border: '1px solid rgba(6,78,59,0.2)', borderRadius: 99, background: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#064e3b' }}>
                Cancel
              </button>
              <button id="add-shipment-submit" onClick={addShipment} disabled={submitting}
                style={{ flex: 2, height: 44, border: 'none', borderRadius: 99, background: submitting ? '#64748b' : '#064e3b', color: '#fff', fontSize: 13, fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}>
                {submitting ? 'Creating…' : '+ Add Shipment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f5ed' }}>
        <Sidebar active="Shipments" />
        <main style={{ marginLeft: 240, flex: 1, minHeight: '100vh' }}>
          {/* Header */}
          <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(247,245,237,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(6,78,59,0.15)', padding: '0 32px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color: '#064e3b', margin: 0, letterSpacing: '-0.01em' }}>Shipments</h1>
              <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                {shipments.filter(s => s.state === 'FAILED_ATTEMPT').length} failed deliveries pending AI recovery
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ position: 'relative' }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#94a3b8' }}>search</span>
                <input
                  id="shipment-search"
                  placeholder="Search by tracking, customer…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ height: 38, paddingLeft: 36, paddingRight: 12, border: '1px solid rgba(6,78,59,0.2)', borderRadius: 99, fontSize: 13, color: '#064e3b', background: '#fff', outline: 'none', width: 220, transition: 'all 0.2s' }}
                />
              </div>
              <button id="add-shipment-btn" onClick={() => setShowModal(true)}
                style={{ height: 38, padding: '0 16px', border: 'none', borderRadius: 99, background: '#064e3b', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>+</span> Add Shipment
              </button>
            </div>
          </header>

          <div style={{ padding: 32 }}>
            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
              {tabs.map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{
                  padding: '8px 16px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid',
                  background: activeTab === t ? '#d8b4fe' : '#fff',
                  color: activeTab === t ? '#064e3b' : '#64748b',
                  borderColor: activeTab === t ? '#c084fc' : 'rgba(6,78,59,0.15)',
                  transition: 'all 0.15s',
                }}>
                  {t} ({counts[t as keyof typeof counts]})
                </button>
              ))}
            </div>

            {/* Table */}
            <div style={{ background: '#fff', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(6,78,59,0.05)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(6,78,59,0.1)' }}>
                    {['TRACKING #', 'CUSTOMER', 'PHONE', 'FAILURE REASON', 'STATUS', 'UPDATED', 'ACTIONS'].map(h => (
                      <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>Loading shipments…</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>No shipments found</td></tr>
                  ) : filtered.map(s => {
                    const sc = STATE_STYLE[s.state] || STATE_STYLE.CANCELED
                    return (
                      <tr key={s.id} style={{ borderBottom: '1px solid rgba(6,78,59,0.05)', cursor: 'pointer', transition: 'background 0.1s' }}
                        onClick={() => router.push(`/shipments/${s.id}`)}>
                        <td style={{ padding: '16px 20px', fontFamily: 'monospace', fontWeight: 600, color: '#064e3b', fontSize: 13 }}>{s.trackingNumber}</td>
                        <td style={{ padding: '16px 20px', color: '#334155', fontWeight: 500 }}>{s.customerName}</td>
                        <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                          {editingPhone?.id === s.id ? (
                            <input
                              autoFocus
                              value={editingPhone.value}
                              onChange={e => setEditingPhone({ id: s.id, value: e.target.value })}
                              onBlur={() => savePhone(s.id, editingPhone.value)}
                              onKeyDown={e => { if (e.key === 'Enter') savePhone(s.id, editingPhone.value); if (e.key === 'Escape') setEditingPhone(null) }}
                              style={{ fontFamily: 'monospace', fontSize: 12, width: 140, padding: '4px 8px', border: '1px solid #064e3b', borderRadius: 6, outline: 'none' }}
                            />
                          ) : (
                            <span
                              title="Click to edit phone"
                              onClick={() => setEditingPhone({ id: s.id, value: s.customerPhone })}
                              style={{ fontFamily: 'monospace', fontSize: 12, color: '#334155', cursor: 'text', borderBottom: '1px dashed #cbd5e1', paddingBottom: 1 }}>
                              {s.customerPhone}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px', color: '#64748b', fontSize: 13 }}>{s.failureReason.replace(/_/g, ' ')}</td>
                        <td style={{ padding: '16px 20px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                            {STATE_LABELS[s.state] || s.state}
                          </span>
                        </td>
                        <td style={{ padding: '16px 20px', color: '#94a3b8', fontSize: 12 }}>
                          {new Date(s.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                          {s.state === 'FAILED_ATTEMPT' ? (
                            <button
                              id={`trigger-call-${s.id}`}
                              onClick={() => triggerCall(s.id)}
                              disabled={triggering === s.id}
                              style={{ padding: '6px 14px', background: triggering === s.id ? '#64748b' : '#064e3b', color: '#fff', border: 'none', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: triggering === s.id ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                              {triggering === s.id ? '…' : 'Trigger Call'}
                            </button>
                          ) : (
                            <button
                              onClick={() => router.push(`/shipments/${s.id}`)}
                              style={{ padding: '6px 14px', background: '#fff', color: '#064e3b', border: '1px solid rgba(6,78,59,0.2)', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(6,78,59,0.1)', fontSize: 12, color: '#94a3b8' }}>
                Showing {filtered.length} of {shipments.length} shipments
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
