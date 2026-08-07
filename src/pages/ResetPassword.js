import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Lock, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase, updatePassword } from '../lib/supabase'

export default function ResetPassword() {
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase auto-parses the recovery token from the URL hash and fires
    // a PASSWORD_RECOVERY event once a temporary session is established.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // In case the event already fired before this component mounted.
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) setError(err.message || 'Could not update password. The reset link may have expired — request a new one.')
    else setDone(true)
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
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#0F4C81', display: 'flex',
            alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px'
          }}>
            <ShieldCheck size={26} color="#D4A017" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-.3px' }}>Set new password</h1>
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4 }}>VVC Ops · Visa Verification Center</p>
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

        {done ? (
          <div>
            <div style={{
              background: '#F0FDF4', border: '1px solid #BBF7D0',
              borderRadius: 8, padding: '12px 14px', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, color: '#15803D'
            }}>
              <CheckCircle size={16} /> Password updated. You can sign in now.
            </div>
            <button className="btn btn-primary btn-full" style={{ padding: 11 }} onClick={() => navigate('/login')}>Go to sign in</button>
          </div>
        ) : !ready ? (
          <div style={{ fontSize: 13, color: '#64748B', textAlign: 'center', padding: '12px 0' }}>
            Verifying your reset link...
            <div style={{ marginTop: 16 }}>
              <button className="btn btn-full" onClick={() => navigate('/login')}>← Back to sign in</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94A3B8' }} />
                <input
                  className="form-input"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 32 }}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Confirm new password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: 10, top: 11, color: '#94A3B8' }} />
                <input
                  className="form-input"
                  type="password"
                  placeholder="Re-type password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  style={{ paddingLeft: 32 }}
                  required
                  autoComplete="new-password"
                />
              </div>
            </div>
            <button
              className="btn btn-primary btn-full"
              type="submit"
              disabled={loading}
              style={{ marginTop: 8, padding: '11px', fontSize: 14, fontWeight: 700 }}
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
