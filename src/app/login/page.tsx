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
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        html, body, #__next { height: 100%; margin: 0; background: #f7f5ed; }
        .hero-text {
          font-family: 'Instrument Serif', serif;
          font-size: 5rem;
          color: #064e3b;
          line-height: 0.95;
          letter-spacing: -0.02em;
        }
        .hero-text span {
          font-family: 'Inter', sans-serif;
          font-weight: 700;
          font-size: 4.5rem;
          letter-spacing: -0.04em;
        }
        .floating-input { position: relative; margin-bottom: 1.5rem; }
        .floating-input input {
          width: 100%; height: 52px; padding: 1rem 1rem 0 1rem;
          border: 1px solid rgba(6,78,59,0.15); border-radius: 12px;
          background-color: #fff; font-family: 'Inter', sans-serif;
          color: #064e3b; font-size: 15px; transition: all 0.2s ease;
        }
        .floating-input input:focus {
          outline: none; border-color: #064e3b;
          box-shadow: 0 0 0 3px rgba(6,78,59,0.1);
        }
        .floating-input label {
          position: absolute; left: 1rem; top: 50%;
          transform: translateY(-50%); color: #64748b;
          font-size: 0.9rem; transition: all 0.2s ease;
          pointer-events: none; font-family: 'Inter', sans-serif;
        }
        .floating-input input:focus + label,
        .floating-input input:not(:placeholder-shown) + label {
          top: 0.5rem; font-size: 0.7rem; transform: translateY(0); color: #064e3b; font-weight: 500;
        }
        .btn-lilac {
          background-color: #d8b4fe;
          color: #064e3b;
          border: none;
          border-radius: 99px;
          font-family: 'Inter', sans-serif;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-lilac:hover:not(:disabled) {
          background-color: #c084fc;
          transform: translateY(-1px);
        }
      `}</style>
      <div style={{ display: 'flex', height: '100vh', background: '#f7f5ed' }}>
        {/* LEFT — Wispr Flow Inspired Hero */}
        <div style={{ width: '55%', display: 'flex', flexDirection: 'column', padding: '4rem 5rem', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 'auto' }}>
            <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#064e3b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 20 }}>inventory_2</span>
            </div>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#064e3b', letterSpacing: '-0.03em', fontFamily: "'Inter', sans-serif" }}>NDR Rescue</span>
          </div>

          <div style={{ position: 'relative', zIndex: 10, marginTop: '-4rem' }}>
            <h1 className="hero-text" style={{ marginBottom: '1.5rem' }}>
              Don't call,<br /><span>just deploy.</span>
            </h1>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '1.25rem', color: '#064e3b', opacity: 0.8, maxWidth: '400px', lineHeight: 1.5, marginBottom: '3rem' }}>
              The AI agent that turns failed deliveries into confirmed slots in under 5 minutes.
            </p>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              {['63% recovery rate', 'Seamless Webhooks', '₹4 per call'].map(s => (
                <div key={s} style={{ padding: '8px 20px', borderRadius: '999px', border: '1px solid rgba(6,78,59,0.2)', fontFamily: "'Inter', sans-serif", color: '#064e3b', fontSize: 13, fontWeight: 600 }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: 'auto' }} />
        </div>

        {/* RIGHT — login form */}
        <div style={{ width: '45%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <div style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
              <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: 28, fontWeight: 700, color: '#064e3b', margin: '0 0 8px', letterSpacing: '-0.03em' }}>Log in to your account</h2>
              <p style={{ fontFamily: "'Inter', sans-serif", color: '#475569', fontSize: 15, margin: 0 }}>Start resolving deliveries automatically.</p>
            </div>

            <form onSubmit={handleSubmit} style={{ background: '#fff', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 10px 40px -10px rgba(6,78,59,0.08)' }}>
              <div className="floating-input">
                <input id="email" type="email" placeholder=" " required value={email} onChange={e => setEmail(e.target.value)} />
                <label htmlFor="email">Email address</label>
              </div>
              <div className="floating-input" style={{ position: 'relative' }}>
                <input id="password" type={showPw ? 'text' : 'password'} placeholder=" " required value={password} onChange={e => setPassword(e.target.value)} />
                <label htmlFor="password">Password</label>
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{showPw ? 'visibility' : 'visibility_off'}</span>
                </button>
              </div>
              <button
                id="login-submit"
                type="submit"
                disabled={loading}
                className="btn-lilac"
                style={{ width: '100%', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '1rem', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Signing in…
                  </>
                ) : 'Sign in'}
              </button>
              <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#94a3b8', margin: 0 }}>Demo credentials pre-filled</p>
              </div>
            </form>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
