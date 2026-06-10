import React, { useState, useEffect } from 'react'
import { getCases } from '../lib/supabase'
import { AlertTriangle, TrendingUp, Globe, FileText } from 'lucide-react'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const VERDICTS = ['CONFIRMED FRAUDULENT','SUSPICIOUS','GENUINE','UNABLE TO VERIFY']
const VERDICT_COLORS = { 'CONFIRMED FRAUDULENT':'var(--danger)', 'SUSPICIOUS':'var(--warning)', 'GENUINE':'var(--success)', 'UNABLE TO VERIFY':'var(--text3)' }

export default function Intelligence() {
  const [cases, setCases] = useState([])
  const [tab, setTab] = useState('country')
  const [monthFilter, setMonthFilter] = useState('all')

  useEffect(() => { getCases().then(({ data }) => { if (data?.length) setCases(data) }) }, [])

  const now = new Date()
  const filtered = monthFilter === 'all' ? cases : cases.filter(c => {
    const d = new Date(c.created_at)
    return d.getMonth() === parseInt(monthFilter) && d.getFullYear() === now.getFullYear()
  })

  // Country breakdown
  const byCountry = {}
  filtered.forEach(c => {
    if (!c.country) return
    if (!byCountry[c.country]) byCountry[c.country] = { total:0, fraudulent:0, suspicious:0, genuine:0, unable:0 }
    byCountry[c.country].total++
    const v = (c.verdict||'').toUpperCase()
    if (v.includes('FRAUDULENT')) byCountry[c.country].fraudulent++
    else if (v.includes('SUSPICIOUS')) byCountry[c.country].suspicious++
    else if (v.includes('GENUINE')) byCountry[c.country].genuine++
    else byCountry[c.country].unable++
  })
  const countrySorted = Object.entries(byCountry).sort((a,b) => b[1].total - a[1].total)
  const maxCountry = countrySorted[0]?.[1]?.total || 1

  // Monthly trend
  const byMonth = {}
  cases.forEach(c => {
    const d = new Date(c.created_at)
    if (d.getFullYear() !== now.getFullYear()) return
    const m = d.getMonth()
    if (!byMonth[m]) byMonth[m] = { total:0, fraudulent:0, suspicious:0 }
    byMonth[m].total++
    const v = (c.verdict||'').toUpperCase()
    if (v.includes('FRAUDULENT')) byMonth[m].fraudulent++
    if (v.includes('SUSPICIOUS')) byMonth[m].suspicious++
  })
  const maxMonth = Math.max(...Object.values(byMonth).map(m => m.total), 1)

  // Verdict breakdown
  const byVerdict = {}
  filtered.forEach(c => {
    const v = c.verdict || 'UNABLE TO VERIFY'
    byVerdict[v] = (byVerdict[v] || 0) + 1
  })

  // Doc type breakdown
  const byDoc = {}
  filtered.forEach(c => {
    const d = c.doc_type || 'Unknown'
    byDoc[d] = (byDoc[d] || 0) + 1
  })
  const docSorted = Object.entries(byDoc).sort((a,b) => b[1]-a[1])

  const fraudRate = filtered.length > 0 ? Math.round(filtered.filter(c => (c.verdict||'').toUpperCase().includes('FRAUDULENT') || (c.verdict||'').toUpperCase().includes('SUSPICIOUS')).length / filtered.length * 100) : 0

  return (
    <div>
      {/* Summary metrics */}
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Total cases</div><div className="metric-value blue">{filtered.length}</div></div>
        <div className="metric-card"><div className="metric-label">Fraud rate</div><div className="metric-value red">{fraudRate}%</div></div>
        <div className="metric-card"><div className="metric-label">Countries</div><div className="metric-value">{Object.keys(byCountry).length}</div></div>
        <div className="metric-card"><div className="metric-label">Flagged</div><div className="metric-value amber">{filtered.filter(c=>(c.verdict||'').toUpperCase().includes('FRAUDULENT')||(c.verdict||'').toUpperCase().includes('SUSPICIOUS')).length}</div></div>
      </div>

      {/* Month filter */}
      <div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:14,paddingBottom:4}}>
        <button onClick={()=>setMonthFilter('all')} style={{padding:'5px 12px',borderRadius:20,border:'1px solid',fontSize:12,fontWeight:600,whiteSpace:'nowrap',cursor:'pointer',background:monthFilter==='all'?'var(--navy)':'#fff',borderColor:monthFilter==='all'?'var(--navy)':'var(--border)',color:monthFilter==='all'?'#fff':'var(--text2)'}}>All time</button>
        {MONTHS.map((m,i) => (
          <button key={i} onClick={()=>setMonthFilter(String(i))} style={{padding:'5px 12px',borderRadius:20,border:'1px solid',fontSize:12,fontWeight:600,whiteSpace:'nowrap',cursor:'pointer',background:monthFilter===String(i)?'var(--navy)':'#fff',borderColor:monthFilter===String(i)?'var(--navy)':'var(--border)',color:monthFilter===String(i)?'#fff':'var(--text2)'}}>{m}</button>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['country','monthly','verdicts','documents'].map(t => (
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {/* COUNTRY TAB */}
      {tab === 'country' && (
        <div className="card">
          <div className="card-header"><Globe size={14}/> Country fraud breakdown</div>
          {countrySorted.length === 0 && <div style={{padding:20,textAlign:'center',color:'var(--text3)',fontSize:13}}>No data yet</div>}
          {countrySorted.map(([country, stats]) => (
            <div key={country} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <div style={{fontWeight:600,fontSize:13}}>{country}</div>
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {stats.fraudulent > 0 && <span style={{background:'#FEE2E2',color:'var(--danger)',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:700}}>{stats.fraudulent} fraud</span>}
                  {stats.suspicious > 0 && <span style={{background:'#FEF3C7',color:'var(--warning)',borderRadius:10,padding:'1px 7px',fontSize:11,fontWeight:700}}>{stats.suspicious} susp</span>}
                  <span style={{fontSize:12,color:'var(--text3)',fontWeight:600}}>{stats.total} total</span>
                </div>
              </div>
              <div style={{height:6,background:'var(--surface2)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:3,width:`${Math.round(stats.total/maxCountry*100)}%`,background: stats.fraudulent > 0 ? 'var(--danger)' : stats.suspicious > 0 ? 'var(--warning)' : 'var(--success)'}} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MONTHLY TAB */}
      {tab === 'monthly' && (
        <div className="card">
          <div className="card-header"><TrendingUp size={14}/> Monthly trend — {now.getFullYear()}</div>
          <div style={{padding:'12px 16px'}}>
            {MONTHS.map((m,i) => {
              const d = byMonth[i] || {total:0,fraudulent:0,suspicious:0}
              if (d.total === 0) return (
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:8}}>
                  <div style={{width:28,fontSize:11.5,color:'var(--text3)',flexShrink:0}}>{m}</div>
                  <div style={{flex:1,height:20,background:'var(--surface2)',borderRadius:4,display:'flex',alignItems:'center',paddingLeft:8}}><span style={{fontSize:11,color:'var(--text3)'}}>no data</span></div>
                </div>
              )
              return (
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:3}}>
                    <span style={{fontWeight:600}}>{m}</span>
                    <span style={{color:'var(--text2)'}}>{d.total} cases · <span style={{color:'var(--danger)'}}>{d.fraudulent} fraud</span> · <span style={{color:'var(--warning)'}}>{d.suspicious} susp</span></span>
                  </div>
                  <div style={{height:18,background:'var(--surface2)',borderRadius:4,overflow:'hidden',display:'flex'}}>
                    {d.fraudulent > 0 && <div style={{width:`${Math.round(d.fraudulent/d.total*100)}%`,background:'var(--danger)',height:'100%'}} />}
                    {d.suspicious > 0 && <div style={{width:`${Math.round(d.suspicious/d.total*100)}%`,background:'var(--warning)',height:'100%'}} />}
                    {(d.total-d.fraudulent-d.suspicious) > 0 && <div style={{width:`${Math.round((d.total-d.fraudulent-d.suspicious)/d.total*100)}%`,background:'var(--success)',height:'100%'}} />}
                  </div>
                </div>
              )
            })}
            <div style={{display:'flex',gap:14,marginTop:12,fontSize:11.5}}>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'var(--danger)',display:'inline-block'}}/>Fraudulent</span>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'var(--warning)',display:'inline-block'}}/>Suspicious</span>
              <span style={{display:'flex',alignItems:'center',gap:4}}><span style={{width:10,height:10,borderRadius:2,background:'var(--success)',display:'inline-block'}}/>Genuine</span>
            </div>
          </div>
        </div>
      )}

      {/* VERDICTS TAB */}
      {tab === 'verdicts' && (
        <div className="card">
          <div className="card-header"><AlertTriangle size={14}/> Verdict breakdown</div>
          <div style={{padding:'12px 16px'}}>
            {Object.entries(byVerdict).length === 0 && <div style={{fontSize:13,color:'var(--text3)'}}>No verdicts yet</div>}
            {Object.entries(byVerdict).sort((a,b)=>b[1]-a[1]).map(([v,count]) => (
              <div key={v} style={{marginBottom:12}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12.5,marginBottom:4}}>
                  <span style={{fontWeight:600,color:VERDICT_COLORS[v]||'var(--text)'}}>{v}</span>
                  <span style={{fontWeight:700}}>{count} <span style={{color:'var(--text3)',fontWeight:400}}>({Math.round(count/filtered.length*100)}%)</span></span>
                </div>
                <div style={{height:8,background:'var(--surface2)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:4,width:`${Math.round(count/filtered.length*100)}%`,background:VERDICT_COLORS[v]||'var(--navy)'}} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {tab === 'documents' && (
        <div className="card">
          <div className="card-header"><FileText size={14}/> Most targeted document types</div>
          {docSorted.length === 0 && <div style={{padding:20,textAlign:'center',color:'var(--text3)',fontSize:13}}>No data yet</div>}
          {docSorted.map(([doc,count]) => (
            <div key={doc} style={{padding:'10px 16px',borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:4,fontSize:13}}>
                <span style={{fontWeight:600}}>{doc}</span>
                <span style={{color:'var(--text2)'}}>{count} cases</span>
              </div>
              <div style={{height:6,background:'var(--surface2)',borderRadius:3,overflow:'hidden'}}>
                <div style={{height:'100%',borderRadius:3,width:`${Math.round(count/filtered.length*100)}%`,background:'var(--navy)'}} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
