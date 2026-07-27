import React, { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import { AuthContext, useAuth, hasAccess } from './lib/auth'
import './styles/index.css'

import Layout from './components/layout/Layout'
import Login from './pages/Login'

// Lazy-load pages so the first paint only ships what's needed.
// Heavy libs (jspdf, html2canvas) now load only when their page opens.
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Cases = lazy(() => import('./pages/Cases'))
const NewCase = lazy(() => import('./pages/NewCase'))
const CaseDetail = lazy(() => import('./pages/CaseDetail'))
const Invoices = lazy(() => import('./pages/Invoices'))
const Finance = lazy(() => import('./pages/Finance'))
const Settings = lazy(() => import('./pages/Settings'))
const Intelligence = lazy(() => import('./pages/Intelligence'))
const Staff = lazy(() => import('./pages/Staff'))
const Comms = lazy(() => import('./pages/Comms'))
const Marketing = lazy(() => import('./pages/Marketing'))
const Social = lazy(() => import('./pages/Social'))
const Templates = lazy(() => import('./pages/Templates'))
const AccessControl = lazy(() => import('./pages/AccessControl'))

const PageLoader = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh',flexDirection:'column',gap:12}}>
    <div style={{color:'#0F4C81',fontWeight:700,fontSize:16}}>VVC Ops</div>
    <div style={{color:'#666',fontSize:13}}>Loading...</div>
  </div>
)

function ProtectedRoute({ children, page }) {
  const { user, role, customPages, loading } = useAuth()
  if (loading) return <PageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (page && !hasAccess(role, page, customPages)) return <Navigate to="/" replace />
  return children
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(() => localStorage.getItem('vvc_role') || null)
  const [customPages, setCustomPages] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vvc_pages') || '[]') } catch { return [] }
  })
  const [loading, setLoading] = useState(true)

  const loadRole = async (u) => {
    if (!u) {
      setRole(null); setCustomPages([])
      localStorage.removeItem('vvc_role'); localStorage.removeItem('vvc_pages')
      return
    }
    try {
      const { data } = await supabase.from('user_roles').select('role,custom_pages').eq('user_id', u.id).single()
      // SECURITY: if no role row is found, fall back to least-privileged role, NOT admin.
      const r = data?.role || 'sales'
      const cp = data?.custom_pages || []
      setRole(r); setCustomPages(cp)
      localStorage.setItem('vvc_role', r)
      localStorage.setItem('vvc_pages', JSON.stringify(cp))
    } catch { setRole(prev => prev || 'sales') }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      setLoading(false)          // paint immediately — getSession is local
      loadRole(u)                // role refreshes in the background
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      const u = session?.user ?? null
      setUser(u)
      loadRole(u)
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, role, customPages, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
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
              <Route path="access" element={<ProtectedRoute page="access"><AccessControl /></ProtectedRoute>} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  )
}
