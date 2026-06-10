import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases } from '../lib/supabase'
import { Search, Plus, Filter, ChevronRight } from 'lucide-react'

const DEMO_CASES = []

const statusLabel = { pending: 'Awaiting docs', progress: 'In review', suspicious: 'Suspicious', manipulated: 'Manipulated', done: 'Delivered', new: 'New' }
const initials = (n) => n.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase()
const avatarColor = (n) => { const c = ['','g','a','r','p']; return c[n.charCodeAt(0) % c.length] }

export default function Cases() {
  const [cases, setCases] = useState(DEMO_CASES)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()

  useEffect(() => {
    getCases().then(({ data }) => { if (data?.length) setCases(data) })
  }, [])

  const filtered = cases.filter(c => {
    const matchSearch = !search || c.client_name.toLowerCase().includes(search.toLowerCase()) ||
      c.case_id.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.status === filter
    return matchSearch && matchFilter
  })

  const filterBtns = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'progress', label: 'In review' },
    { key: 'suspicious', label: 'Suspicious' },
    { key: 'done', label: 'Done' },
  ]

  return (
    <div>
      {/* Search */}
      <div className="search-bar">
        <Search size={16} color="var(--text3)" />
        <input
          placeholder="Search by name, case ID, country..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {filterBtns.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '5px 12px', borderRadius: 20, border: '1px solid',
              fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
              borderColor: filter === f.key ? 'var(--navy)' : 'var(--border)',
              background: filter === f.key ? 'var(--navy)' : '#fff',
              color: filter === f.key ? '#fff' : 'var(--text2)',
            }}
          >{f.label}</button>
        ))}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }} onClick={() => navigate('/cases/new')}>
          <Plus size={13} /> New
        </button>
      </div>

      {/* List */}
      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <Search size={32} />
            <h3>No cases found</h3>
            <p>Try a different search or filter</p>
          </div>
        ) : filtered.map(c => (
          <div key={c.id} className="list-row" onClick={() => navigate(`/cases/${c.id}`)}>
            <div className={`row-avatar ${avatarColor(c.client_name)}`}>{initials(c.client_name)}</div>
            <div className="row-main">
              <div className="row-title">{c.client_name}</div>
              <div className="row-sub">{c.case_id} · {c.country} · {c.doc_type}</div>
            </div>
            <div className="row-right">
              <span className={`badge ${c.status}`}>{statusLabel[c.status]}</span>
              <span style={{ fontSize: 11, color: 'var(--text3)' }}>৳{c.amount}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 12 }}>
        {filtered.length} case{filtered.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
