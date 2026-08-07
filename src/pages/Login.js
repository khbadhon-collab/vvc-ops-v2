import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { signIn, resetPasswordForEmail } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'forgot'
  const [resetSent, setResetSent] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError('Invalid email or password. Please try again.')
    else navigate('/')
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await resetPasswordForEmail(email)
    setLoading(false)
    if (err) setError(err.message || 'Could not send reset email. Please try again.')
    else setResetSent(true)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0F4C81 0%, #0A3560 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: 16,
        padding: '36px 32px', width: '100%', maxWidth: 380,
        boxShadow: '0 20px 60px rgba(0,0,0,.25)'
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#0F4C81', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
          }}>
            <ShieldCheck size={26} color="#D4A017" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-.3px' }}>VVC Ops</h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>Visa Verification Center · Global</p>
        </div>

        {error && (
          <div style={{
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 13, color: '#DC2626'
          }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {mode === 'forgot' ? (
          resetSent ? (
            <div>
              <div style={{
                background: '#F0FDF4', border: '1px solid #BBF7D0',
                borderRadius: 8, padding: '12px 14px', marginBottom: 16,
                display: 'flex', alignItems: 'flex-start', gap: 8,
                fontSize: 13, color: '#15803D'
              }}>
                <CheckCircle size={16} style={{flexShrink:0,marginTop:1}} />
                <span>Reset link sent to <strong>{email}</strong>. Check your inbox, click the link, and set a new password.</span>
              </div>
              <button className="btn btn-full" onClick={() => { setMode('login'); setResetSent(false) }}>← Back to sign in</button>
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <p style={{ fontSize: 12.5, color: '#64748B', marginBottom: 16 }}>Enter your account email and we'll send you a link to set a new password.</p>
              <div className="form-group">
                <label className="form-label">Email</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94A3B8' }} />
                  <input
                    className="form-input"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{ paddingLeft: 32 }}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>
              <button
                className="btn btn-primary btn-full"
                type="submit"
                disabled={loading}
                style={{ marginTop: 8, padding: '11px', fontSize: 14, fontWeight: 700 }}
              >
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
              <button
                type="button"
                onClick={() => setMode('login')}
                style={{ width: '100%', textAlign: 'center', marginTop: 12, background: 'none', border: 'none', color: '#0F4C81', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}
              >← Back to sign in</button>
            </form>
          )
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94A3B8' }} />
              <input
                className="form-input"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ paddingLeft: 32 }}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94A3B8' }} />
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingLeft: 32 }}
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="button"
              onClick={() => { setMode('forgot'); setError('') }}
              style={{ background: 'none', border: 'none', color: '#0F4C81', fontSize: 12, fontWeight: 600, cursor: 'pointer', marginTop: 6, padding: 0 }}
            >Forgot password?</button>
          </div>

          <button
            className="btn btn-primary btn-full"
            type="submit"
            disabled={loading}
            style={{ marginTop: 8, padding: '11px', fontSize: 14, fontWeight: 700 }}
          >
            {loading ? 'Signing in...' : 'Sign in to VVC Ops'}
          </button>
        </form>
        )}

        <p style={{ textAlign: 'center', fontSize: 11.5, color: '#CBD5E1', marginTop: 20 }}>
          VVC Global · Document Intelligence Unit · Dhaka, Bangladesh
        </p>
      </div>
    </div>
  )
}
