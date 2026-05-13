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
            }}
              onMouseEnter={e => { if (active !== n.label) (e.currentTarget as HTMLElement).style.background = '#f6f3f5' }}
              onMouseLeave={e => { if (active !== n.label) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
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

function statusBadge(state: string) {
  const map: Record<string, { label: string; bg: string; color: string; border: string }> = {
    FAILED_ATTEMPT: { label: 'Failed', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
    CALL_SCHEDULED: { label: 'Scheduled', bg: '#fffbeb', color: '#92400e', border: '#fde68a' },
    REDELIVERY_CONFIRMED: { label: 'Recovered', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
    CANCELED: { label: 'Canceled', bg: '#f9fafb', color: '#374151', border: '#e5e7eb' },
  }
  const c = map[state] || { label: state, bg: '#f0edef', color: '#45464d', border: '#e4e2e4' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [today, setToday] = useState('')

  useEffect(() => {
    setToday(new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }))
    // Load dashboard + recent shipments in parallel
    Promise.all([
      fetch('/api/dashboard').then(r => r.json()),
      fetch('/api/shipments').then(r => r.json()),
    ]).then(([dash, ships]) => {
      const shipList = Array.isArray(ships) ? ships : ships.shipments ?? []
      setData({ ...dash, recentShipments: shipList })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <>
      <link href={GFONT} rel="stylesheet" />
      <link href={GICON} rel="stylesheet" />
      <style>{`* { font-family: 'Inter', sans-serif; box-sizing: border-box; } body { margin: 0; background: #f8fafc; }`}</style>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar active="Overview" />
        <main style={{ marginLeft: 240, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Header */}
          <header style={{ position: 'sticky', top: 0, zIndex: 40, width: '100%', background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid #e4e2e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, padding: '0 32px' }}>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#0f172a', margin: 0, letterSpacing: '-0.01em' }}>Overview</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <span style={{ fontSize: 13, color: '#76777d', fontWeight: 500 }}>Today: {today}</span>
              <button onClick={() => toast.info('Batch call feature coming soon!')} style={{ background: '#0f172a', color: '#fff', padding: '8px 16px', borderRadius: 10, border: 'none', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
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
                { label: 'Calls In Progress', value: loading ? '—' : String(data?.inProgressShipments ?? 0), sub: 'Active right now', subColor: '#d97706', valueColor: data?.inProgressShipments ? '#d97706' : '#1b1b1d' },
                { label: 'Avg Resolution Time', value: '4m 32s', sub: 'Industry avg: 48hrs', subColor: '#76777d' },
              ].map(card => (
                <div key={card.label} style={{ background: '#fff', border: '1px solid #e4e2e4', borderRadius: 12, padding: 24, transition: 'box-shadow 0.2s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow = 'none'}>
                  <p style={{ fontSize: 12, fontWeight: 500, color: '#76777d', margin: '0 0 8px', letterSpacing: '0.02em' }}>{card.label}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 30, fontWeight: 700, color: card.valueColor || '#1b1b1d', letterSpacing: '-0.02em' }}>{card.value}</span>
                    {card.icon && <span className="material-symbols-outlined" style={{ color: '#059669', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{card.icon}</span>}
                  </div>
                  <p style={{ fontSize: 12, color: card.subColor, margin: '4px 0 0', fontWeight: 500 }}>{card.sub}</p>
                </div>
              ))}
            </div>

            {/* Trend Chart */}
            <div style={{ background: '#fff', border: '1px solid #e4e2e4', borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>Recovery Rate — Last 7 Days</h2>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 500, color: '#0f172a', background: '#dae2fd', padding: '4px 10px', borderRadius: 999 }}>
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
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0edef" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#76777d' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#76777d' }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                        <Tooltip formatter={(v) => [`${Number(v ?? 0)}%`, 'Recovery Rate']} contentStyle={{ borderRadius: 8, border: '1px solid #e4e2e4', fontSize: 12 }} />
                        <Area type="monotone" dataKey="rate" stroke="#2563eb" strokeWidth={2} fill="url(#grad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )
                })() : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#9ca3af', fontSize: 13 }}>No trend data yet — trigger some calls to see recovery rates</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Shipments Table */}
            <div style={{ background: '#fff', border: '1px solid #e4e2e4', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #e4e2e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#0f172a', margin: 0 }}>Recent Shipments</h2>
                <a href="/shipments" style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  View all <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
                </a>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e4e2e4' }}>
                    {['Tracking #', 'Customer', 'Status', 'Last Action', 'Time'].map(h => (
                      <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#76777d', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} style={{ padding: '32px 24px', textAlign: 'center', color: '#9ca3af' }}>Loading…</td></tr>
                  ) : (data?.recentShipments ?? []).slice(0, 5).map(s => (
                    <tr key={s.trackingNumber}
                      style={{ borderBottom: '1px solid #f0edef', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fafafa'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <td style={{ padding: '14px 24px', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{s.trackingNumber}</td>
                      <td style={{ padding: '14px 24px', color: '#45464d' }}>{s.customerName}</td>
                      <td style={{ padding: '14px 24px' }}>{statusBadge(s.state)}</td>
                      <td style={{ padding: '14px 24px', color: '#76777d' }}>
                        {s.state === 'FAILED_ATTEMPT' ? 'Awaiting call' : s.state === 'CALL_SCHEDULED' ? 'Call in queue' : 'Slot booked'}
                      </td>
                      <td style={{ padding: '14px 24px', color: '#9ca3af', fontSize: 12 }}>
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
