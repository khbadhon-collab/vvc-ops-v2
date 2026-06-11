import React, { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
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

export const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// Role permissions
export const ROLES = {
  admin: { label: 'Admin / CEO', color: 'var(--navy)', pages: ['*'] },
  sales: { label: 'Sales Assistant', color: 'var(--success)', pages: ['/', 'cases', 'cases/new', 'comms', 'marketing', 'social', 'templates'] },
  accounting: { label: 'Accounting', color: 'var(--warning)', pages: ['/', 'invoices', 'finance'] },
}

export function hasAccess(role, path) {
  if (!role || role === 'admin') return true
  const perms = ROLES[role]?.pages || []
  if (perms.includes('*')) return true
  const clean = path.replace(/^\//, '').split('/')[0] || ''
  return perms.some(p => p === '/' ? clean === '' : p === clean || p.startsWith(clean))
}

function ProtectedRoute({ children, page }) {
  const { user, role, loading } = useAuth()
  if (loading) return <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',color:'#0F4C81',fontSize:'14px'}}>Loading VVC Ops...</div>
  if (!user) return <Navigate to="/login" replace />
  if (page && !hasAccess(role, page)) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('admin')
  const [loading, setLoading] = useState(true)

  const loadRole = async (u) => {
    if (!u) { setRole('admin'); return }
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', u.id).single()
    setRole(data?.role || 'admin')
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
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
