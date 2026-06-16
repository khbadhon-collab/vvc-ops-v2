import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases, getInvoices, getExpenses, buildWhatsAppLink, waFollowUp, waReviewRequest } from '../lib/supabase'
import { AlertTriangle, Plus, ChevronRight, FileCheck, TrendingUp, Users, Globe, MessageCircle, Clock, Star, RefreshCw } from 'lucide-react'

const statusLabel = { pending:'Awaiting docs', progress:'In review', suspicious:'Suspicious', manipulated:'Manipulated', done:'Delivered', new:'New' }
const initials = (n) => n?.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase() || '?'
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Dashboard() {
  const [cases, setCases] = useState([])
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const navigate = useNavigate()

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

  // ── Finance stats ──
  const thisMonthIncome = invoices.filter(i => i.status==='paid' && (i.paid_at||i.created_at) >= monthStart).reduce((s,i)=>s+Number(i.amount||0),0)
  const thisMonthExpenses = expenses.filter(e => (e.date||e.created_at||'') >= monthStart).reduce((s,e)=>s+Number(e.amount||0),0)
  const outstanding = invoices.filter(i=>i.status!=='paid').reduce((s,i)=>s+Number(i.amount||0),0)
  const netProfit = thisMonthIncome - thisMonthExpenses
  const prevMonthIncome = invoices.filter(i => i.status==='paid' && (i.paid_at||i.created_at) >= prevMonthStart && (i.paid_at||i.created_at) <= prevMonthEnd).reduce((s,i)=>s+Number(i.amount||0),0)
  const incomeTrend = thisMonthIncome - prevMonthIncome

  // ── Cashflow last 7 days ──
  const cashflow7 = Array.from({length:7}, (_,i) => {
    const d = new Date(); d.setDate(d.getDate() - (6-i))
    const ds = d.toISOString().slice(0,10)
    const moneyIn = invoices.filter(inv => inv.status==='paid' && (inv.paid_at||inv.created_at||'').slice(0,10)===ds).reduce((s,inv)=>s+Number(inv.amount||0),0)
    const moneyOut = expenses.filter(e => (e.date||e.created_at||'').slice(0,10)===ds).reduce((s,e)=>s+Number(e.amount||0),0)
    return { label: d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'}), ds, moneyIn, moneyOut }
  })
  const weekIn = cashflow7.reduce((s,d)=>s+d.moneyIn,0)
  const weekOut = cashflow7.reduce((s,d)=>s+d.moneyOut,0)
  const cfMax = Math.max(...cashflow7.map(d=>Math.max(d.moneyIn,d.moneyOut)), 1)

  // ── 6-month trend ──
  const last6 = Array.from({length:6},(_,i)=>{
    const m = new Date(year, now.getMonth()-5+i, 1)
    const mStart = m.toISOString()
    const mEnd = new Date(year, now.getMonth()-5+i+1, 0).toISOString()
    return {
      label: SHORT_MONTHS[m.getMonth()],
      cases: cases.filter(c=>c.created_at>=mStart&&c.created_at<=mEnd).length,
      income: invoices.filter(i=>i.status==='paid'&&(i.paid_at||i.created_at)>=mStart&&(i.paid_at||i.created_at)<=mEnd).reduce((s,x)=>s+Number(x.amount||0),0)
    }
  })
  const maxCases = Math.max(...last6.map(m=>m.cases),1)
  const maxIncome = Math.max(...last6.map(m=>m.income),1)

  // ── Actions & alerts ──
  const actions = cases.filter(c=>['pending','progress','suspicious','new'].includes(c.status)).slice(0,5)
  const stale = cases.filter(c => ['pending','new'].includes(c.status) && new Date(c.created_at) < new Date(Date.now()-3*24*60*60*1000) && c.client_phone)
  const reviewable = cases.filter(c => c.status==='done' && c.client_phone).slice(0,2)

  // ── Recent transactions ──
  const recentTx = [
    ...invoices.filter(i=>i.status==='paid').map(i=>({type:'in', label:i.client_name, sub:i.invoice_number||i.case_ref, amount:Number(i.amount||0), date:i.paid_at||i.created_at})),
    ...expenses.map(e=>({type:'out', label:e.description, sub:e.category, amount:Number(e.amount||0), date:e.date||e.created_at}))
  ].filter(t=>t.date).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,6)

  if (loading) return <div style={{padding:30,textAlign:'center',color:'var(--text3)'}}>Loading dashboard...</div>

  return (
    <div>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <div>
          <div style={{fontWeight:700,fontSize:16,color:'var(--navy)'}}>Welcome, VVC Ops 👋</div>
          <div style={{fontSize:12,color:'var(--text3)'}}>{now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-sm" onClick={()=>load(true)} disabled={refreshing} style={{color:'var(--navy)'}}>
            <RefreshCw size={13} style={{animation:refreshing?'spin 1s linear infinite':'none'}}/> {refreshing?'Refreshing...':'Refresh'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={()=>navigate('/cases/new')}>
            <Plus size={13}/> New case
          </button>
        </div>
      </div>

      {/* Karbar-style colored summary cards */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:12}}>
        <div onClick={()=>navigate('/cases')} style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:12,padding:'14px 16px',cursor:'pointer'}}>
          <div style={{fontSize:11,color:'#15803D',fontWeight:600,marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:16}}>↓</span> Active Cases
          </div>
          <div style={{fontSize:24,fontWeight:800,color:'#15803D'}}>{active}</div>
          <div style={{fontSize:11,color:'#15803D',marginTop:2}}>{caseTrend>0?`↑ ${caseTrend} this month`:caseTrend<0?`↓ ${Math.abs(caseTrend)} this month`:'Same as last month'}</div>
        </div>
        <div onClick={()=>navigate('/invoices')} style={{background:'#FEF3E2',border:'1px solid #FDE4BC',borderRadius:12,padding:'14px 16px',cursor:'pointer'}}>
          <div style={{fontSize:11,color:'#B45309',fontWeight:600,marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:16}}>↓</span> To Receive
          </div>
          <div style={{fontSize:24,fontWeight:800,color:'#B45309'}}>৳{outstanding.toLocaleString()}</div>
          <div style={{fontSize:11,color:'#B45309',marginTop:2}}>{invoices.filter(i=>i.status!=='paid').length} unpaid invoices</div>
        </div>
        <div onClick={()=>navigate('/finance')} style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:12,padding:'14px 16px',cursor:'pointer'}}>
          <div style={{fontSize:11,color:'#1D4ED8',fontWeight:600,marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:16}}>↑</span> {monthName} Sales
          </div>
          <div style={{fontSize:24,fontWeight:800,color:'#1D4ED8'}}>৳{thisMonthIncome.toLocaleString()}</div>
          <div style={{fontSize:11,color:'#1D4ED8',marginTop:2}}>{incomeTrend>0?`↑ ৳${incomeTrend.toLocaleString()} vs last month`:incomeTrend<0?`↓ ৳${Math.abs(incomeTrend).toLocaleString()} vs last month`:'Same as last month'}</div>
        </div>
        <div onClick={()=>navigate('/finance')} style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:12,padding:'14px 16px',cursor:'pointer'}}>
          <div style={{fontSize:11,color:'#B91C1C',fontWeight:600,marginBottom:4,display:'flex',alignItems:'center',gap:6}}>
            <span style={{fontSize:16}}>↑</span> {monthName} Expense
          </div>
          <div style={{fontSize:24,fontWeight:800,color:'#B91C1C'}}>৳{thisMonthExpenses.toLocaleString()}</div>
          <div style={{fontSize:11,color:netProfit>=0?'#15803D':'#B91C1C',marginTop:2}}>Net: ৳{netProfit.toLocaleString()}</div>
        </div>
      </div>

      {/* Case status pills */}
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

      {/* Cashflow chart - Karbar style */}
      <div className="card mb-12">
        <div className="card-header">
          <span>Cashflow <span style={{fontSize:11,fontWeight:400,color:'var(--text3)'}}>Last 7 Days</span></span>
        </div>
        <div style={{padding:'14px 16px'}}>
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:100,marginBottom:6}}>
            {cashflow7.map((d,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:0}}>
                <div style={{display:'flex',gap:2,alignItems:'flex-end',height:80,width:'100%',justifyContent:'center'}}>
                  <div style={{width:'42%',background:'#22C55E',borderRadius:'3px 3px 0 0',height:`${Math.max(Math.round(d.moneyIn/cfMax*76),d.moneyIn>0?4:0)}px`}}/>
                  <div style={{width:'42%',background:'#EF4444',borderRadius:'3px 3px 0 0',height:`${Math.max(Math.round(d.moneyOut/cfMax*76),d.moneyOut>0?4:0)}px`}}/>
                </div>
                <div style={{fontSize:9,color:d.ds===todayStr?'var(--navy)':'var(--text3)',fontWeight:d.ds===todayStr?700:400,marginTop:4,textAlign:'center'}}>{d.label}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid var(--border)',paddingTop:10}}>
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

      {/* Recent transactions */}
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

      {/* Daily completions */}
      <div className="card mb-12">
        <div className="card-header">
          <span style={{display:'flex',alignItems:'center',gap:6}}><FileCheck size={14}/> Daily completions</span>
          <span style={{fontSize:11,color:'var(--text3)',fontWeight:400}}>{cashflow7.reduce((s,_,i)=>s+(cases.filter(c=>c.status==='done'&&(c.completed_at||'').slice(0,10)===cashflow7[i].ds).length),0)} this week</span>
        </div>
        <div style={{padding:'12px 16px'}}>
          <div style={{display:'flex',gap:6,alignItems:'flex-end',height:60}}>
            {cashflow7.map((d,i)=>{
              const cnt = cases.filter(c=>c.status==='done'&&(c.completed_at||'').slice(0,10)===d.ds).length
              const maxCnt = Math.max(...cashflow7.map(x=>cases.filter(c=>c.status==='done'&&(c.completed_at||'').slice(0,10)===x.ds).length),1)
              return (
                <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                  <div style={{fontSize:10,fontWeight:700,color:cnt>0?'var(--success)':'var(--text3)'}}>{cnt||''}</div>
                  <div style={{width:'100%',background:cnt>0?'var(--success)':'var(--surface2)',borderRadius:3,height:`${Math.max(Math.round(cnt/maxCnt*36),cnt>0?4:0)}px`}}/>
                  <div style={{fontSize:9,color:d.ds===todayStr?'var(--navy)':'var(--text3)',fontWeight:d.ds===todayStr?700:400}}>{d.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Actions needed */}
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

      {/* Follow-up needed */}
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

      {/* Review requests */}
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

      {/* 6-month trend */}
      <div className="card mb-12">
        <div className="card-header"><TrendingUp size={14}/> 6-month trend</div>
        <div style={{padding:'12px 16px'}}>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:5,fontWeight:600}}>CASES</div>
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:36,marginBottom:12}}>
            {last6.map((m,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{fontSize:9,color:'var(--text3)'}}>{m.cases||''}</div>
                <div style={{width:'100%',background:i===5?'var(--navy)':'var(--surface2)',borderRadius:'2px 2px 0 0',height:`${Math.max(Math.round(m.cases/maxCases*28),m.cases>0?3:0)}px`}}/>
                <div style={{fontSize:9,color:'var(--text3)'}}>{m.label}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--text3)',marginBottom:5,fontWeight:600}}>INCOME (৳)</div>
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:36}}>
            {last6.map((m,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{fontSize:9,color:'var(--text3)'}}>{m.income>0?`${Math.round(m.income/1000)}k`:''}</div>
                <div style={{width:'100%',background:i===5?'#22C55E':'#BBF7D0',borderRadius:'2px 2px 0 0',height:`${Math.max(Math.round(m.income/maxIncome*28),m.income>0?3:0)}px`}}/>
                <div style={{fontSize:9,color:'var(--text3)'}}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick nav */}
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
