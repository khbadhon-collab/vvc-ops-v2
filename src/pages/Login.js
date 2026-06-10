import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Mail, Lock, AlertCircle } from 'lucide-react'
import { signIn } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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

        <p style={{ textAlign: 'center', fontSize: 11.5, color: '#CBD5E1', marginTop: 20 }}>
          VVC Global · Document Intelligence Unit · Dhaka, Bangladesh
        </p>
      </div>
    </div>
  )
}
