import { supabase } from '../lib/supabase'
import React, { useState, useEffect } from 'react'
import { getInvoices, getCases, markInvoicePaid, getExpenses, addExpense, buildWhatsAppLink, waInvoiceMessage } from '../lib/supabase'
import { CheckCircle, MessageCircle, Plus, Trash2, Edit2, Download } from 'lucide-react'

// ── INVOICES ──
export function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [filter, setFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editInv, setEditInv] = useState(null)
  const [editData, setEditData] = useState({})

  const loadInvoices = async () => {
    const { data, error } = await getInvoices()
    if (error) {
      console.error('Invoice load error:', error.message)
    }
    setInvoices(data || [])
    return data
  }

  useEffect(() => { loadInvoices() }, [])

  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')

  const syncInvoicesFromCases = async () => {
    setSyncing(true)
    setSyncMsg('')
    try {
      const { data: allCases, error: cErr } = await getCases()
      if (cErr) { setSyncMsg('❌ Cannot read cases: ' + cErr.message); setSyncing(false); return }
      
      const { data: allInvoices, error: iErr } = await getInvoices()
      if (iErr) { setSyncMsg('❌ Cannot read invoices: ' + iErr.message); setSyncing(false); return }
      
      const existingRefs = new Set((allInvoices||[]).map(i => i.case_ref))
      const missing = (allCases||[]).filter(c => c.case_id && !existingRefs.has(c.case_id))
      
      if (missing.length === 0) {
        setSyncMsg(`✅ All ${(allCases||[]).length} cases already have invoices.`)
        await loadInvoices()
        setSyncing(false)
        return
      }
      
      let created = 0
      let errors = 0
      for (const c of missing) {
        const invNum = 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6) + created
        const { error: insErr } = await supabase.from('invoices').insert([{
          case_ref: c.case_id,
          client_name: c.client_name,
          client_phone: c.client_phone || '',
          amount: Number(c.amount) || 1000,
          payment_method: c.payment_method || 'bKash Send Money',
          status: c.payment_status === 'received' ? 'paid' : 'unpaid',
          invoice_number: invNum,
          created_at: c.created_at || new Date().toISOString()
        }])
        if (insErr) { 
          console.error('Insert error:', insErr.message)
          if (errors === 0) setSyncMsg('❌ Insert error: ' + insErr.message)
          errors++ 
        } else created++
      }
      
      const result = await loadInvoices()
      setSyncMsg(`✅ Created ${created} invoices${errors > 0 ? ` (${errors} failed — check RLS)` : ''}. Found ${result?.length || 0} total.`)
    } catch (e) {
      setSyncMsg('❌ Sync failed: ' + e.message)
    }
    setSyncing(false)
  }

  const filtered = filter === 'all' ? invoices : invoices.filter(i => i.status === filter)
  const paid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
  const unpaid = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0)

  const handleMarkPaid = async (inv) => {
    await markInvoicePaid(inv.id, editData.payment_method || inv.payment_method)
    await loadInvoices()
  }

  const generateInvoicePDF = async (inv) => {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = 210, pad = 20
    
    // Header
    doc.setFillColor(15, 76, 129)
    doc.rect(0, 0, W, 38, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('VISA VERIFICATION CENTER', pad, 16)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Document Intelligence Unit | VVC Global | Dhaka, Bangladesh', pad, 24)
    doc.text('vvcbd2026@gmail.com  |  +880 1943-160122', pad, 31)

    // Invoice title
    doc.setTextColor(15, 76, 129)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('INVOICE', W - pad, 52, { align: 'right' })
    
    // Invoice meta
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    doc.text(`Invoice No: ${inv.invoice_number}`, W - pad, 60, { align: 'right' })
    doc.text(`Date: ${new Date().toLocaleDateString('en-GB')}`, W - pad, 66, { align: 'right' })
    doc.text(`Case Ref: ${inv.case_ref || '—'}`, W - pad, 72, { align: 'right' })

    // Client info
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(40, 40, 40)
    doc.text('BILLED TO:', pad, 52)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(inv.client_name || '—', pad, 60)
    doc.text(inv.client_phone || '', pad, 67)

    // Divider
    doc.setDrawColor(15, 76, 129)
    doc.setLineWidth(0.5)
    doc.line(pad, 80, W - pad, 80)

    // Table header
    doc.setFillColor(240, 244, 248)
    doc.rect(pad, 83, W - pad*2, 10, 'F')
    doc.setTextColor(15, 76, 129)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('DESCRIPTION', pad + 2, 90)
    doc.text('AMOUNT', W - pad - 2, 90, { align: 'right' })

    // Service row
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text('Document Intelligence & Verification Service', pad + 2, 101)
    doc.text(`Case: ${inv.case_ref || inv.invoice_number}`, pad + 2, 107)
    doc.setFont('helvetica', 'bold')
    doc.text(`BDT ${Number(inv.amount).toLocaleString()}`, W - pad - 2, 101, { align: 'right' })

    // Divider
    doc.setDrawColor(200, 200, 200)
    doc.line(pad, 113, W - pad, 113)

    // Total
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(15, 76, 129)
    doc.text('TOTAL:', W - pad - 40, 122)
    doc.text(`BDT ${Number(inv.amount).toLocaleString()}`, W - pad - 2, 122, { align: 'right' })

    // Payment info
    doc.setFillColor(248, 250, 252)
    doc.rect(pad, 130, W - pad*2, 28, 'F')
    doc.setFontSize(9)
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'bold')
    doc.text('PAYMENT DETAILS', pad + 4, 138)
    doc.setFont('helvetica', 'normal')
    doc.text(`Method: ${inv.payment_method || 'bKash'}`, pad + 4, 145)
    doc.text(`Status: ${inv.status?.toUpperCase() || 'UNPAID'}`, pad + 4, 151)
    doc.text(`bKash: 01317-185875  |  Nagad: 01317-185875`, pad + 4, 157)

    // Footer
    doc.setFillColor(15, 76, 129)
    doc.rect(0, 275, W, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.text('Thank you for choosing VVC Global — Protecting Bangladeshis from Overseas Employment Fraud', W/2, 283, { align: 'center' })
    doc.text('This is a computer generated invoice. No signature required.', W/2, 290, { align: 'center' })

    doc.save(`VVC-Invoice-${inv.invoice_number}.pdf`)
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

  const [addingInv, setAddingInv] = useState(false)
  const [newInv, setNewInv] = useState({ client_name:'', client_phone:'', case_ref:'', amount:'', payment_method:'bKash Send Money', status:'unpaid' })
  const [savingInv, setSavingInv] = useState(false)

  const saveNewInv = async () => {
    if (!newInv.client_name || !newInv.amount) return
    setSavingInv(true)
    const invNum = 'INV-' + new Date().getFullYear() + '-' + String(Math.floor(1000+Math.random()*9000))
    await supabase.from('invoices').insert([{ ...newInv, amount: Number(newInv.amount), invoice_number: invNum, created_at: new Date().toISOString() }])
    await loadInvoices()
    setNewInv({ client_name:'', client_phone:'', case_ref:'', amount:'', payment_method:'bKash Send Money', status:'unpaid' })
    setAddingInv(false)
    setSavingInv(false)
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

      {addingInv ? (
        <div className="card mb-12">
          <div className="card-header">Add invoice manually</div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Client name</label><input className="form-input" value={newInv.client_name} onChange={e=>setNewInv(n=>({...n,client_name:e.target.value}))} placeholder="Client name"/></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={newInv.client_phone} onChange={e=>setNewInv(n=>({...n,client_phone:e.target.value}))} placeholder="+880..."/></div>
              <div className="form-group"><label className="form-label">Case ref</label><input className="form-input" value={newInv.case_ref} onChange={e=>setNewInv(n=>({...n,case_ref:e.target.value}))} placeholder="VVC-..."/></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Amount (৳)</label><input className="form-input" type="number" value={newInv.amount} onChange={e=>setNewInv(n=>({...n,amount:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Payment method</label>
                <select className="form-select" value={newInv.payment_method} onChange={e=>setNewInv(n=>({...n,payment_method:e.target.value}))}>
                  {['bKash Send Money','bKash Merchant','Nagad','Rocket','EBL Bank','Cash'].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Status</label>
              <select className="form-select" value={newInv.status} onChange={e=>setNewInv(n=>({...n,status:e.target.value}))}>
                {['unpaid','paid','overdue'].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>setAddingInv(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={saveNewInv} disabled={savingInv}>{savingInv?'Saving...':'Save invoice'}</button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
          <button className="btn btn-primary btn-full" style={{padding:11}} onClick={()=>setAddingInv(true)}>
            <Plus size={15}/> Add manually
          </button>
          <button className="btn btn-full" style={{padding:11}} onClick={syncInvoicesFromCases} disabled={syncing}>
            {syncing ? 'Syncing...' : '🔄 Sync from cases'}
          </button>
        </div>
      )}
      {syncMsg && <div style={{fontSize:12.5,padding:'8px 12px',borderRadius:8,background:'var(--surface2)',color:'var(--text2)',marginBottom:12}}>{syncMsg}</div>}

      {/* Karbar-style invoice table */}
      <div className="card">
        {/* Table header */}
        <div style={{display:'grid',gridTemplateColumns:'80px 1fr 100px 80px 100px 120px',gap:0,background:'var(--surface2)',padding:'10px 16px',borderBottom:'2px solid var(--border)',fontSize:11,fontWeight:700,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.3px'}}>
          <div>Inv No</div>
          <div>Client</div>
          <div>Date</div>
          <div>Status</div>
          <div style={{textAlign:'right'}}>Amount</div>
          <div style={{textAlign:'center'}}>Actions</div>
        </div>
        {filtered.length === 0 && <div style={{padding:32,textAlign:'center',color:'var(--text3)',fontSize:13}}>No invoices yet.<br/>Click "+ Add manually" or "Sync from cases" above.</div>}
        {filtered.map((inv,idx) => (
          <div key={inv.id} style={{display:'grid',gridTemplateColumns:'80px 1fr 100px 80px 100px 120px',gap:0,padding:'12px 16px',borderBottom:'1px solid var(--border)',alignItems:'center',background:idx%2===0?'#fff':'#FAFBFC'}}>
            {/* Invoice No */}
            <div style={{fontSize:12,fontWeight:700,color:'var(--navy)'}}>{inv.invoice_number?.replace('INV-','#') || '#—'}</div>
            {/* Client */}
            <div>
              <div style={{fontWeight:600,fontSize:13}}>{inv.client_name}</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>{inv.case_ref} · {inv.payment_method}</div>
            </div>
            {/* Date */}
            <div style={{fontSize:12,color:'var(--text2)'}}>
              {inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'2-digit'}) : '—'}
            </div>
            {/* Status */}
            <div>
              <span style={{fontSize:11,fontWeight:700,padding:'3px 8px',borderRadius:20,background:inv.status==='paid'?'#DCFCE7':inv.status==='overdue'?'#FEE2E2':'#FEF3C7',color:inv.status==='paid'?'#15803D':inv.status==='overdue'?'#B91C1C':'#B45309'}}>
                {(inv.status||'unpaid').toUpperCase()}
              </span>
            </div>
            {/* Amount */}
            <div style={{textAlign:'right',fontWeight:700,fontSize:14,color:inv.status==='paid'?'#15803D':'var(--text)'}}>
              ৳{Number(inv.amount||0).toLocaleString()}
            </div>
            {/* Actions */}
            <div style={{display:'flex',gap:4,justifyContent:'center',alignItems:'center'}}>
              <button title="Download PDF" onClick={()=>generateInvoicePDF(inv)} style={{background:'var(--navy)',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',color:'#fff',display:'flex',alignItems:'center',gap:3,fontSize:11}}>
                <Download size={11}/> PDF
              </button>
              {inv.status !== 'paid' && (
                <button title="Mark paid" onClick={()=>handleMarkPaid(inv)} style={{background:'#15803D',border:'none',borderRadius:6,padding:'5px 8px',cursor:'pointer',color:'#fff',fontSize:11}}>
                  ✓
                </button>
              )}
              <button title="Edit" onClick={()=>openEdit(inv)} style={{background:'none',border:'1px solid var(--border)',borderRadius:6,padding:'5px 7px',cursor:'pointer',color:'var(--navy)'}}>
                <Edit2 size={11}/>
              </button>
              <button title="Delete" onClick={()=>setConfirmDelete(inv)} style={{background:'none',border:'1px solid #FECACA',borderRadius:6,padding:'5px 7px',cursor:'pointer',color:'var(--danger)'}}>
                <Trash2 size={11}/>
              </button>
            </div>
          </div>
        ))}
        {filtered.length > 0 && (
          <div style={{padding:'10px 16px',background:'var(--surface2)',borderTop:'2px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontSize:12,color:'var(--text2)'}}>{filtered.length} invoice{filtered.length!==1?'s':''}</div>
            <div style={{fontWeight:700,fontSize:14,color:'var(--navy)'}}>Total: ৳{filtered.reduce((s,i)=>s+Number(i.amount||0),0).toLocaleString()}</div>
          </div>
        )}
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
      if (data) {
        setInvoices(data)
        const paidTotal = data.filter(i => i.status === 'paid').reduce((s,i) => s + i.amount, 0)
        setIncome(paidTotal)
      }
    })
  }, [])

  const totalExp = expenses.reduce((s,e) => s + Number(e.amount), 0)
  const profit = income - totalExp
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0
  const outstanding = invoices.filter(i => i.status !== 'paid').reduce((s,i) => s + Number(i.amount||0), 0)

  // Cashflow last 7 days
  const cashflow7 = Array.from({length:7}, (_,i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6-i))
    const dateStr = d.toISOString().slice(0,10)
    const moneyIn = invoices.filter(inv => inv.status==='paid' && (inv.paid_at||inv.created_at||'').slice(0,10)===dateStr).reduce((s,inv)=>s+Number(inv.amount||0),0)
    const moneyOut = expenses.filter(e => (e.date||e.created_at||'').slice(0,10)===dateStr).reduce((s,e)=>s+Number(e.amount||0),0)
    return { label: d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}), dateStr, moneyIn, moneyOut }
  })
  const weekIn = cashflow7.reduce((s,d)=>s+d.moneyIn,0)
  const weekOut = cashflow7.reduce((s,d)=>s+d.moneyOut,0)

  // Recent transactions (combined income + expense, sorted by date desc)
  const recentTx = [
    ...invoices.filter(i=>i.status==='paid').map(i=>({type:'in', label:i.client_name, sub:i.invoice_number, amount:Number(i.amount||0), date:i.paid_at||i.created_at})),
    ...expenses.map(e=>({type:'out', label:e.description, sub:e.category, amount:Number(e.amount||0), date:e.date||e.created_at}))
  ].filter(t=>t.date).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8)

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
          {/* Karbar-style colored summary cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
            <div style={{background:'#FEF3E2',border:'1px solid #FDE4BC',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11.5,color:'#B45309',fontWeight:600,marginBottom:6}}>↓ To Receive</div>
              <div style={{fontSize:20,fontWeight:800,color:'#B45309'}}>৳{outstanding.toLocaleString()}</div>
            </div>
            <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11.5,color:'#15803D',fontWeight:600,marginBottom:6}}>↑ Total Income</div>
              <div style={{fontSize:20,fontWeight:800,color:'#15803D'}}>৳{income.toLocaleString()}</div>
            </div>
            <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11.5,color:'#B91C1C',fontWeight:600,marginBottom:6}}>↓ Total Expense</div>
              <div style={{fontSize:20,fontWeight:800,color:'#B91C1C'}}>৳{totalExp.toLocaleString()}</div>
            </div>
            <div style={{background:profit>=0?'#EFF6FF':'#FEF2F2',border:`1px solid ${profit>=0?'#BFDBFE':'#FECACA'}`,borderRadius:10,padding:'14px 16px'}}>
              <div style={{fontSize:11.5,color:profit>=0?'#1D4ED8':'#B91C1C',fontWeight:600,marginBottom:6}}>Net Profit</div>
              <div style={{fontSize:20,fontWeight:800,color:profit>=0?'#1D4ED8':'#B91C1C'}}>৳{profit.toLocaleString()}</div>
            </div>
          </div>

          {/* Cashflow chart - Karbar style */}
          <div className="card mb-12">
            <div className="card-header">Cashflow (Last 7 Days)</div>
            <div style={{padding:'14px 16px'}}>
              {(() => {
                const maxVal = Math.max(...cashflow7.map(d=>Math.max(d.moneyIn,d.moneyOut)), 1000)
                return (
                  <div style={{display:'flex',gap:6,alignItems:'flex-end',height:120,marginBottom:8}}>
                    {cashflow7.map((d,i)=>(
                      <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                        <div style={{display:'flex',gap:2,alignItems:'flex-end',height:100,width:'100%',justifyContent:'center'}}>
                          <div title={`In: ৳${d.moneyIn}`} style={{width:'40%',background:'var(--success)',borderRadius:'3px 3px 0 0',height:`${Math.max(Math.round(d.moneyIn/maxVal*100),d.moneyIn>0?4:0)}px`,minHeight:d.moneyIn>0?4:0}}/>
                          <div title={`Out: ৳${d.moneyOut}`} style={{width:'40%',background:'var(--danger)',borderRadius:'3px 3px 0 0',height:`${Math.max(Math.round(d.moneyOut/maxVal*100),d.moneyOut>0?4:0)}px`,minHeight:d.moneyOut>0?4:0}}/>
                        </div>
                        <div style={{fontSize:9.5,color:'var(--text3)',marginTop:2}}>{d.label}</div>
                      </div>
                    ))}
                  </div>
                )
              })()}
              <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--border)',paddingTop:10}}>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11.5,color:'var(--text2)'}}>
                    <span style={{width:9,height:9,borderRadius:2,background:'var(--success)',display:'inline-block'}}/>Total Money In
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--success)'}}>৳{weekIn.toLocaleString()}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11.5,color:'var(--text2)',justifyContent:'flex-end'}}>
                    <span style={{width:9,height:9,borderRadius:2,background:'var(--danger)',display:'inline-block'}}/>Total Money Out
                  </div>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--danger)'}}>৳{weekOut.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent transactions */}
          <div className="card mb-12">
            <div className="card-header">Recent Transactions</div>
            {recentTx.length === 0 && <div style={{padding:'16px',textAlign:'center',color:'var(--text3)',fontSize:13}}>No transactions yet</div>}
            {recentTx.map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderTop:i>0?'1px solid var(--border)':'none'}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:t.type==='in'?'#F0FDF4':'#FEF2F2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:t.type==='in'?'var(--success)':'var(--danger)',fontWeight:700,fontSize:14}}>
                  {t.type==='in'?'↓':'↑'}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13}}>{t.label}</div>
                  <div style={{fontSize:11.5,color:'var(--text3)'}}>{t.sub} · {new Date(t.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</div>
                </div>
                <div style={{fontWeight:700,fontSize:14,color:t.type==='in'?'var(--success)':'var(--danger)'}}>
                  {t.type==='in'?'+':'-'}৳{t.amount.toLocaleString()}
                </div>
              </div>
            ))}
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
  claude_api_key: '', gemini_api_key: '',
  wa_number_1: '', wa_name_1: 'Main Business',
  wa_number_2: '', wa_name_2: 'Sales',
  wa_number_3: '', wa_name_3: 'Support',
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
        <div className="card-header">WhatsApp Business accounts (up to 3)</div>
        <div style={{ padding:'12px 16px' }}>
          {[1,2,3].map(n => (
            <div key={n} style={{marginBottom:12,padding:'12px',background:'var(--surface2)',borderRadius:8}}>
              <div style={{fontSize:12,fontWeight:600,color:'var(--text2)',marginBottom:8}}>Account {n}</div>
              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Label / Name</label>
                  <input className="form-input" placeholder={`e.g. Main Business`} value={s[`wa_name_${n}`]||''} onChange={e=>set(`wa_name_${n}`,e.target.value)} />
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">WhatsApp number</label>
                  <input className="form-input" placeholder="+880 1XXXXXXXXX" value={s[`wa_number_${n}`]||''} onChange={e=>set(`wa_number_${n}`,e.target.value)} type="tel" />
                </div>
              </div>
            </div>
          ))}
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
