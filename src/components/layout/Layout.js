import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  LayoutDashboard, FolderOpen, FilePlus, Receipt,
  BarChart2, Settings, Menu, X, LogOut,
  ShieldCheck, Bell, Globe, Users,
  MessageCircle, TrendingUp, Share2, Zap
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Cases', icon: FolderOpen, path: '/cases' },
  { label: 'New case', icon: FilePlus, path: '/cases/new' },
  { label: 'Invoices', icon: Receipt, path: '/invoices' },
  { label: 'Finance', icon: BarChart2, path: '/finance' },
  { label: 'Intelligence', icon: Globe, path: '/intelligence' },
  { label: 'Staff', icon: Users, path: '/staff' },
  { label: 'Comms', icon: MessageCircle, path: '/comms' },
  { label: 'Marketing', icon: TrendingUp, path: '/marketing' },
  { label: 'Social', icon: Share2, path: '/social' },
]

const bottomNavItems = [
  { label: 'Home', icon: LayoutDashboard, path: '/' },
  { label: 'Cases', icon: FolderOpen, path: '/cases' },
  { label: 'New', icon: FilePlus, path: '/cases/new' },
  { label: 'Intel', icon: Globe, path: '/intelligence' },
  { label: 'Staff', icon: Users, path: '/staff' },
  { label: 'Comms', icon: MessageCircle, path: '/comms' },
  { label: 'Marketing', icon: TrendingUp, path: '/marketing' },
  { label: 'Social', icon: Share2, path: '/social' },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const go = (path) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const pageTitle = () => {
    const p = location.pathname
    if (p === '/') return { title: 'Dashboard', sub: 'Good day, VVC Ops' }
    if (p.includes('/cases/new')) return { title: 'New case', sub: 'Create client intake' }
    if (p.includes('/cases/')) return { title: 'Case detail', sub: 'Document analysis' }
    if (p.includes('/cases')) return { title: 'Cases', sub: 'All active & closed cases' }
    if (p.includes('/invoices')) return { title: 'Invoices', sub: 'Billing & payments' }
    if (p.includes('/finance')) return { title: 'Finance', sub: 'P&L, income & expenses' }
    if (p.includes('/settings')) return { title: 'Settings', sub: 'Configure VVC Ops' }
    if (p.includes('/intelligence')) return { title: 'Intelligence', sub: 'Fraud analytics & country reports' }
    if (p.includes('/staff')) return { title: 'Staff', sub: 'Team management & targets' }
    if (p.includes('/comms')) return { title: 'Comms Log', sub: 'All client communications' }
    if (p.includes('/marketing')) return { title: 'Marketing', sub: 'Campaign performance & ROI' }
    if (p.includes('/social')) return { title: 'Social Media', sub: 'Post scheduler & tracker' }
    if (p.includes('/templates')) return { title: 'WA Templates', sub: 'Bengali WhatsApp message templates' }
    return { title: 'VVC Ops', sub: '' }
  }

  const { title, sub } = pageTitle()

  return (
    <div className="app-shell">
      {/* Overlay */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#D4A017" />
            <h1>VVC Ops</h1>
          </div>
          <span>Visa Verification Center</span>
        </div>

        <div className="sidebar-section">Main</div>
        {navItems.map(({ label, icon: Icon, path, badge }) => (
          <button
            key={path}
            className={`nav-link ${isActive(path) ? 'active' : ''}`}
            onClick={() => go(path)}
          >
            <Icon size={16} />
            {label}
            {badge && <span className="nav-badge">{badge}</span>}
          </button>
        ))}

        <div className="sidebar-section">Analytics</div>
        <button className={`nav-link ${isActive('/intelligence') ? 'active' : ''}`} onClick={() => go('/intelligence')}>
          <Globe size={16} /> Intelligence
        </button>
        <button className={`nav-link ${isActive('/staff') ? 'active' : ''}`} onClick={() => go('/staff')}>
          <Users size={16} /> Staff
        </button>

        <div className="sidebar-section">Operations</div>
        <button className={`nav-link ${isActive('/comms') ? 'active' : ''}`} onClick={() => go('/comms')}>
          <MessageCircle size={16} /> Comms log
        </button>
        <button className={`nav-link ${isActive('/marketing') ? 'active' : ''}`} onClick={() => go('/marketing')}>
          <TrendingUp size={16} /> Marketing
        </button>
        <button className={`nav-link ${isActive('/social') ? 'active' : ''}`} onClick={() => go('/social')}>
          <Share2 size={16} /> Social media
        </button>
        <button className={`nav-link ${isActive('/templates') ? 'active' : ''}`} onClick={() => go('/templates')}>
          <Zap size={16} /> WA Templates
        </button>

        <div className="sidebar-section">System</div>
        <button className={`nav-link ${isActive('/settings') ? 'active' : ''}`} onClick={() => go('/settings')}>
          <Settings size={16} /> Settings
        </button>

        <div className="sidebar-footer">
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 8 }}>
            VVC Global · Dhaka, BD
          </div>
          <button className="nav-link" onClick={handleLogout} style={{ padding: '8px 0', color: 'rgba(255,255,255,.6)' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </nav>

      {/* Main */}
      <div className="main-content">
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div style={{ flex: 1 }}>
            <div className="topbar-title">{title}</div>
            {sub && <div className="topbar-sub">{sub}</div>}
          </div>
          <button className="btn btn-icon" style={{ border: 'none' }} aria-label="Notifications">
            <Bell size={18} color="var(--text2)" />
          </button>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav - mobile only */}
      <nav className="bottom-nav" aria-label="Mobile navigation">
        <div className="bottom-nav-inner">
          {bottomNavItems.map(({ label, icon: Icon, path }) => (
            <button
              key={path}
              className={`bottom-nav-item ${isActive(path) ? 'active' : ''}`}
              onClick={() => go(path)}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
