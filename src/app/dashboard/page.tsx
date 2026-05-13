'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const GFONT = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
const GICON = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200'

type DashData = {
  totalShipments: number
  recoveredShipments: number
  inProgressShipments: number
  recoveryRate: string
  weeklyTrend: { date: string; recovered: number; failed: number }[]
  recentShipments?: { trackingNumber: string; customerName: string; state: string; updatedAt: string }[]
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

function statusBadge(state: string) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    FAILED_ATTEMPT: { label: 'Failed', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    CALL_SCHEDULED: { label: 'Scheduled', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
    REDELIVERY_CONFIRMED: { label: 'Recovered', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    CANCELED: { label: 'Canceled', bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
  }
  const c = map[state] || { label: state, bg: '#f8fafc', color: '#475569', border: '#e2e8f0' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontFamily: "'Inter', sans-serif" }}>
      {c.label}
    </span>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState('')

  async function loadData() {
    try {
      const [dash, ships] = await Promise.all([
        fetch('/api/dashboard').then(r => r.json()),
        fetch('/api/shipments').then(r => r.json()),
      ])
      const shipList = Array.isArray(ships) ? ships : ships.shipments ?? []
      setData({ ...dash, recentShipments: shipList })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))
    loadData()
  }, [])

  useEffect(() => {
    // Poll the dashboard every 3 seconds if there are active calls
    if (data?.inProgressShipments || data?.recentShipments?.some((s: any) => s.state === 'CALL_SCHEDULED')) {
      const interval = setInterval(loadData, 3000)
      return () => clearInterval(interval)
    }
  }, [data])

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href={GICON} rel="stylesheet" />
      <style>{`* { box-sizing: border-box; } body { margin: 0; background: #f7f5ed; }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f7f5ed' }}>
        <Sidebar active="Overview" />
        <main style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Header */}
          <header style={{ position: 'sticky', top: 0, zIndex: 40, width: '100%', background: 'rgba(247,245,237,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(6,78,59,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, padding: '0 32px' }}>
            <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, color: '#064e3b', margin: 0, letterSpacing: '-0.01em' }}>Overview</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#64748b', fontWeight: 500 }}>Today: {today}</span>
              <button onClick={() => toast.info('Batch call feature coming soon!')} style={{ background: '#d8b4fe', color: '#064e3b', padding: '8px 16px', borderRadius: 99, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif", transition: 'all 0.2s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#c084fc'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#d8b4fe'}>
                Trigger Batch Call
              </button>
            </div>
          </header>

          <div style={{ padding: 32, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 24 }}>
              {[
                { label: 'Total NDRs', value: loading ? '—' : String(data?.totalShipments ?? 0), sub: 'Shipments tracked', subColor: '#059669' },
                { label: 'Recovered', value: loading ? '—' : String(data?.recoveredShipments ?? 0), sub: `${loading ? '—' : data?.recoveryRate ?? '0'}% rate`, subColor: '#059669', icon: 'check_circle' },
                { label: 'Calls In Progress', value: loading ? '—' : String(data?.inProgressShipments ?? 0), sub: 'Active right now', subColor: '#d97706', valueColor: data?.inProgressShipments ? '#d97706' : '#064e3b' },
                { label: 'Avg Resolution Time', value: '4m 32s', sub: 'Industry avg: 48hrs', subColor: '#64748b' },
              ].map(card => (
                <div key={card.label} style={{ background: '#fff', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 16, padding: 24, transition: 'box-shadow 0.2s', boxShadow: '0 4px 20px -10px rgba(6,78,59,0.05)' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 10px 30px -10px rgba(6,78,59,0.1)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 20px -10px rgba(6,78,59,0.05)'}>
                  <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 600, color: '#64748b', margin: '0 0 8px', letterSpacing: '0.02em', textTransform: 'uppercase' }}>{card.label}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: "'Instrument Serif', serif", fontSize: 40, color: card.valueColor || '#064e3b', letterSpacing: '-0.02em', lineHeight: 1 }}>{card.value}</span>
                    {card.icon && <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>}
                  </div>
                  <p style={{ fontSize: 12, color: card.subColor, margin: '4px 0 0', fontWeight: 500 }}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Trend Chart */}
            <div style={{ background: '#fff', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 4px 20px -10px rgba(6,78,59,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: '#064e3b', margin: 0 }}>Recovery Rate — Last 7 Days</h2>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: '#064e3b', background: '#d8b4fe', padding: '4px 10px', borderRadius: 999 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>smart_toy</span>
                  Powered by AI
                </span>
              </div>
              <div style={{ height: 220 }}>
                {data?.weeklyTrend && data.weeklyTrend.length > 0 ? (() => {
                  // compute rate% per day for chart
                  const chartData = data.weeklyTrend.map(d => ({
                    date: d.date,
                    rate: (d.recovered + d.failed) > 0
                      ? Math.round((d.recovered / (d.recovered + d.failed)) * 100)
                      : d.recovered > 0 ? 100 : 0
                  }))
                  return (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                        <defs>
                          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#064e3b" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#064e3b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,78,59,0.1)" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Inter' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#64748b', fontFamily: 'Inter' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                        <Tooltip formatter={(v) => [`${Number(v ?? 0)}%`, 'Recovery Rate']} contentStyle={{ borderRadius: 12, border: '1px solid rgba(6,78,59,0.15)', fontSize: 12, fontFamily: 'Inter' }} />
                        <Area type="monotone" dataKey="rate" stroke="#064e3b" strokeWidth={2} fill="url(#grad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
                })() : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'Inter' }}>No trend data yet — trigger some calls to see recovery rates</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Shipments Table */}
            <div style={{ background: '#fff', border: '1px solid rgba(6,78,59,0.15)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px -10px rgba(6,78,59,0.05)' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(6,78,59,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 24, color: '#064e3b', margin: 0 }}>Recent Shipments</h2>
                <a href="/shipments" style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: '#064e3b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View all <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </a>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, fontFamily: "'Inter', sans-serif" }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(6,78,59,0.1)' }}>
                    {['Tracking #', 'Customer', 'Status', 'Last Action', 'Time'].map(h => (
                      <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding: '32px 24px', textAlign: 'center', color: '#94a3b8' }}>Loading…</td></tr>
                  ) : (data?.recentShipments ?? []).slice(0, 5).map(s => (
                    <tr key={s.trackingNumber}
                      style={{ borderBottom: '1px solid rgba(6,78,59,0.05)', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,78,59,0.02)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '16px 24px', fontFamily: 'monospace', fontWeight: 600, color: '#064e3b', fontSize: 13 }}>{s.trackingNumber}</td>
                      <td style={{ padding: '16px 24px', color: '#334155', fontWeight: 500 }}>{s.customerName}</td>
                      <td style={{ padding: '16px 24px' }}>{statusBadge(s.state)}</td>
                      <td style={{ padding: '16px 24px', color: '#64748b', fontSize: 13 }}>
                        {s.state === 'FAILED_ATTEMPT' ? 'Awaiting call' : s.state === 'CALL_SCHEDULED' ? 'Call in queue' : 'Slot booked'}
                      </td>
                      <td style={{ padding: '16px 24px', color: '#94a3b8', fontSize: 12 }}>
                        {new Date(s.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </>
  )
}
