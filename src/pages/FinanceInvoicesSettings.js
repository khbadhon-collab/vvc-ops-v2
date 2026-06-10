import { supabase } from '../lib/supabase'
import React, { useState, useEffect } from 'react'
import { getInvoices, markInvoicePaid, buildWhatsAppLink, waInvoiceMessage } from '../lib/supabase'
import { CheckCircle, MessageCircle, Download, Plus } from 'lucide-react'

const DEMO_INVOICES = []

export function Invoices() {
  const [invoices, setInvoices] = useState(DEMO_INVOICES)
  const [filter, setFilter] = useState('all')

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

  return (
    <div>
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        <div className="metric-card">
          <div className="metric-label">Paid</div>
          <div className="metric-value green">৳{paid.toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Outstanding</div>
          <div className="metric-value amber">৳{unpaid.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
        {['all','paid','unpaid','overdue'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 12px', borderRadius: 20, border: '1px solid',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
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
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>৳{inv.amount}</div>
                <span className={`badge ${inv.status}`}>{inv.status}</span>
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
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DEMO_EXPENSES = []

export function Finance() {
  const [tab, setTab] = useState('summary')
  const [expenses, setExpenses] = useState(DEMO_EXPENSES)
  const [newExp, setNewExp] = useState({ description:'', category:'Advertising', amount:'', date: new Date().toISOString().slice(0,10) })
  const [adding, setAdding] = useState(false)

  const income = 0
  const totalExp = expenses.reduce((s,e) => s + e.amount, 0)
  const profit = income - totalExp

  const cats = {}
  expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount })

  const handleAddExpense = () => {
    if (!newExp.description || !newExp.amount) return
    setExpenses(list => [...list, { ...newExp, id: Date.now(), amount: Number(newExp.amount) }])
    setNewExp({ description:'', category:'Advertising', amount:'', date: new Date().toISOString().slice(0,10) })
    setAdding(false)
  }

  return (
    <div>
      <div className="tabs">
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
            <div className="metric-card"><div className="metric-label">Margin</div><div className="metric-value">{Math.round(profit/income*100)}%</div></div>
          </div>
          <div className="card mb-12">
            <div className="card-header">Expenses by category</div>
            <div className="card-body">
              {Object.entries(cats).map(([cat, amt]) => (
                <div key={cat} style={{ marginBottom: 10 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12.5, marginBottom:4 }}>
                    <span style={{ color:'var(--text2)' }}>{cat}</span>
                    <span style={{ fontWeight:600 }}>৳{amt.toLocaleString()}</span>
                  </div>
                  <div style={{ height:8, background:'var(--surface2)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:'var(--danger)', borderRadius:4, width:`${Math.round(amt/totalExp*100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'p&l' && (
        <div>
          <div className="card mb-12">
            <div className="card-header">Income</div>
            <div className="inv-line"><span style={{color:'var(--text2)'}}>Standard (15 cases)</span><span style={{color:'var(--success)'}}>৳7,500</span></div>
            <div className="inv-line"><span style={{color:'var(--text2)'}}>Premium (11 cases)</span><span style={{color:'var(--success)'}}>৳8,800</span></div>
            <div className="inv-line"><span style={{color:'var(--text2)'}}>Urgent (4 cases)</span><span style={{color:'var(--success)'}}>৳4,800</span></div>
            <div className="inv-line total"><span>Gross income</span><span style={{color:'var(--success)'}}>৳{income.toLocaleString()}</span></div>
          </div>
          <div className="card mb-12">
            <div className="card-header">Expenses</div>
            {expenses.map(e => (
              <div key={e.id} className="inv-line">
                <span style={{color:'var(--text2)'}}>{e.description}</span>
                <span style={{color:'var(--danger)'}}>–৳{e.amount.toLocaleString()}</span>
              </div>
            ))}
            <div className="inv-line total"><span>Total expenses</span><span style={{color:'var(--danger)'}}>–৳{totalExp.toLocaleString()}</span></div>
          </div>
          <div className="card">
            <div className="inv-line total" style={{padding:'14px 16px'}}>
              <span style={{fontSize:14}}>Net profit — June 2026</span>
              <span style={{fontSize:16,color:'var(--navy)'}}>৳{profit.toLocaleString()}</span>
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
                  <select className="form-select" value={newExp.category} onChange={e=>setNewExp(n=>({...n,category:e.target.value}))}>
                    {['Advertising','Tools','Communication','Bank fees','Miscellaneous'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Amount (৳)</label><input className="form-input" type="number" value={newExp.amount} onChange={e=>setNewExp(n=>({...n,amount:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Date</label><input className="form-input" type="date" value={newExp.date} onChange={e=>setNewExp(n=>({...n,date:e.target.value}))} /></div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button className="btn btn-full" onClick={()=>setAdding(false)}>Cancel</button>
                  <button className="btn btn-primary btn-full" onClick={handleAddExpense}>Save</button>
                </div>
              </div>
            </div>
          ) : (
            <button className="btn btn-primary btn-full mb-12" onClick={()=>setAdding(true)} style={{padding:11}}>
              <Plus size={15} /> Add expense
            </button>
          )}
          <div className="card">
            {expenses.map(e => (
              <div key={e.id} style={{padding:'10px 16px',borderBottom:'1px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontWeight:600,fontSize:13}}>{e.description}</div>
                    <div style={{fontSize:11.5,color:'var(--text3)'}}>{e.category} · {e.date}</div>
                  </div>
                  <div style={{color:'var(--danger)',fontWeight:700}}>–৳{e.amount.toLocaleString()}</div>
                </div>
              </div>
            ))}
            <div className="inv-line total"><span>Total</span><span style={{color:'var(--danger)'}}>–৳{totalExp.toLocaleString()}</span></div>
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
    // Save to Supabase
    const { error } = await supabase.from('settings').upsert([{ id: 1, ...s, updated_at: new Date().toISOString() }])
    // Also save to localStorage as backup
    localStorage.setItem('vvc_settings', JSON.stringify(s))
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  useEffect(() => {
    const loadSettings = async () => {
      // Try Supabase first
      const { data } = await supabase.from('settings').select('*').eq('id', 1).single()
      if (data) {
        setS(prev => ({ ...prev, ...data }))
      } else {
        // Fall back to localStorage
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
            <input className="form-input" type="password" placeholder="AIza..." value={s.gemini_api_key} onChange={e=>set('gemini_api_key',e.target.value)} />
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
