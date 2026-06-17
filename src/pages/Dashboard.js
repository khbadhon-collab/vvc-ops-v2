import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases, getInvoices, getExpenses, addExpense, buildWhatsAppLink, waFollowUp, waReviewRequest, supabase } from '../lib/supabase'
import { AlertTriangle, Plus, ChevronRight, FileCheck, TrendingUp, Users, Globe, MessageCircle, Clock, Star, RefreshCw, Receipt, Wallet, Edit2, Trash2 } from 'lucide-react'

const statusLabel = { pending:'Awaiting docs', progress:'In review', suspicious:'Suspicious', manipulated:'Manipulated', done:'Delivered', new:'New' }
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Dashboard() {
  const [cases, setCases] = useState([])
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showSaleModal, setShowSaleModal] = useState(false)
  const [showExpModal, setShowExpModal] = useState(false)
  const [saleForm, setSaleForm] = useState({client_name:'',amount:'',payment_method:'bKash Send Money'})
  const [expForm, setExpForm] = useState({description:'',amount:'',category:'General'})
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  const quickAddSale = async () => {
    if (!saleForm.client_name || !saleForm.amount) return
    setSaving(true)
    const invNum = 'INV-' + Date.now()
    await supabase.from('invoices').insert([{
      client_name: saleForm.client_name,
      amount: Number(saleForm.amount),
      payment_method: saleForm.payment_method,
      tier: 'basic',
      status: 'paid',
      paid_at: new Date().toISOString(),
      invoice_number: invNum,
      created_at: new Date().toISOString()
    }])
    setSaleForm({client_name:'',amount:'',payment_method:'bKash Send Money'})
    setShowSaleModal(false)
    setSaving(false)
    load(true)
  }

  const quickAddExpense = async () => {
    if (!expForm.description || !expForm.amount) return
    setSaving(true)
    await supabase.from('expenses').insert([{
      description: expForm.description,
      amount: Number(expForm.amount),
      category: expForm.category,
      date: new Date().toISOString().slice(0,10),
      created_at: new Date().toISOString()
    }])
    setExpForm({description:'',amount:'',category:'General'})
    setShowExpModal(false)
    setSaving(false)
    load(true)
  }

  const now = new Date()
  const todayStr = now.toISOString().slice(0,10)
  const monthName = MONTHS[now.getMonth()]
  const year = now.getFullYear()
  const monthStart = new Date(year, now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(year, now.getMonth()-1, 1).toISOString()
  const prevMonthEnd = new Date(year, now.getMonth(), 0).toISOString()

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    await Promise.all([
      getCases().then(({data}) => setCases(data||[])),
      getInvoices().then(({data}) => setInvoices(data||[])),
      getExpenses().then(({data}) => setExpenses(data||[]))
    ])
    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => { load() }, [])

  // ── Core stats ──
  const thisMonthCases = cases.filter(c => c.created_at >= monthStart)
  const prevMonthCases = cases.filter(c => c.created_at >= prevMonthStart && c.created_at <= prevMonthEnd)
  const active = cases.filter(c => c.status !== 'done').length
  const pending = cases.filter(c => ['pending','new'].includes(c.status)).length
  const suspicious = cases.filter(c => ['suspicious','manipulated'].includes(c.status)).length
  const done = cases.filter(c => c.status === 'done').length
  const completedToday = cases.filter(c => c.status==='done' && (c.completed_at||'').slice(0,10)===todayStr).length
  const caseTrend = thisMonthCases.length - prevMonthCases.length
  const newToday = cases.filter(c => (c.created_at||'').slice(0,10)===todayStr).length

  // ── Finance stats ──
  const paidInvoices = invoices.filter(i => i.status==='paid')
  const unpaidInvoices = invoices.filter(i => i.status!=='paid')
  const thisMonthIncome = paidInvoices.filter(i => (i.paid_at||i.created_at) >= monthStart).reduce((s,i)=>s+Number(i.amount||0),0)
  const todaySales = paidInvoices.filter(i => (i.paid_at||i.created_at||'').slice(0,10)===todayStr).reduce((s,i)=>s+Number(i.amount||0),0)
  const todaySalesCount = paidInvoices.filter(i => (i.paid_at||i.created_at||'').slice(0,10)===todayStr).length
  const thisMonthExpenses = expenses.filter(e => (e.date||e.created_at||'') >= monthStart).reduce((s,e)=>s+Number(e.amount||0),0)
  const todayExpenses = expenses.filter(e => (e.date||e.created_at||'').slice(0,10)===todayStr).reduce((s,e)=>s+Number(e.amount||0),0)
  const outstanding = unpaidInvoices.reduce((s,i)=>s+Number(i.amount||0),0)
  const netProfit = thisMonthIncome - thisMonthExpenses
  const prevMonthIncome = paidInvoices.filter(i => (i.paid_at||i.created_at) >= prevMonthStart && (i.paid_at||i.created_at) <= prevMonthEnd).reduce((s,i)=>s+Number(i.amount||0),0)
  const incomeTrend = thisMonthIncome - prevMonthIncome
  const totalBalance = thisMonthIncome - thisMonthExpenses

  // ── Cashflow last 7 days ──
  const cashflow7 = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i))
    const ds = d.toISOString().slice(0,10)
    const moneyIn = paidInvoices.filter(inv => (inv.paid_at||inv.created_at||'').slice(0,10)===ds).reduce((s,inv)=>s+Number(inv.amount||0),0)
    const moneyOut = expenses.filter(e => (e.date||e.created_at||'').slice(0,10)===ds).reduce((s,e)=>s+Number(e.amount||0),0)
    return { label: d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}), ds, moneyIn, moneyOut }
  })
  const weekIn = cashflow7.reduce((s,d)=>s+d.moneyIn,0)
  const weekOut = cashflow7.reduce((s,d)=>s+d.moneyOut,0)
  const cfMax = Math.max(...cashflow7.map(d=>Math.max(d.moneyIn,d.moneyOut)), 1000)

  // ── 6-month trend ──
  const last6 = Array.from({length:6},(_,i)=>{
    const m = new Date(year, now.getMonth()-5+i, 1)
    const mStart = m.toISOString()
    const mEnd = new Date(year, now.getMonth()-5+i+1, 0).toISOString()
    return {
      label: SHORT_MONTHS[m.getMonth()],
      cases: cases.filter(c=>c.created_at>=mStart&&c.created_at<=mEnd).length,
      income: paidInvoices.filter(i=>(i.paid_at||i.created_at)>=mStart&&(i.paid_at||i.created_at)<=mEnd).reduce((s,x)=>s+Number(x.amount||0),0)
    }
  })
  const maxCases = Math.max(...last6.map(m=>m.cases),1)
  const maxIncome = Math.max(...last6.map(m=>m.income),1)

  // ── Alerts ──
  const actions = cases.filter(c=>['pending','progress','suspicious','new'].includes(c.status)).slice(0,5)
  const stale = cases.filter(c => ['pending','new'].includes(c.status) && new Date(c.created_at) < new Date(Date.now()-3*24*60*60*1000) && c.client_phone)
  const reviewable = cases.filter(c => c.status==='done' && c.client_phone).slice(0,2)

  // ── Today's paid invoices ──
  const todayPaidList = paidInvoices.filter(i => (i.paid_at||i.created_at||'').slice(0,10)===todayStr).sort((a,b)=>new Date(b.paid_at||b.created_at)-new Date(a.paid_at||a.created_at))

  // ── Recent transactions ──
  const recentTx = [
    ...paidInvoices.map(i=>({type:'in', label:i.client_name, sub:i.invoice_number||i.case_ref, amount:Number(i.amount||0), date:i.paid_at||i.created_at})),
    ...expenses.map(e=>({type:'out', label:e.description, sub:e.category, amount:Number(e.amount||0), date:e.date||e.created_at}))
  ].filter(t=>t.date).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8)

  if (loading) return <div style={{padding:30,textAlign:'center',color:'var(--text3)'}}>Loading dashboard...</div>

  return (
    <div>
      {/* Quick Add Sale Modal */}
      {showSaleModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:14,padding:24,maxWidth:340,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:16,color:'var(--navy)'}}>+ Add Sales Payment</div>
            <div className="form-group"><label className="form-label">Client name *</label>
              <input className="form-input" placeholder="e.g. Mr Noyon" value={saleForm.client_name} onChange={e=>setSaleForm(f=>({...f,client_name:e.target.value}))}/>
            </div>
            <div className="form-group"><label className="form-label">Amount (৳) *</label>
              <input className="form-input" type="number" placeholder="1000" value={saleForm.amount} onChange={e=>setSaleForm(f=>({...f,amount:e.target.value}))}/>
            </div>
            <div className="form-group"><label className="form-label">Payment method</label>
              <select className="form-select" value={saleForm.payment_method} onChange={e=>setSaleForm(f=>({...f,payment_method:e.target.value}))}>
                {['bKash Send Money','bKash Merchant','Nagad','Rocket','Cash','Bank Transfer'].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
              <button className="btn btn-full" onClick={()=>setShowSaleModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={quickAddSale} disabled={saving||!saleForm.client_name||!saleForm.amount}>{saving?'Saving...':'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Expense Modal */}
      {showExpModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:14,padding:24,maxWidth:340,width:'100%',boxShadow:'0 20px 60px rgba(0,0,0,.2)'}}>
            <div style={{fontWeight:700,fontSize:16,marginBottom:16,color:'var(--navy)'}}>+ Add Expense</div>
            <div className="form-group"><label className="form-label">Description *</label>
              <input className="form-input" placeholder="e.g. Facebook Ads" value={expForm.description} onChange={e=>setExpForm(f=>({...f,description:e.target.value}))}/>
            </div>
            <div className="form-group"><label className="form-label">Amount (৳) *</label>
              <input className="form-input" type="number" placeholder="500" value={expForm.amount} onChange={e=>setExpForm(f=>({...f,amount:e.target.value}))}/>
            </div>
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-select" value={expForm.category} onChange={e=>setExpForm(f=>({...f,category:e.target.value}))}>
                {['Advertising','Rent','Salary','Utilities','Transport','Food','Software','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:4}}>
              <button className="btn btn-full" onClick={()=>setShowExpModal(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={quickAddExpense} disabled={saving||!expForm.description||!expForm.amount}>{saving?'Saving...':'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Header - Karbar style */}
      <div style={{marginBottom:16}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <div>
            <div style={{fontWeight:700,fontSize:17,color:'var(--navy)'}}>Welcome, VVC Ops 👋</div>
            <div style={{fontSize:12,color:'var(--text3)'}}>{now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
          </div>
          <button className="btn btn-sm" onClick={()=>load(true)} disabled={refreshing} style={{color:'var(--navy)'}}>
            <RefreshCw size={12} style={{animation:refreshing?'spin 1s linear infinite':'none'}}/> {refreshing?'...':'Refresh'}
          </button>
        </div>
        {/* Karbar-style action buttons */}
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button onClick={()=>navigate('/cases/new')} style={{flex:1,minWidth:100,background:'#0F4C81',color:'#fff',border:'none',borderRadius:10,padding:'10px 12px',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <Plus size={14}/> New Case
          </button>
          <button onClick={()=>setShowSaleModal(true)} style={{flex:1,minWidth:100,background:'#15803D',color:'#fff',border:'none',borderRadius:10,padding:'10px 12px',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <Receipt size={14}/> Add Sale
          </button>
          <button onClick={()=>setShowExpModal(true)} style={{flex:1,minWidth:100,background:'#B91C1C',color:'#fff',border:'none',borderRadius:10,padding:'10px 12px',fontWeight:700,fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
            <Wallet size={14}/> Add Expense
          </button>
        </div>
      </div>

      {/* TOP SUMMARY CARDS - Karbar 4-in-a-row style */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
        <div onClick={()=>navigate('/invoices')} style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:12,padding:'14px 16px',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
            <span style={{fontSize:18,color:'#15803D'}}>↓</span>
            <span style={{fontSize:11,color:'#15803D',fontWeight:600}}>To Receive</span>
          </div>
          <div style={{fontSize:22,fontWeight:800,color:'#15803D'}}>৳{outstanding.toLocaleString()}</div>
          <div style={{fontSize:11,color:'#15803D',marginTop:3,opacity:.8}}>{unpaidInvoices.length} unpaid invoices</div>
        </div>
        <div onClick={()=>navigate('/finance')} style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12,padding:'14px 16px',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
            <span style={{fontSize:18,color:'#B91C1C'}}>↑</span>
            <span style={{fontSize:11,color:'#B91C1C',fontWeight:600}}>Expense ({monthName})</span>
          </div>
          <div style={{fontSize:22,fontWeight:800,color:'#B91C1C'}}>৳{thisMonthExpenses.toLocaleString()}</div>
          <div style={{fontSize:11,color:'#B91C1C',marginTop:3,opacity:.8}}>Today: ৳{todayExpenses.toLocaleString()}</div>
        </div>
        <div onClick={()=>navigate('/finance')} style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:12,padding:'14px 16px',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
            <span style={{fontSize:18}}>🏷</span>
            <span style={{fontSize:11,color:'#1D4ED8',fontWeight:600}}>Sales ({monthName})</span>
          </div>
          <div style={{fontSize:22,fontWeight:800,color:'#1D4ED8'}}>৳{thisMonthIncome.toLocaleString()}</div>
          <div style={{fontSize:11,color:'#1D4ED8',marginTop:3,opacity:.8}}>{incomeTrend>=0?`↑ ৳${incomeTrend.toLocaleString()} vs last month`:`↓ ৳${Math.abs(incomeTrend).toLocaleString()} vs last month`}</div>
        </div>
        <div onClick={()=>navigate('/cases')} style={{background:'#F0F9FF',border:'1px solid #BAE6FD',borderRadius:12,padding:'14px 16px',cursor:'pointer'}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
            <span style={{fontSize:18}}>🛒</span>
            <span style={{fontSize:11,color:'#0369A1',fontWeight:600}}>Active Cases</span>
          </div>
          <div style={{fontSize:22,fontWeight:800,color:'#0369A1'}}>{active}</div>
          <div style={{fontSize:11,color:'#0369A1',marginTop:3,opacity:.8}}>{newToday} new today</div>
        </div>
      </div>

      {/* TOTAL BALANCE + TODAY SALES */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
        <div style={{background:'var(--navy)',borderRadius:12,padding:'14px 16px',color:'#fff'}}>
          <div style={{fontSize:11,fontWeight:600,opacity:.7,marginBottom:4}}>Total Balance (Cash & Month)</div>
          <div style={{fontSize:22,fontWeight:800}}>৳{totalBalance.toLocaleString()}</div>
          <div style={{fontSize:11,opacity:.6,marginTop:3}}>Income minus Expenses</div>
        </div>
        <div onClick={()=>setShowSaleModal(true)} style={{background:todaySales>0?'#F0FDF4':'#fff',border:'1px solid #BBF7D0',borderRadius:12,padding:'14px 16px',cursor:'pointer'}}>
          <div style={{fontSize:11,color:'#15803D',fontWeight:600,marginBottom:4}}>💰 Today's Sales</div>
          <div style={{fontSize:22,fontWeight:800,color:'#15803D'}}>৳{todaySales.toLocaleString()}</div>
          <div style={{fontSize:11,color:'#15803D',marginTop:3,opacity:.8}}>{todaySalesCount} received · tap to add more</div>
        </div>
      </div>

      {/* STATUS PILLS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginBottom:12}}>
        {[
          {label:'Pending',value:pending,color:'var(--warning)'},
          {label:'Suspicious',value:suspicious,color:'var(--danger)'},
          {label:'Delivered',value:done,color:'var(--success)'},
          {label:'Done today',value:completedToday,color:completedToday>0?'var(--success)':'var(--text3)'},
          {label:'Net profit',value:`৳${netProfit.toLocaleString()}`,color:netProfit>=0?'var(--success)':'var(--danger)'},
        ].map(({label,value,color})=>(
          <div key={label} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:'8px 4px',textAlign:'center'}}>
            <div style={{fontSize:9,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.3px',marginBottom:3}}>{label}</div>
            <div style={{fontSize:14,fontWeight:700,color}}>{value}</div>
          </div>
        ))}
      </div>

      {/* CASHFLOW CHART - Karbar style with scale */}
      <div className="card mb-12">
        <div className="card-header">
          <span>Cashflow <span style={{fontSize:11,fontWeight:400,color:'var(--text3)'}}>Last 7 Days</span></span>
        </div>
        <div style={{padding:'14px 16px'}}>
          {/* Karbar-style chart with Y-axis */}
          <div style={{display:'flex',gap:0,alignItems:'stretch'}}>
            {/* Y-axis labels */}
            <div style={{display:'flex',flexDirection:'column',justifyContent:'space-between',paddingBottom:24,marginRight:6,minWidth:28,height:220}}>
              {[cfMax, Math.round(cfMax*0.75), Math.round(cfMax*0.5), Math.round(cfMax*0.25), 0].map(v=>(
                <div key={v} style={{fontSize:9,color:'var(--text3)',textAlign:'right',lineHeight:1}}>
                  {v>=1000?Math.round(v/1000)+'k':v}
                </div>
              ))}
            </div>
            {/* Chart area */}
            <div style={{flex:1,position:'relative',height:220}}>
              {/* Horizontal grid lines */}
              {[0,25,50,75,100].map(p=>(
                <div key={p} style={{position:'absolute',left:0,right:0,bottom:`${(p/100)*192+24}px`,borderTop:'1px dashed #E5E7EB',zIndex:0}}/>
              ))}
              {/* Zero line */}
              <div style={{position:'absolute',left:0,right:0,bottom:24,borderTop:'2px solid #D1D5DB'}}/>
              {/* Bars container */}
              <div style={{position:'absolute',bottom:24,left:0,right:0,height:192,display:'flex',gap:6,alignItems:'flex-end',padding:'0 4px'}}>
                {cashflow7.map((d,i)=>(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,height:'100%',justifyContent:'flex-end'}}>
                    <div style={{display:'flex',gap:3,alignItems:'flex-end',width:'100%',justifyContent:'center',height:'100%'}}>
                      <div
                        style={{width:'42%',background:'#22C55E',borderRadius:'4px 4px 0 0',
                          height:d.moneyIn>0?`${Math.max(Math.round(d.moneyIn/cfMax*192),6)}px`:'0px',
                          transition:'height .4s ease',minWidth:8}}
                        title={`Money In: ৳${d.moneyIn.toLocaleString()}`}
                      />
                      <div
                        style={{width:'42%',background:'#EF4444',borderRadius:'4px 4px 0 0',
                          height:d.moneyOut>0?`${Math.max(Math.round(d.moneyOut/cfMax*192),6)}px`:'0px',
                          transition:'height .4s ease',minWidth:8}}
                        title={`Money Out: ৳${d.moneyOut.toLocaleString()}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              {/* X-axis dates */}
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:22,display:'flex',gap:6,padding:'0 4px'}}>
                {cashflow7.map((d,i)=>(
                  <div key={i} style={{flex:1,textAlign:'center',fontSize:9,color:d.ds===todayStr?'var(--navy)':'var(--text3)',fontWeight:d.ds===todayStr?700:400,paddingTop:4}}>
                    {d.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--border)',paddingTop:10,marginTop:4}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text3)'}}>
                <span style={{width:8,height:8,borderRadius:2,background:'#22C55E',display:'inline-block'}}/> Total Money In
              </div>
              <div style={{fontSize:17,fontWeight:800,color:'#22C55E'}}>৳{weekIn.toLocaleString()}</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--text3)',justifyContent:'flex-end'}}>
                <span style={{width:8,height:8,borderRadius:2,background:'#EF4444',display:'inline-block'}}/> Total Money Out
              </div>
              <div style={{fontSize:17,fontWeight:800,color:'#EF4444'}}>৳{weekOut.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S SALES LIST */}
      {todayPaidList.length > 0 && (
        <div className="card mb-12">
          <div className="card-header">
            <span>💰 Today's payments received</span>
            <span style={{fontSize:12,fontWeight:700,color:'#15803D'}}>৳{todaySales.toLocaleString()}</span>
          </div>
          {todayPaidList.map((inv,i)=>(
            <div key={inv.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderTop:i>0?'1px solid var(--border)':'none'}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'#F0FDF4',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'#15803D',fontWeight:800,fontSize:14}}>↓</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13}}>{inv.client_name}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{inv.case_ref} · {inv.payment_method}</div>
              </div>
              <div style={{fontWeight:700,fontSize:14,color:'#15803D'}}>+৳{Number(inv.amount).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}

      {/* RECENT TRANSACTIONS */}
      <div className="card mb-12">
        <div className="card-header">
          Recent Transactions
          <button className="btn btn-sm" onClick={()=>navigate('/finance')}>View all</button>
        </div>
        {recentTx.length === 0 && <div style={{padding:'16px',textAlign:'center',color:'var(--text3)',fontSize:13}}>No transactions yet. Mark invoices as paid to see them here.</div>}
        {recentTx.map((t,i)=>(
          <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 16px',borderTop:i>0?'1px solid var(--border)':'none'}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:t.type==='in'?'#F0FDF4':'#FEF2F2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:t.type==='in'?'#15803D':'#B91C1C',fontWeight:800,fontSize:16}}>
              {t.type==='in'?'↓':'↑'}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.label}</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>{t.sub} · {new Date(t.date).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}</div>
            </div>
            <div style={{fontWeight:700,fontSize:14,color:t.type==='in'?'#15803D':'#B91C1C',flexShrink:0}}>
              {t.type==='in'?'+':'-'}৳{t.amount.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* ACTIONS NEEDED */}
      {actions.length > 0 && (
        <div className="card mb-12">
          <div className="card-header">
            <span style={{display:'flex',alignItems:'center',gap:6}}><AlertTriangle size={14} color="var(--warning)"/> Actions needed</span>
            <span style={{fontSize:11,color:'var(--text3)',fontWeight:400}}>{actions.length} cases</span>
          </div>
          {actions.map(c=>(
            <div key={c.id} className="list-row" onClick={()=>navigate(`/cases/${c.id}`)}>
              <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:['suspicious','manipulated'].includes(c.status)?'var(--danger)':c.status==='pending'?'var(--warning)':'var(--info)'}}/>
              <div className="row-main">
                <div className="row-title">{c.client_name}</div>
                <div className="row-sub">{c.case_id} · {c.country} · {statusLabel[c.status]||c.status}</div>
              </div>
              <ChevronRight size={14} color="var(--text3)"/>
            </div>
          ))}
        </div>
      )}

      {/* FOLLOW-UP */}
      {stale.length > 0 && (
        <div className="card mb-12">
          <div className="card-header" style={{color:'var(--warning)'}}>
            <span style={{display:'flex',alignItems:'center',gap:6}}><Clock size={14}/> Follow-up needed</span>
            <span style={{fontSize:11,color:'var(--text3)',fontWeight:400}}>{stale.length} cases 3+ days</span>
          </div>
          {stale.slice(0,3).map(c=>(
            <div key={c.id} style={{padding:'10px 16px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{c.client_name}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{c.case_id} · {c.country}</div>
              </div>
              <a href={buildWhatsAppLink(c.client_phone, waFollowUp(c.client_name, c.case_id))} target="_blank" rel="noreferrer" className="btn btn-wa btn-sm">
                <MessageCircle size={12}/> Follow up
              </a>
            </div>
          ))}
        </div>
      )}

      {/* REVIEW REQUESTS */}
      {reviewable.length > 0 && (
        <div className="card mb-12">
          <div className="card-header"><span style={{display:'flex',alignItems:'center',gap:6}}><Star size={14} color="var(--gold)"/> Ask for reviews</span></div>
          {reviewable.map(c=>(
            <div key={c.id} style={{padding:'10px 16px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:600,fontSize:13}}>{c.client_name}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{c.case_id} · Delivered</div>
              </div>
              <a href={buildWhatsAppLink(c.client_phone, waReviewRequest(c.client_name))} target="_blank" rel="noreferrer" className="btn btn-sm" style={{color:'var(--warning)',borderColor:'var(--warning)'}}>
                <Star size={12}/> Request
              </a>
            </div>
          ))}
        </div>
      )}

      {/* 6-MONTH TREND */}
      <div className="card mb-12">
        <div className="card-header"><TrendingUp size={14}/> 6-month trend</div>
        <div style={{padding:'12px 16px'}}>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:5,fontWeight:600,textTransform:'uppercase',letterSpacing:'.3px'}}>Cases</div>
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:40,marginBottom:16}}>
            {last6.map((m,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{fontSize:9,color:'var(--text3)',fontWeight:600}}>{m.cases||''}</div>
                <div style={{width:'100%',background:i===5?'var(--navy)':'var(--surface2)',borderRadius:'2px 2px 0 0',height:`${Math.max(Math.round(m.cases/maxCases*32),m.cases>0?3:0)}px`}}/>
                <div style={{fontSize:9,color:i===5?'var(--navy)':'var(--text3)',fontWeight:i===5?700:400}}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:5,fontWeight:600,textTransform:'uppercase',letterSpacing:'.3px'}}>Income (৳)</div>
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:40}}>
            {last6.map((m,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{fontSize:9,color:'var(--text3)',fontWeight:600}}>{m.income>0?`${Math.round(m.income/1000)}k`:''}</div>
                <div style={{width:'100%',background:i===5?'#22C55E':'#BBF7D0',borderRadius:'2px 2px 0 0',height:`${Math.max(Math.round(m.income/maxIncome*32),m.income>0?3:0)}px`}}/>
                <div style={{fontSize:9,color:i===5?'#15803D':'var(--text3)',fontWeight:i===5?700:400}}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK NAV */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
        {[
          {label:'Intelligence',icon:<Globe size={14}/>,path:'/intelligence'},
          {label:'Staff KPI',icon:<Users size={14}/>,path:'/staff'},
          {label:'Invoices',icon:<FileCheck size={14}/>,path:'/invoices'},
          {label:'Finance',icon:<TrendingUp size={14}/>,path:'/finance'},
        ].map(({label,icon,path})=>(
          <button key={label} className="btn btn-full" style={{padding:11,gap:6}} onClick={()=>navigate(path)}>
            {icon} {label}
          </button>
        ))}
      </div>
    </div>
  )
}
