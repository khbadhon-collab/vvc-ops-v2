import React, { useState, useEffect } from 'react'
import { supabase, getCases } from '../lib/supabase'
import { Plus, Edit2, Trash2, TrendingUp, Target, DollarSign } from 'lucide-react'

const PLATFORMS = ['Facebook Ads','Facebook Organic','WhatsApp Broadcast','Instagram','Google Ads','Referral','Other']
const STATUSES = ['Active','Paused','Completed']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}) : ''

export default function Marketing() {
  const [campaigns, setCampaigns] = useState([])
  const [cases, setCases] = useState([])
  const [tab, setTab] = useState('overview')
  const [adding, setAdding] = useState(false)
  const [editCamp, setEditCamp] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ name:'', platform:'Facebook Ads', budget:0, spend:0, enquiries:0, conversions:0, status:'Active', start_date:'', end_date:'', notes:'' })
  const [saving, setSaving] = useState(false)

  const now = new Date()
  const monthStart = new Date(now.getFullYear(),now.getMonth(),1).toISOString()

  useEffect(() => {
    loadCampaigns()
    getCases().then(({data})=>{ if(data?.length) setCases(data) })
  }, [])

  const loadCampaigns = async () => {
    const { data } = await supabase.from('campaigns').select('*').order('created_at',{ascending:false})
    if (data) setCampaigns(data)
  }

  const save = async () => {
    if (!form.name) return
    setSaving(true)
    const payload = { ...form, budget:Number(form.budget), spend:Number(form.spend), enquiries:Number(form.enquiries), conversions:Number(form.conversions) }
    if (editCamp) {
      await supabase.from('campaigns').update(payload).eq('id',editCamp.id)
    } else {
      await supabase.from('campaigns').insert([{ ...payload, created_at:new Date().toISOString() }])
    }
    await loadCampaigns()
    setSaving(false); setAdding(false); setEditCamp(null)
    setForm({ name:'', platform:'Facebook Ads', budget:0, spend:0, enquiries:0, conversions:0, status:'Active', start_date:'', end_date:'', notes:'' })
  }

  const openEdit = (c) => {
    setEditCamp(c)
    setForm({ name:c.name, platform:c.platform, budget:c.budget||0, spend:c.spend||0, enquiries:c.enquiries||0, conversions:c.conversions||0, status:c.status||'Active', start_date:c.start_date||'', end_date:c.end_date||'', notes:c.notes||'' })
    setAdding(true); setTab('form')
  }

  const del = async () => {
    await supabase.from('campaigns').delete().eq('id',confirmDelete.id)
    setCampaigns(l=>l.filter(c=>c.id!==confirmDelete.id))
    setConfirmDelete(null)
  }

  // Global totals
  const totalSpend = campaigns.reduce((s,c)=>s+Number(c.spend||0),0)
  const totalEnquiries = campaigns.reduce((s,c)=>s+Number(c.enquiries||0),0)
  const totalConversions = campaigns.reduce((s,c)=>s+Number(c.conversions||0),0)
  const avgCPE = totalEnquiries>0 ? Math.round(totalSpend/totalEnquiries) : 0
  const avgCPA = totalConversions>0 ? Math.round(totalSpend/totalConversions) : 0
  const convRate = totalEnquiries>0 ? Math.round(totalConversions/totalEnquiries*100) : 0

  // Lead source from cases — cross reference
  const casesBySource = {}
  cases.forEach(c=>{ const s=c.lead_source||'Unknown'; casesBySource[s]=(casesBySource[s]||0)+1 })

  // This month cases by source
  const thisMonthCases = cases.filter(c=>c.created_at>=monthStart)
  const thisMonthBySource = {}
  thisMonthCases.forEach(c=>{ const s=c.lead_source||'Unknown'; thisMonthBySource[s]=(thisMonthBySource[s]||0)+1 })

  const maxSource = Math.max(...Object.values(casesBySource),1)

  const getCampROI = (c) => {
    const convs = Number(c.conversions||0)
    const spend = Number(c.spend||0)
    const revenue = convs * 1000 // avg ৳1000 per case
    const roi = spend>0 ? Math.round((revenue-spend)/spend*100) : 0
    const cpe = Number(c.enquiries||0)>0 ? Math.round(spend/Number(c.enquiries)) : 0
    const cpa = convs>0 ? Math.round(spend/convs) : 0
    const cr = Number(c.enquiries||0)>0 ? Math.round(convs/Number(c.enquiries)*100) : 0
    return { roi, cpe, cpa, cr }
  }

  return (
    <div>
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,maxWidth:320,width:'100%'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Delete campaign?</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}><strong>{confirmDelete.name}</strong><br/>This cannot be undone.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{background:'var(--danger)',color:'#fff',border:'none'}} onClick={del}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Global KPIs */}
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Total spend</div><div className="metric-value red">৳{totalSpend.toLocaleString()}</div></div>
        <div className="metric-card"><div className="metric-label">Enquiries</div><div className="metric-value blue">{totalEnquiries}</div></div>
        <div className="metric-card"><div className="metric-label">Conversions</div><div className="metric-value green">{totalConversions}</div></div>
        <div className="metric-card"><div className="metric-label">Conv. rate</div><div className="metric-value amber">{convRate}%</div></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
        <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
          <div style={{fontSize:10,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>Cost/Enquiry</div>
          <div style={{fontSize:16,fontWeight:700,color:'var(--warning)'}}>৳{avgCPE.toLocaleString()}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
          <div style={{fontSize:10,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>Cost/Client</div>
          <div style={{fontSize:16,fontWeight:700,color:'var(--danger)'}}>৳{avgCPA.toLocaleString()}</div>
        </div>
        <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px',textAlign:'center'}}>
          <div style={{fontSize:10,color:'var(--text3)',fontWeight:600,textTransform:'uppercase',letterSpacing:'.4px',marginBottom:4}}>Campaigns</div>
          <div style={{fontSize:16,fontWeight:700}}>{campaigns.length}</div>
        </div>
      </div>

      {/* Lead source from real cases */}
      {Object.keys(casesBySource).length>0 && (
        <div className="card mb-12">
          <div className="card-header"><TrendingUp size={14}/> Actual clients by lead source</div>
          <div style={{padding:'12px 16px'}}>
            {Object.entries(casesBySource).sort((a,b)=>b[1]-a[1]).map(([src,cnt])=>(
              <div key={src} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12.5,marginBottom:3}}>
                  <span style={{color:'var(--text2)',fontWeight:600}}>{src}</span>
                  <span>{cnt} clients <span style={{color:'var(--text3)',fontSize:11}}>({Math.round(cnt/cases.length*100)}%)</span></span>
                </div>
                <div style={{height:7,background:'var(--surface2)',borderRadius:4,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:4,width:`${Math.round(cnt/maxSource*100)}%`,background:'var(--navy)'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {['overview','form'].map(t=>(
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>{setTab(t);if(t==='form'){setAdding(true);setEditCamp(null);setForm({ name:'', platform:'Facebook Ads', budget:0, spend:0, enquiries:0, conversions:0, status:'Active', start_date:'', end_date:'', notes:'' })}}}>
            {t==='form'?'+ Add campaign':'Campaigns'}
          </button>
        ))}
      </div>

      {/* Add/Edit form */}
      {(adding||tab==='form') && (
        <div className="card mb-12">
          <div className="card-header">{editCamp?'Edit campaign':'Add campaign'}</div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Campaign name</label><input className="form-input" placeholder="e.g. June Facebook Ad — Fraud Alert" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Platform</label>
                <select className="form-select" value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))}>
                  {PLATFORMS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  {STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Budget (৳)</label><input className="form-input" type="number" value={form.budget} onChange={e=>setForm(f=>({...f,budget:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Actual spend (৳)</label><input className="form-input" type="number" value={form.spend} onChange={e=>setForm(f=>({...f,spend:e.target.value}))}/></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Enquiries received</label><input className="form-input" type="number" value={form.enquiries} onChange={e=>setForm(f=>({...f,enquiries:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Conversions (paid)</label><input className="form-input" type="number" value={form.conversions} onChange={e=>setForm(f=>({...f,conversions:e.target.value}))}/></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Start date</label><input className="form-input" type="date" value={form.start_date} onChange={e=>setForm(f=>({...f,start_date:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">End date</label><input className="form-input" type="date" value={form.end_date} onChange={e=>setForm(f=>({...f,end_date:e.target.value}))}/></div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-input" rows={2} placeholder="Ad creative, target audience, results..." value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{resize:'vertical'}}/></div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>{setAdding(false);setEditCamp(null);setTab('overview')}}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>{saving?'Saving...':'Save campaign'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign list */}
      {tab==='overview' && (
        <div>
          {campaigns.length===0 && <div className="card" style={{padding:24,textAlign:'center',color:'var(--text3)',fontSize:13}}>No campaigns yet. Add your first campaign above.</div>}
          {campaigns.map(c=>{
            const {roi,cpe,cpa,cr} = getCampROI(c)
            return (
              <div key={c.id} className="card mb-10">
                <div style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13.5}}>{c.name}</div>
                    <div style={{fontSize:11.5,color:'var(--text3)',marginTop:1}}>{c.platform} · {fmtDate(c.start_date)}{c.end_date?` → ${fmtDate(c.end_date)}`:''}</div>
                  </div>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:10,background:c.status==='Active'?'var(--success-bg)':c.status==='Paused'?'var(--warning-bg)':'var(--surface2)',color:c.status==='Active'?'var(--success)':c.status==='Paused'?'var(--warning)':'var(--text3)'}}>{c.status}</span>
                    <button onClick={()=>openEdit(c)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--navy)',padding:4}}><Edit2 size={14}/></button>
                    <button onClick={()=>setConfirmDelete(c)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4}}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',padding:'10px 12px',gap:4}}>
                  {[
                    {label:'Spend',value:`৳${Number(c.spend||0).toLocaleString()}`,color:'var(--danger)'},
                    {label:'Enquiries',value:c.enquiries||0,color:'var(--info)'},
                    {label:'Converted',value:c.conversions||0,color:'var(--success)'},
                    {label:'Conv %',value:`${cr}%`,color:'var(--warning)'},
                  ].map(({label,value,color})=>(
                    <div key={label} style={{textAlign:'center'}}>
                      <div style={{fontSize:15,fontWeight:700,color}}>{value}</div>
                      <div style={{fontSize:10,color:'var(--text3)'}}>{label}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',padding:'0 12px 10px',gap:4,borderTop:'1px solid var(--border)'}}>
                  {[
                    {label:'Cost/Enquiry',value:`৳${cpe}`,color:'var(--text2)'},
                    {label:'Cost/Client',value:`৳${cpa}`,color:'var(--text2)'},
                    {label:'ROI',value:`${roi}%`,color:roi>=0?'var(--success)':'var(--danger)'},
                  ].map(({label,value,color})=>(
                    <div key={label} style={{textAlign:'center',paddingTop:8}}>
                      <div style={{fontSize:13,fontWeight:700,color}}>{value}</div>
                      <div style={{fontSize:10,color:'var(--text3)'}}>{label}</div>
                    </div>
                  ))}
                </div>
                {c.notes && <div style={{padding:'0 16px 12px',fontSize:12,color:'var(--text2)'}}>{c.notes}</div>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
