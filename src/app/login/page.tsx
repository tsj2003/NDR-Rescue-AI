'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('demo@logistics.com')
  const [password, setPassword] = useState('demo1234')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        router.push('/dashboard')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Invalid credentials')
      }
    } catch {
      toast.error('Connection error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <style>{`
        * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
        html, body, #__next { height: 100%; margin: 0; }
        .gradient-panel {
          background: linear-gradient(to bottom right, #0f172a, #1e1b4b);
          position: relative; overflow: hidden;
        }
        .grid-overlay {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .floating-input { position: relative; margin-bottom: 1.5rem; }
        .floating-input input {
          width: 100%; height: 48px; padding: 1rem 2.5rem 0 1rem;
          border: 1px solid #e2e8f0; border-radius: 0.5rem;
          background-color: transparent; font-family: 'Inter', sans-serif;
          color: #1b1b1d; font-size: 14px; transition: all 0.2s ease;
        }
        .floating-input input:focus {
          outline: none; border-color: #0f172a;
          box-shadow: 0 0 0 4px rgba(15,23,42,0.1);
        }
        .floating-input label {
          position: absolute; left: 1rem; top: 50%;
          transform: translateY(-50%); color: #76777d;
          font-size: 0.875rem; transition: all 0.2s ease;
          pointer-events: none;
        }
        .floating-input input:focus + label,
        .floating-input input:not(:placeholder-shown) + label {
          top: 0.45rem; font-size: 0.7rem; transform: translateY(0); color: #0f172a;
        }
        .shimmer-btn { position: relative; overflow: hidden; }
        .shimmer-btn::after {
          content: ''; position: absolute; top: 0; left: -100%;
          width: 50%; height: 100%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.12), transparent);
          transform: skewX(-20deg);
        }
        .shimmer-btn:hover::after { left: 150%; transition: left 0.7s ease-in-out; }
      `}</style>
      <div style={{ display: 'flex', height: '100vh', background: '#f8fafc' }}>
        {/* LEFT — gradient panel */}
        <div className="gradient-panel" style={{ width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '4rem', position: 'relative' }}>
          <div className="grid-overlay" />
          <div style={{ position: 'relative', zIndex: 10, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', lineHeight: 1.15, marginBottom: '2rem', letterSpacing: '-0.03em' }}>
              Recover failed<br />deliveries.<br />Automatically.
            </h1>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '3rem' }}>
              {['63% recovery rate', '<5 min response', '₹4 per call'].map(s => (
                <div key={s} style={{ padding: '8px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(4px)' }}>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 500 }}>{s}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '8px' }}>How it works</p>
              {[
                ['1', 'Failed delivery detected', 'NDR flags the shipment'],
                ['2', 'AI calls customer', 'Bolna voice agent in <5 min'],
                ['3', 'Slot booked', 'DB updated, team notified'],
              ].map(([n, t, s]) => (
                <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#fff', marginTop: 1 }}>{n}</div>
                  <div>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: 13, margin: 0 }}>{t}</p>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, margin: 0 }}>{s}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ position: 'relative', zIndex: 10 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px' }}>Trusted by</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', opacity: 0.7 }}>
              {['Apex Logistics', 'Global Logistics', 'Swift Delivery'].map(b => (
                <span key={b} style={{ color: '#fff', fontWeight: 800, fontSize: 18 }}>{b}</span>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — login form */}
        <div style={{ width: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', background: '#f8fafc' }}>
          <div style={{ width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2.5rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '8px', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>inventory_2</span>
              </div>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>NDR Rescue</span>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1b1b1d', margin: '0 0 6px', letterSpacing: '-0.02em' }}>Sign in to your workspace</h2>
              <p style={{ color: '#76777d', fontSize: 14, margin: 0 }}>Continue where you left off</p>
            </div>

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '2rem', borderRadius: '16px', border: '1px solid #e4e2e4', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)' }}>
              <div className="floating-input">
                <input id="email" type="email" placeholder=" " required value={email} onChange={e => setEmail(e.target.value)} />
                <label htmlFor="email">Email address</label>
              </div>
              <div className="floating-input" style={{ position: 'relative' }}>
                <input id="password" type={showPw ? 'text' : 'password'} placeholder=" " required value={password} onChange={e => setPassword(e.target.value)} />
                <label htmlFor="password">Password</label>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#76777d', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showPw ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="shimmer-btn"
                style={{ width: '100%', height: 48, background: loading ? '#374151' : '#0f172a', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 500, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '0.5rem', transition: 'background 0.2s' }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign in'}
              </button>
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <p style={{ fontSize: 11, color: '#9ca3af' }}>Demo credentials pre-filled</p>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
