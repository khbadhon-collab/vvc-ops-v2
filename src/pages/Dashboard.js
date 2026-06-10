import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases, getInvoices, getExpenses } from '../lib/supabase'
import { TrendingUp, Clock, FileCheck, AlertTriangle, Plus, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'

const DEMO_CASES = []

const statusLabel = { pending: 'Awaiting docs', progress: 'In review', suspicious: 'Suspicious', manipulated: 'Manipulated', done: 'Delivered', new: 'New' }

const initials = (name) => name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
const avatarColor = (name) => {
  const colors = ['', 'g', 'a', 'r', 'p']
  return colors[name.charCodeAt(0) % colors.length]
}

export default function Dashboard() {
  const [cases, setCases] = useState(DEMO_CASES)
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    getCases().then(({ data }) => { if (data?.length) setCases(data) })
    getInvoices().then(({ data }) => {
      if (data?.length) {
        const paid = data.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
        setTotalIncome(paid)
      }
    })
    getExpenses().then(({ data }) => {
      if (data?.length) setTotalExpenses(data.reduce((s, e) => s + e.amount, 0))
    })
  }, [])

  const active = cases.filter(c => !['done'].includes(c.status)).length
  const pending = cases.filter(c => c.status === 'pending').length
  const ready = cases.filter(c => c.status === 'done').length
  const profit = totalIncome - totalExpenses

  const actions = cases.filter(c => ['pending','progress','suspicious'].includes(c.status)).slice(0,3)

  return (
    <div>
      {/* Metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Active cases</div>
          <div className="metric-value blue">{active}</div>
          <div className="metric-sub">This month</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Awaiting docs</div>
          <div className="metric-value amber">{pending}</div>
          <div className="metric-sub">Need follow-up</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Net profit</div>
          <div className="metric-value green">৳{profit.toLocaleString()}</div>
          <div className="metric-sub">June 2026</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Reports done</div>
          <div className="metric-value">{ready}</div>
          <div className="metric-sub">Delivered</div>
        </div>
      </div>

      {/* Actions needed */}
      {actions.length > 0 && (
        <div className="card mb-16">
          <div className="card-header">
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle size={15} color="var(--warning)" /> Actions needed
            </span>
          </div>
          {actions.map(c => (
            <div key={c.id} className="list-row" onClick={() => navigate(`/cases/${c.id}`)}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                background: c.status === 'suspicious' ? 'var(--danger)' : c.status === 'pending' ? 'var(--warning)' : 'var(--info)'
              }} />
              <div className="row-main">
                <div className="row-title">{c.client_name}</div>
                <div className="row-sub">{c.case_id} · {c.country} · {statusLabel[c.status]}</div>
              </div>
              <ChevronRight size={15} color="var(--text3)" />
            </div>
          ))}
        </div>
      )}

      {/* Recent cases */}
      <div className="card mb-16">
        <div className="card-header">
          Recent cases
          <button className="btn btn-sm" onClick={() => navigate('/cases')}>View all</button>
        </div>
        {cases.slice(0, 4).map(c => (
          <div key={c.id} className="list-row" onClick={() => navigate(`/cases/${c.id}`)}>
            <div className={`row-avatar ${avatarColor(c.client_name)}`}>{initials(c.client_name)}</div>
            <div className="row-main">
              <div className="row-title">{c.client_name}</div>
              <div className="row-sub">{c.country} · {c.doc_type}</div>
            </div>
            <div className="row-right">
              <span className={`badge ${c.status}`}>{statusLabel[c.status]}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>৳{c.amount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button className="btn btn-primary btn-full" style={{ padding: '12px' }} onClick={() => navigate('/cases/new')}>
          <Plus size={16} /> New case
        </button>
        <button className="btn btn-full" style={{ padding: '12px' }} onClick={() => navigate('/invoices')}>
          <FileCheck size={16} /> Invoices
        </button>
      </div>
    </div>
  )
}
