import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases, getInvoices, getExpenses, buildWhatsAppLink, waFollowUp, waReviewRequest } from '../lib/supabase'
import { AlertTriangle, Plus, ChevronRight, FileCheck, TrendingUp, Users, Globe, MessageCircle, Clock, Star } from 'lucide-react'

const statusLabel = { pending: 'Awaiting docs', progress: 'In review', suspicious: 'Suspicious', manipulated: 'Manipulated', done: 'Delivered', new: 'New' }
const initials = (n) => n.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()
const avatarColor = (n) => { const c=['','g','a','r','p']; return c[n.charCodeAt(0)%c.length] }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Dashboard() {
  const [cases, setCases] = useState([])
  const [invoices, setInvoices] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const now = new Date()
  const todayStr = now.toISOString().slice(0,10)
  const monthName = MONTHS[now.getMonth()]
  const year = now.getFullYear()
  const monthStart = new Date(year, now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(year, now.getMonth()-1, 1).toISOString()
  const prevMonthEnd = new Date(year, now.getMonth(), 0).toISOString()

  useEffect(() => {
    Promise.all([
      getCases().then(({data}) => setCases(data||[])),
      getInvoices().then(({data}) => setInvoices(data||[])),
      getExpenses().then(({data}) => setExpenses(data||[]))
    ]).then(() => setLoading(false))
  }, [])

  // This month stats
  const thisMonthCases = cases.filter(c => c.created_at >= monthStart)
  const prevMonthCases = cases.filter(c => c.created_at >= prevMonthStart && c.created_at <= prevMonthEnd)

  const active = cases.filter(c => !['done'].includes(c.status)).length
  const pending = cases.filter(c => c.status === 'pending' || c.status === 'new').length
  const suspicious = cases.filter(c => c.status === 'suspicious' || c.status === 'manipulated').length
  const done = cases.filter(c => c.status === 'done').length
  const completedToday = cases.filter(c => c.status === 'done' && (c.completed_at||'').slice(0,10) === todayStr).length

  // Income
  const thisMonthIncome = invoices.filter(i => i.status==='paid' && i.created_at >= monthStart).reduce((s,i)=>s+i.amount,0)
  const prevMonthIncome = invoices.filter(i => i.status==='paid' && i.created_at >= prevMonthStart && i.created_at <= prevMonthEnd).reduce((s,i)=>s+i.amount,0)
  const totalIncome = invoices.filter(i=>i.status==='paid').reduce((s,i)=>s+i.amount,0)
  const totalExpenses = expenses.reduce((s,e)=>s+Number(e.amount),0)
  const thisMonthExpenses = expenses.filter(e => e.created_at >= monthStart).reduce((s,e)=>s+Number(e.amount),0)
  const netProfit = thisMonthIncome - thisMonthExpenses
  const outstanding = invoices.filter(i=>i.status!=='paid').reduce((s,i)=>s+i.amount,0)

  // Trend arrows
  const caseTrend = thisMonthCases.length - prevMonthCases.length
  const incomeTrend = thisMonthIncome - prevMonthIncome

  // Actions needed
  const actions = cases.filter(c=>['pending','progress','suspicious','new'].includes(c.status)).slice(0,5)

  // Fraud rate this month
  const fraudThisMonth = thisMonthCases.filter(c=>(c.verdict||'').toUpperCase().includes('FRAUDULENT')||(c.verdict||'').toUpperCase().includes('SUSPICIOUS')).length
  const fraudRate = thisMonthCases.length > 0 ? Math.round(fraudThisMonth/thisMonthCases.length*100) : 0

  // Last 6 months bar chart data
  const last6 = Array.from({length:6},(_,i)=>{
    const m = new Date(year, now.getMonth()-5+i, 1)
    const mEnd = new Date(year, now.getMonth()-5+i+1, 0).toISOString()
    const mStart = m.toISOString()
    const cnt = cases.filter(c=>c.created_at>=mStart&&c.created_at<=mEnd).length
    const inc = invoices.filter(i=>i.status==='paid'&&i.created_at>=mStart&&i.created_at<=mEnd).reduce((s,x)=>s+x.amount,0)
    return { label: SHORT_MONTHS[m.getMonth()], cases: cnt, income: inc }
  })
  const maxCases = Math.max(...last6.map(m=>m.cases),1)
  const maxIncome = Math.max(...last6.map(m=>m.income),1)

  if (loading) return <div style={{padding:20,textAlign:'center',color:'var(--text3)'}}>Loading dashboard...</div>

  return (
    <div>
      {/* Date header */}
      <div style={{marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <div style={{fontSize:13,color:'var(--text3)'}}>
            {now.toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={()=>navigate('/cases/new')}>
          <Plus size={13}/> New case
        </button>
      </div>

      {/* Key metrics */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Active cases</div>
          <div className="metric-value blue">{active}</div>
          <div className="metric-sub" style={{display:'flex',alignItems:'center',gap:4}}>
            {caseTrend > 0 && <span style={{color:'var(--success)'}}>↑ {caseTrend} vs last month</span>}
            {caseTrend < 0 && <span style={{color:'var(--danger)'}}>↓ {Math.abs(caseTrend)} vs last month</span>}
            {caseTrend === 0 && <span>Same as last month</span>}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">{monthName} income</div>
          <div className="metric-value green">৳{thisMonthIncome.toLocaleString()}</div>
          <div className="metric-sub" style={{display:'flex',alignItems:'center',gap:4}}>
            {incomeTrend > 0 && <span style={{color:'var(--success)'}}>↑ ৳{incomeTrend.toLocaleString()} vs last month</span>}
            {incomeTrend < 0 && <span style={{color:'var(--danger)'}}>↓ ৳{Math.abs(incomeTrend).toLocaleString()} vs last month</span>}
            {incomeTrend === 0 && <span>Same as last month</span>}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Outstanding</div>
          <div className="metric-value amber">৳{outstanding.toLocaleString()}</div>
          <div className="metric-sub">{invoices.filter(i=>i.status!=='paid').length} unpaid invoices</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Fraud rate</div>
          <div className="metric-value red">{fraudRate}%</div>
          <div className="metric-sub">{monthName} · {fraudThisMonth} flagged</div>
        </div>
      </div>

      {/* Secondary metrics row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:16}}>
        {[
          {label:'Pending',value:pending,color:'var(--warning)'},
          {label:'Suspicious',value:suspicious,color:'var(--danger)'},
          {label:'Delivered',value:done,color:'var(--success)'},
          {label:'Done today',value:completedToday,color:completedToday>0?'var(--success)':'var(--text3)'},
          {label:'Net profit',value:`৳${netProfit.toLocaleString()}`,color:netProfit>=0?'var(--success)':'var(--danger)'},
        ].map(({label,value,color})=>(
          <div key={label} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:'10px 6px',textAlign:'center'}}>
            <div style={{fontSize:9.5,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.3px',marginBottom:4}}>{label}</div>
            <div style={{fontSize:15,fontWeight:700,color}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Daily completions - last 7 days */}
      {(() => {
        const last7 = Array.from({length:7}, (_,i) => {
          const d = new Date()
          d.setDate(d.getDate() - (6-i))
          const dateStr = d.toISOString().slice(0,10)
          const count = cases.filter(c => c.status==='done' && (c.completed_at||'').slice(0,10)===dateStr).length
          return { label: d.toLocaleDateString('en-GB',{weekday:'short'}), date: dateStr, count }
        })
        const maxDay = Math.max(...last7.map(d=>d.count), 1)
        const totalWeek = last7.reduce((s,d)=>s+d.count,0)
        return (
          <div className="card mb-16">
            <div className="card-header">
              <span style={{display:'flex',alignItems:'center',gap:6}}><FileCheck size={14}/> Daily completions</span>
              <span style={{fontSize:11,color:'var(--text3)',fontWeight:400}}>{totalWeek} this week</span>
            </div>
            <div style={{padding:'12px 16px'}}>
              <div style={{display:'flex',gap:6,alignItems:'flex-end',height:64}}>
                {last7.map((d,i)=>(
                  <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
                    <div style={{fontSize:11,fontWeight:700,color:d.count>0?'var(--success)':'var(--text3)'}}>{d.count}</div>
                    <div style={{width:'100%',background:d.count>0?'var(--success)':'var(--surface2)',borderRadius:3,height:`${Math.round(d.count/maxDay*40)+4}px`}}/>
                    <div style={{fontSize:9.5,color:d.date===todayStr?'var(--navy)':'var(--text3)',fontWeight:d.date===todayStr?700:400}}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* 6-month trend */}
      <div className="card mb-16">
        <div className="card-header"><TrendingUp size={14}/> 6-month trend</div>
        <div style={{padding:'12px 16px'}}>
          {/* Cases bar */}
          <div style={{fontSize:11.5,color:'var(--text3)',marginBottom:6,fontWeight:600}}>CASES</div>
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:40,marginBottom:12}}>
            {last6.map((m,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{fontSize:9.5,color:'var(--text3)'}}>{m.cases||''}</div>
                <div style={{width:'100%',background:i===5?'var(--navy)':'var(--surface2)',borderRadius:'3px 3px 0 0',height:`${Math.max(Math.round(m.cases/maxCases*32),m.cases>0?4:0)}px`,minHeight:m.cases>0?4:0}}/>
                <div style={{fontSize:9.5,color:'var(--text3)'}}>{m.label}</div>
              </div>
            ))}
          </div>
          {/* Income bar */}
          <div style={{fontSize:11.5,color:'var(--text3)',marginBottom:6,fontWeight:600}}>INCOME (৳)</div>
          <div style={{display:'flex',gap:4,alignItems:'flex-end',height:40}}>
            {last6.map((m,i)=>(
              <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{fontSize:9,color:'var(--text3)'}}>{m.income>0?`${Math.round(m.income/1000)}k`:''}</div>
                <div style={{width:'100%',background:i===5?'var(--success)':'#BBF7D0',borderRadius:'3px 3px 0 0',height:`${Math.max(Math.round(m.income/maxIncome*32),m.income>0?4:0)}px`,minHeight:m.income>0?4:0}}/>
                <div style={{fontSize:9.5,color:'var(--text3)'}}>{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions needed */}
      {actions.length > 0 && (
        <div className="card mb-16">
          <div className="card-header">
            <span style={{display:'flex',alignItems:'center',gap:6}}>
              <AlertTriangle size={15} color="var(--warning)"/> Actions needed
            </span>
            <span style={{fontSize:11,color:'var(--text3)',fontWeight:400}}>{actions.length} cases</span>
          </div>
          {actions.map(c=>(
            <div key={c.id} className="list-row" onClick={()=>navigate(`/cases/${c.id}`)}>
              <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,background:c.status==='suspicious'||c.status==='manipulated'?'var(--danger)':c.status==='pending'?'var(--warning)':'var(--info)'}}/>
              <div className="row-main">
                <div className="row-title">{c.client_name}</div>
                <div className="row-sub">{c.case_id} · {c.country} · {statusLabel[c.status]}</div>
              </div>
              <ChevronRight size={15} color="var(--text3)"/>
            </div>
          ))}
        </div>
      )}

      {/* Recent cases */}
      <div className="card mb-16">
        <div className="card-header">
          Recent cases
          <button className="btn btn-sm" onClick={()=>navigate('/cases')}>View all</button>
        </div>
        {cases.length===0 && <div style={{padding:20,textAlign:'center',color:'var(--text3)',fontSize:13}}>No cases yet</div>}
        {cases.slice(0,5).map(c=>(
          <div key={c.id} className="list-row" onClick={()=>navigate(`/cases/${c.id}`)}>
            <div className={`row-avatar ${avatarColor(c.client_name)}`}>{initials(c.client_name)}</div>
            <div className="row-main">
              <div className="row-title">{c.client_name}</div>
              <div className="row-sub">{c.country} · {c.doc_type}</div>
            </div>
            <div className="row-right">
              <span className={`badge ${c.status}`}>{statusLabel[c.status]}</span>
              <span style={{fontSize:11,color:'var(--text3)'}}>৳{c.amount}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Follow-up alerts — cases pending 3+ days */}
      {(() => {
        const threeDaysAgo = new Date(Date.now() - 3*24*60*60*1000).toISOString()
        const stale = cases.filter(c => ['pending','new'].includes(c.status) && c.created_at < threeDaysAgo && c.client_phone)
        if (stale.length === 0) return null
        return (
          <div className="card mb-16">
            <div className="card-header" style={{color:'var(--warning)'}}>
              <span style={{display:'flex',alignItems:'center',gap:6}}><Clock size={15}/> Follow-up needed</span>
              <span style={{fontSize:11,color:'var(--text3)',fontWeight:400}}>{stale.length} cases pending 3+ days</span>
            </div>
            {stale.slice(0,3).map(c=>(
              <div key={c.id} style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{c.client_name}</div>
                  <div style={{fontSize:11.5,color:'var(--text3)'}}>{c.case_id} · {c.country}</div>
                </div>
                <a href={buildWhatsAppLink(c.client_phone, waFollowUp(c.client_name, c.case_id))} target="_blank" rel="noreferrer" className="btn btn-wa btn-sm" style={{flexShrink:0}}>
                  <MessageCircle size={12}/> Follow up
                </a>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Review requests — completed cases */}
      {(() => {
        const recent = cases.filter(c => c.status === 'done' && c.client_phone).slice(0,2)
        if (recent.length === 0) return null
        return (
          <div className="card mb-16">
            <div className="card-header">
              <span style={{display:'flex',alignItems:'center',gap:6}}><Star size={15} color="var(--gold)"/> Ask for reviews</span>
            </div>
            {recent.map(c=>(
              <div key={c.id} style={{padding:'10px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{c.client_name}</div>
                  <div style={{fontSize:11.5,color:'var(--text3)'}}>{c.case_id} · Delivered</div>
                </div>
                <a href={buildWhatsAppLink(c.client_phone, waReviewRequest(c.client_name))} target="_blank" rel="noreferrer" className="btn btn-sm" style={{flexShrink:0,color:'var(--warning)',borderColor:'var(--warning)'}}>
                  <Star size={12}/> Request
                </a>
              </div>
            ))}
          </div>
        )
      })()}

      {/* Quick nav */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
        <button className="btn btn-full" style={{padding:12}} onClick={()=>navigate('/intelligence')}>
          <Globe size={15}/> Intelligence
        </button>
        <button className="btn btn-full" style={{padding:12}} onClick={()=>navigate('/staff')}>
          <Users size={15}/> Staff KPI
        </button>
        <button className="btn btn-full" style={{padding:12}} onClick={()=>navigate('/invoices')}>
          <FileCheck size={15}/> Invoices
        </button>
        <button className="btn btn-full" style={{padding:12}} onClick={()=>navigate('/finance')}>
          <TrendingUp size={15}/> Finance
        </button>
      </div>
    </div>
  )
}
