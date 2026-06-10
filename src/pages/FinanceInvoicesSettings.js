import { supabase } from '../lib/supabase'
import React, { useState, useEffect } from 'react'
import { getInvoices, markInvoicePaid, getExpenses, addExpense, buildWhatsAppLink, waInvoiceMessage } from '../lib/supabase'
import { CheckCircle, MessageCircle, Plus, Trash2, Edit2 } from 'lucide-react'

// ── INVOICES ──
export function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [filter, setFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editInv, setEditInv] = useState(null)
  const [editData, setEditData] = useState({})

  useEffect(() => {
    getInvoices().then(({ data }) => { if (data?.length) setInvoices(data) })
  }, [])

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)
  const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const unpaid = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0)

  const handleMarkPaid = async (inv) => {
    await markInvoicePaid(inv.id, inv.payment_method)
    setInvoices(list => list.map(i => i.id === inv.id ? { ...i, status: 'paid' } : i))
  }

  const handleDelete = async () => {
    await supabase.from('invoices').delete().eq('id', confirmDelete.id)
    setInvoices(list => list.filter(i => i.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const openEdit = (inv) => { setEditInv(inv); setEditData({ client_name: inv.client_name, amount: inv.amount, status: inv.status, payment_method: inv.payment_method || 'bKash', client_phone: inv.client_phone || '' }) }

  const saveEdit = async () => {
    await supabase.from('invoices').update({ ...editData, amount: Number(editData.amount) }).eq('id', editInv.id)
    setInvoices(list => list.map(i => i.id === editInv.id ? { ...i, ...editData, amount: Number(editData.amount) } : i))
    setEditInv(null)
  }

  return (
    <div>
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:24, maxWidth:320, width:'100%' }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Delete invoice?</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
              <strong>{confirmDelete.client_name}</strong> · {confirmDelete.invoice_number}<br/>This cannot be undone.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button className="btn btn-full" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{ background:'var(--danger)', color:'#fff', border:'none' }} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {editInv && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:24, maxWidth:340, width:'100%' }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Edit Invoice</div>
            <div className="form-group"><label className="form-label">Client name</label><input className="form-input" value={editData.client_name} onChange={e=>setEditData(d=>({...d,client_name:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={editData.client_phone} onChange={e=>setEditData(d=>({...d,client_phone:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Amount (৳)</label><input className="form-input" type="number" value={editData.amount} onChange={e=>setEditData(d=>({...d,amount:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Payment method</label>
              <select className="form-select" value={editData.payment_method} onChange={e=>setEditData(d=>({...d,payment_method:e.target.value}))}>
                {['bKash Send Money','bKash Merchant','Nagad','Rocket','EBL Bank','Cash'].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-select" value={editData.status} onChange={e=>setEditData(d=>({...d,status:e.target.value}))}>
                {['unpaid','paid','overdue'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
              <button className="btn btn-full" onClick={() => setEditInv(null)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}

      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="metric-card"><div className="metric-label">Paid</div><div className="metric-value green">৳{paid.toLocaleString()}</div></div>
        <div className="metric-card"><div className="metric-label">Outstanding</div><div className="metric-value amber">৳{unpaid.toLocaleString()}</div></div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {['all','paid','unpaid','overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            background: filter === f ? 'var(--navy)' : '#fff',
            borderColor: filter === f ? 'var(--navy)' : 'var(--border)',
            color: filter === f ? '#fff' : 'var(--text2)',
          }}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
        ))}
      </div>

      <div className="card">
        {filtered.map(inv => (
          <div key={inv.id} style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{inv.client_name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{inv.invoice_number} · {inv.case_ref}</div>
              </div>
              <div style={{ textAlign: 'right', display:'flex', alignItems:'center', gap:10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>৳{inv.amount}</div>
                  <span className={`badge ${inv.status}`}>{inv.status}</span>
                </div>
                <button onClick={() => openEdit(inv)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--navy)', padding:4 }}>
                  <Edit2 size={15} />
                </button>
                <button onClick={() => setConfirmDelete(inv)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--danger)', padding:4 }}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
              {inv.status !== 'paid' && (
                <>
                  <a href={buildWhatsAppLink(inv.client_phone, waInvoiceMessage(inv.client_name, inv.case_ref, inv.amount, inv.payment_method))}
                    target="_blank" rel="noreferrer" className="btn btn-wa btn-sm">
                    <MessageCircle size={12} /> Resend
                  </a>
                  <button className="btn btn-success btn-sm" onClick={() => handleMarkPaid(inv)}>
                    <CheckCircle size={12} /> Mark paid
                  </button>
                </>
              )}
              {inv.status === 'paid' && (
                <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>Paid via {inv.payment_method}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── FINANCE ──
const DEFAULT_CATS = ['Advertising','Tools','Communication','Bank fees','Miscellaneous']

export function Finance() {
  const [tab, setTab] = useState('summary')
  const [expenses, setExpenses] = useState([])
  const [income, setIncome] = useState(0)
  const [invoices, setInvoices] = useState([])
  const [newExp, setNewExp] = useState({ description:'', category:'Advertising', amount:'', date: new Date().toISOString().slice(0,10) })
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editExp, setEditExp] = useState(null)
  const [editExpData, setEditExpData] = useState({})
  const [customCats, setCustomCats] = useState([])
  const [addingCat, setAddingCat] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const CATS = [...DEFAULT_CATS, ...customCats]

  useEffect(() => {
    // Load expenses from Supabase
    getExpenses().then(({ data }) => { if (data?.length) setExpenses(data) })
    // Load income from paid invoices
    getInvoices().then(({ data }) => {
      if (data?.length) {
        setInvoices(data)
        const paidTotal = data.filter(i => i.status === 'paid').reduce((s,i) => s + i.amount, 0)
        setIncome(paidTotal)
      }
    })
  }, [])

  const totalExp = expenses.reduce((s,e) => s + Number(e.amount), 0)
  const profit = income - totalExp
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0

  const cats = {}
  expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + Number(e.amount) })

  const handleAddExpense = async () => {
    if (!newExp.description || !newExp.amount) return
    setSaving(true)
    const expData = { ...newExp, amount: Number(newExp.amount) }
    const { error } = await addExpense(expData)
    if (!error) {
      // Reload from DB to get real ID
      const { data } = await getExpenses()
      if (data) setExpenses(data)
    }
    setNewExp({ description:'', category:'Advertising', amount:'', date: new Date().toISOString().slice(0,10) })
    setAdding(false)
    setSaving(false)
  }

  const handleDeleteExpense = async () => {
    await supabase.from('expenses').delete().eq('id', confirmDelete.id)
    setExpenses(list => list.filter(e => e.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const openEditExp = (e) => { setEditExp(e); setEditExpData({ description: e.description, category: e.category, amount: e.amount, date: e.date }) }

  const saveEditExp = async () => {
    await supabase.from('expenses').update({ ...editExpData, amount: Number(editExpData.amount) }).eq('id', editExp.id)
    setExpenses(list => list.map(e => e.id === editExp.id ? { ...e, ...editExpData, amount: Number(editExpData.amount) } : e))
    setEditExp(null)
  }

  return (
    <div>
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:24, maxWidth:320, width:'100%' }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:8 }}>Delete expense?</div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
              <strong>{confirmDelete.description}</strong> · ৳{confirmDelete.amount}<br/>This cannot be undone.
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <button className="btn btn-full" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{ background:'var(--danger)', color:'#fff', border:'none' }} onClick={handleDeleteExpense}>Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        {editExp && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          <div style={{ background:'#fff', borderRadius:12, padding:24, maxWidth:340, width:'100%' }}>
            <div style={{ fontWeight:700, fontSize:15, marginBottom:16 }}>Edit Expense</div>
            <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={editExpData.description} onChange={e=>setEditExpData(d=>({...d,description:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-select" value={editExpData.category} onChange={e=>setEditExpData(d=>({...d,category:e.target.value}))}>
                {[...DEFAULT_CATS,...customCats].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Amount (৳)</label><input className="form-input" type="number" value={editExpData.amount} onChange={e=>setEditExpData(d=>({...d,amount:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={editExpData.date} onChange={e=>setEditExpData(d=>({...d,date:e.target.value}))} /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
              <button className="btn btn-full" onClick={() => setEditExp(null)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={saveEditExp}>Save</button>
            </div>
          </div>
        </div>
      )}

      {['summary','p&l','expenses'].map(t => (
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t === 'p&l' ? 'P&L' : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div>
          <div className="metrics-grid">
            <div className="metric-card"><div className="metric-label">Income</div><div className="metric-value green">৳{income.toLocaleString()}</div></div>
            <div className="metric-card"><div className="metric-label">Expenses</div><div className="metric-value red">৳{totalExp.toLocaleString()}</div></div>
            <div className="metric-card"><div className="metric-label">Net profit</div><div className="metric-value blue">৳{profit.toLocaleString()}</div></div>
            <div className="metric-card"><div className="metric-label">Margin</div><div className="metric-value">{income > 0 ? `${margin}%` : '—'}</div></div>
          </div>
          <div className="card mb-12">
            <div className="card-header">Expenses by category</div>
            <div className="card-body">
              {Object.entries(cats).length === 0 && <div style={{fontSize:13,color:'var(--text3)',padding:'4px 0'}}>No expenses yet</div>}
              {Object.entries(cats).map(([cat, amt]) => (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:4 }}>
                    <span style={{ color:'var(--text2)' }}>{cat}</span>
                    <span style={{ fontWeight:600 }}>৳{amt.toLocaleString()}</span>
                  </div>
                  <div style={{ height:8, background:'var(--surface2)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:'var(--danger)', borderRadius:4, width:`${totalExp > 0 ? Math.round(amt/totalExp*100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card mb-12">
            <div className="card-header">Income by payment method</div>
            <div className="card-body">
              {['bKash Send Money','bKash Merchant','Nagad','Rocket','EBL Bank','Cash'].map(method => {
                const amt = invoices.filter(i => i.status === 'paid' && i.payment_method === method).reduce((s,i) => s + i.amount, 0)
                if (amt === 0) return null
                return (
                  <div key={method} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                    <span style={{color:'var(--text2)'}}>{method}</span>
                    <span style={{fontWeight:700, color:'var(--success)'}}>৳{amt.toLocaleString()}</span>
                  </div>
                )
              })}
              {income === 0 && <div style={{fontSize:13,color:'var(--text3)'}}>No paid invoices yet</div>}
            </div>
          </div>
        </div>
      )}

      {tab === 'p&l' && (
        <div>
          <div className="card mb-12">
            <div className="card-header">Income (paid invoices)</div>
            <div className="inv-line total"><span>Total received</span><span style={{color:'var(--success)'}}>৳{income.toLocaleString()}</span></div>
          </div>
          <div className="card mb-12">
            <div className="card-header">Expenses</div>
            {expenses.length === 0 && <div className="inv-line"><span style={{color:'var(--text3)'}}>No expenses recorded</span></div>}
            {expenses.map(e => (
              <div key={e.id} className="inv-line">
                <span style={{color:'var(--text2)'}}>{e.description} <span style={{fontSize:11,color:'var(--text3)'}}>({e.category})</span></span>
                <span style={{color:'var(--danger)'}}>–৳{Number(e.amount).toLocaleString()}</span>
              </div>
            ))}
            <div className="inv-line total"><span>Total expenses</span><span style={{color:'var(--danger)'}}>–৳{totalExp.toLocaleString()}</span></div>
          </div>
          <div className="card">
            <div className="inv-line total" style={{padding:'14px 16px'}}>
              <span style={{fontSize:14}}>Net profit</span>
              <span style={{fontSize:16,color: profit >= 0 ? 'var(--navy)' : 'var(--danger)'}}>৳{profit.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <div>
          {adding ? (
            <div className="card mb-12">
              <div className="card-header">Add expense</div>
              <div className="card-body">
                <div className="form-group"><label className="form-label">Description</label><input className="form-input" placeholder="e.g. Facebook ad" value={newExp.description} onChange={e=>setNewExp(n=>({...n,description:e.target.value}))} /></div>
                <div className="form-group"><label className="form-label">Category</label>
                  <div style={{display:'flex',gap:6}}>
                    <select className="form-select" style={{flex:1}} value={newExp.category} onChange={e=>setNewExp(n=>({...n,category:e.target.value}))}>
                      {CATS.map(c=><option key={c}>{c}</option>)}
                    </select>
                    {addingCat ? (
                      <div style={{display:'flex',gap:4}}>
                        <input className="form-input" style={{width:100}} placeholder="Category name" value={newCatName} onChange={e=>setNewCatName(e.target.value)} />
                        <button className="btn btn-primary btn-sm" onClick={()=>{ if(newCatName.trim()){setCustomCats(c=>[...c,newCatName.trim()]);setNewExp(n=>({...n,category:newCatName.trim()}));setNewCatName('');setAddingCat(false)} }}>Add</button>
                        <button className="btn btn-sm" onClick={()=>{setAddingCat(false);setNewCatName('')}}>✕</button>
                      </div>
                    ) : (
                      <button className="btn btn-sm" style={{whiteSpace:'nowrap'}} onClick={()=>setAddingCat(true)}>+ New</button>
                    )}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Amount (৳)</label><input className="form-input" type="number" value={newExp.amount} onChange={e=>setNewExp(n=>({...n,amount:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={newExp.date} onChange={e=>setNewExp(n=>({...n,date:e.target.value}))} /></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button className="btn btn-full" onClick={()=>setAdding(false)}>Cancel</button>
                  <button className="btn btn-primary btn-full" onClick={handleAddExpense} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </div>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-full mb-12" onClick={()=>setAdding(true)} style={{padding:11}}>
              <Plus size={15} /> Add expense
            </button>
          )}
          <div className="card">
            {expenses.length === 0 && <div style={{padding:'16px',textAlign:'center',color:'var(--text3)',fontSize:13}}>No expenses yet</div>}
            {expenses.map(e => (
              <div key={e.id} style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:8}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{e.description}</div>
                  <div style={{fontSize:11.5,color:'var(--text3)'}}>{e.category} · {e.date}</div>
                </div>
                <div style={{color:'var(--danger)',fontWeight:700}}>–৳{Number(e.amount).toLocaleString()}</div>
                <button onClick={() => openEditExp(e)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--navy)',padding:4}}>
                  <Edit2 size={15} />
                </button>
                <button onClick={() => setConfirmDelete(e)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4}}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            {expenses.length > 0 && <div className="inv-line total"><span>Total</span><span style={{color:'var(--danger)'}}>–৳{totalExp.toLocaleString()}</span></div>}
          </div>
        </div>
      )}
    </div>
  )
}

// ── SETTINGS ──
const SETTINGS_INIT = {
  claude_api_key: '', gemini_api_key: '', wa_number: '',
  bkash_number: '', nagad_number: '',
  vvc_email: 'vvcbd2026@gmail.com', auto_case_id: true,
  bengali_messages: true, friday_closed: true,
}

export function Settings() {
  const [s, setS] = useState(SETTINGS_INIT)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  const set = (k, v) => setS(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    await supabase.from('settings').upsert([{ id: 1, ...s, updated_at: new Date().toISOString() }])
    localStorage.setItem('vvc_settings', JSON.stringify(s))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  useEffect(() => {
    const loadSettings = async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
      if (data) { setS(prev => ({ ...prev, ...data })) }
      else {
        const local = localStorage.getItem('vvc_settings')
        if (local) setS(JSON.parse(local))
      }
      setLoading(false)
    }
    loadSettings()
  }, [])

  if (loading) return <div style={{padding:20,textAlign:'center',color:'var(--text3)'}}>Loading settings...</div>

  return (
    <div>
      {saved && (
        <div style={{ background:'var(--success-bg)', border:'1px solid #A7F3D0', borderRadius:8, padding:'10px 14px', marginBottom:14, fontSize:13, color:'var(--success)', display:'flex', gap:8 }}>
          <CheckCircle size={15} /> Settings saved
        </div>
      )}

      <div className="card mb-16">
        <div className="card-header">AI APIs</div>
        <div style={{ padding:'12px 16px' }}>
          <div className="form-group">
            <label className="form-label">Claude API key</label>
            <input className="form-input" type="password" placeholder="sk-ant-..." value={s.claude_api_key} onChange={e=>set('claude_api_key',e.target.value)} />
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">Gemini API key</label>
            <input className="form-input" type="password" placeholder="Paste Gemini API key..." value={s.gemini_api_key} onChange={e=>set('gemini_api_key',e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card mb-16">
        <div className="card-header">WhatsApp &amp; payments</div>
        <div style={{ padding:'12px 16px' }}>
          <div className="form-group">
            <label className="form-label">WhatsApp Business number</label>
            <input className="form-input" placeholder="+880 1XXXXXXXXX" value={s.wa_number} onChange={e=>set('wa_number',e.target.value)} type="tel" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">bKash number</label>
              <input className="form-input" placeholder="01XXXXXXXXX" value={s.bkash_number} onChange={e=>set('bkash_number',e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Nagad number</label>
              <input className="form-input" placeholder="01XXXXXXXXX" value={s.nagad_number} onChange={e=>set('nagad_number',e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{marginBottom:0}}>
            <label className="form-label">VVC email</label>
            <input className="form-input" type="email" value={s.vvc_email} onChange={e=>set('vvc_email',e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card mb-16">
        <div className="card-header">Preferences</div>
        {[
          { key:'auto_case_id', label:'Auto-generate case IDs', sub:'VVC-YYYYMMDD-XXXX format' },
          { key:'bengali_messages', label:'Bengali WhatsApp messages', sub:'Send messages in Bengali by default' },
          { key:'friday_closed', label:'Friday closed', sub:'Mark cases as low priority on Fridays' },
        ].map(({ key, label, sub }) => (
          <div key={key} className="settings-row">
            <div><div className="settings-label">{label}</div><div className="settings-sub">{sub}</div></div>
            <label className="toggle">
              <input type="checkbox" checked={s[key]} onChange={e=>set(key,e.target.checked)} />
              <span className="toggle-slider" />
            </label>
          </div>
        ))}
      </div>

      <button className="btn btn-primary btn-full" style={{ padding: 12 }} onClick={save}>
        Save settings
      </button>

      <div style={{ textAlign:'center', marginTop:20, fontSize:11.5, color:'var(--text3)' }}>
        VVC Ops v1.0 · Built for Visa Verification Center Global · Dhaka, Bangladesh
      </div>
    </div>
  )
}
