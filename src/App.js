import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AuthContext, useAuth, hasAccess } from './lib/auth'
import './styles/index.css'

import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Cases from './pages/Cases'
import NewCase from './pages/NewCase'
import CaseDetail from './pages/CaseDetail'
import Invoices from './pages/Invoices'
import Finance from './pages/Finance'
import Settings from './pages/Settings'
import Intelligence from './pages/Intelligence'
import Staff from './pages/Staff'
import Comms from './pages/Comms'
import Marketing from './pages/Marketing'
import Social from './pages/Social'
import Templates from './pages/Templates'
import AccessControl from './pages/AccessControl'

function ProtectedRoute({ children, page }) {
  const { user, role, loading } = useAuth()
  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',flexDirection:'column',gap:12}}>
      <div style={{color:'#0F4C81',fontWeight:700,fontSize:16}}>VVC Ops</div>
      <div style={{color:'#666',fontSize:13}}>Loading...</div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (page && !hasAccess(role, page)) return <Navigate to="/" replace />
  return children
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('admin')
  const [loading, setLoading] = useState(true)

  const loadRole = async (u) => {
    if (!u) { setRole('admin'); return }
    try {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', u.id).single()
      setRole(data?.role || 'admin')
    } catch { setRole('admin') }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      loadRole(u).then(() => setLoading(false))
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      loadRole(u)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="cases" element={<Cases />} />
            <Route path="cases/new" element={<NewCase />} />
            <Route path="cases/:id" element={<CaseDetail />} />
            <Route path="invoices" element={<Invoices />} />
            <Route path="finance" element={<ProtectedRoute page="finance"><Finance /></ProtectedRoute>} />
            <Route path="settings" element={<ProtectedRoute page="settings"><Settings /></ProtectedRoute>} />
            <Route path="intelligence" element={<ProtectedRoute page="intelligence"><Intelligence /></ProtectedRoute>} />
            <Route path="staff" element={<ProtectedRoute page="staff"><Staff /></ProtectedRoute>} />
            <Route path="comms" element={<Comms />} />
            <Route path="marketing" element={<Marketing />} />
            <Route path="social" element={<Social />} />
            <Route path="templates" element={<Templates />} />
            <Route path="access" element={<ProtectedRoute page="settings"><AccessControl /></ProtectedRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
