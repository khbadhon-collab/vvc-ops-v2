import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases, deleteCase } from '../lib/supabase'
import { Search, Plus, Trash2 } from 'lucide-react'

const statusLabel = { pending: 'Awaiting docs', progress: 'In review', suspicious: 'Suspicious', manipulated: 'Manipulated', done: 'Delivered', new: 'New' }
const initials = (n) => n.split(' ').map(x => x[0]).join('').slice(0,2).toUpperCase()
const avatarColor = (n) => { const c = ['','g','a','r','p']; return c[n.charCodeAt(0) % c.length] }

export default function Cases() {
  const [cases, setCases] = useState([])
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    getCases().then(({ data }) => { if (data?.length) setCases(data) })
  }, [])

  const handleDelete = async (e, caseItem) => {
    e.stopPropagation()
    setConfirmDelete(caseItem)
  }

  const confirmDeleteCase = async () => {
    await deleteCase(confirmDelete.id)
    setCases(list => list.filter(c => c.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

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
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:24, maxWidth:320, width:'100%' }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Delete case?</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
              <strong>{confirmDelete.client_name}</strong> · {confirmDelete.case_id}<br/>This cannot be undone.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button className="btn btn-full" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{ background:'var(--danger)', color:'#fff', border:'none' }} onClick={confirmDeleteCase}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="search-bar">
        <Search size={16} color="var(--text3)" />
        <input placeholder="Search by name, case ID, country..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 4 }}>
        {filterBtns.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', cursor: 'pointer',
            borderColor: filter === f.key ? 'var(--navy)' : 'var(--border)',
            background: filter === f.key ? 'var(--navy)' : '#fff',
            color: filter === f.key ? '#fff' : 'var(--text2)',
          }}>{f.label}</button>
        ))}
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }} onClick={() => navigate('/cases/new')}>
          <Plus size={13} /> New
        </button>
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <div className="empty-state"><Search size={32} /><h3>No cases found</h3><p>Try a different search or filter</p></div>
        ) : filtered.map(c => (
          <div key={c.id} style={{ display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)' }}>
            <div className="list-row" style={{ flex:1, borderBottom:'none' }} onClick={() => navigate(`/cases/${c.id}`)}>
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
            <button onClick={(e) => handleDelete(e, c)} style={{ padding:'0 14px', background:'none', border:'none', cursor:'pointer', color:'var(--danger)', flexShrink:0 }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginTop: 12 }}>
        {filtered.length} case{filtered.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
