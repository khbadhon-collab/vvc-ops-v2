import React, { useState, useEffect } from 'react'
import { supabase, getCases } from '../lib/supabase'
import { Edit2, Trash2, Target, Award, User, TrendingUp, Phone, MessageCircle } from 'lucide-react'

const MONTHLY_TARGET = 150
const BONUS_PER_FILE = 50

const LEAD_SOURCES = ['Facebook Ads','WhatsApp','Phone Call','Facebook Organic','Referral','Walk-in','Other']
const DEFAULT_ROLES = ['Sales Assistant','Analyst','Senior Analyst','Manager','Admin','Support']

const generateStaffId = () => {
  const d = new Date()
  const yr = String(d.getFullYear()).slice(2)
  const mo = String(d.getMonth()+1).padStart(2,'0')
  return `VVC-STF-${yr}${mo}-${String(Math.floor(100+Math.random()*900))}`
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [cases, setCases] = useState([])
  const [tab, setTab] = useState('overview')
  const [adding, setAdding] = useState(false)
  const [editStaff, setEditStaff] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth())
  const [customRole, setCustomRole] = useState('')
  const [addingRole, setAddingRole] = useState(false)
  const [roles, setRoles] = useState(DEFAULT_ROLES)
  const [form, setForm] = useState({
    name:'', role:'Sales Assistant', phone:'', email:'',
    salary:0, join_date: new Date().toISOString().slice(0,10), staff_id:''
  })

  const now = new Date()
  const year = now.getFullYear()

  useEffect(() => { loadStaff(); getCases().then(({ data }) => { if (data?.length) setCases(data) }) }, [])

  const loadStaff = async () => {
    const { data } = await supabase.from('staff').select('*').order('created_at',{ascending:true})
    if (data) setStaff(data)
  }

  const hasAssignedData = cases.some(c => c.assigned_to)

  const getMonthCases = (staffId, month) => {
    return cases.filter(c => {
      const d = new Date(c.created_at)
      const inMonth = d.getMonth() === month && d.getFullYear() === year
      if (!inMonth) return false
      if (staffId === 'all') return true
      // If no cases have assigned_to yet, distribute evenly
      if (!hasAssignedData) return true
      return c.assigned_to === staffId
    })
  }

  const getStaffKPI = (s, month) => {
    const mCases = getMonthCases(s.id, month)
    const files = mCases.length
    const revenue = mCases.reduce((sum,c) => sum + (c.amount||0), 0)
    const fraudulent = mCases.filter(c=>(c.verdict||'').toUpperCase().includes('FRAUDULENT')).length
    const suspicious = mCases.filter(c=>(c.verdict||'').toUpperCase().includes('SUSPICIOUS')).length
    const completed = mCases.filter(c=>c.status==='done').length
    const bonus = files > MONTHLY_TARGET ? (files - MONTHLY_TARGET) * BONUS_PER_FILE : 0
    const progress = Math.min(Math.round(files/MONTHLY_TARGET*100),100)
    const bySource = {}
    mCases.forEach(c => { const src = c.lead_source||'Unknown'; bySource[src]=(bySource[src]||0)+1 })
    return { files, revenue, fraudulent, suspicious, completed, bonus, progress, bySource }
  }

  const saveStaff = async () => {
    if (!form.name) return
    const staffId = form.staff_id || generateStaffId()
    if (editStaff) {
      await supabase.from('staff').update({ ...form, salary:Number(form.salary), staff_id:staffId }).eq('id',editStaff.id)
    } else {
      await supabase.from('staff').insert([{ ...form, salary:Number(form.salary), staff_id:staffId, created_at:new Date().toISOString() }])
    }
    await loadStaff()
    setAdding(false); setEditStaff(null)
    setForm({ name:'', role:'Sales Assistant', phone:'', email:'', salary:0, join_date:new Date().toISOString().slice(0,10), staff_id:'' })
  }

  const openEdit = (s) => {
    setEditStaff(s)
    setForm({ name:s.name, role:s.role, phone:s.phone||'', email:s.email||'', salary:s.salary||0, join_date:s.join_date||'', staff_id:s.staff_id||'' })
    setAdding(true); setTab('form')
  }

  const deleteStaff = async () => {
    await supabase.from('staff').delete().eq('id',confirmDelete.id)
    setStaff(list=>list.filter(s=>s.id!==confirmDelete.id))
    setConfirmDelete(null)
  }

  // Team totals
  const teamMonth = getMonthCases('all', monthFilter)
  const teamFiles = teamMonth.length
  const teamRevenue = teamMonth.reduce((s,c)=>s+(c.amount||0),0)
  const teamBonus = teamFiles > MONTHLY_TARGET ? (teamFiles-MONTHLY_TARGET)*BONUS_PER_FILE*Math.max(staff.length,1) : 0

  // Lead source breakdown for whole team
  const teamBySource = {}
  teamMonth.forEach(c => { const src = c.lead_source||'Unknown'; teamBySource[src]=(teamBySource[src]||0)+1 })

  return (
    <div>
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,maxWidth:320,width:'100%'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Remove staff member?</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}><strong>{confirmDelete.name}</strong> · {confirmDelete.staff_id}<br/>This cannot be undone.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{background:'var(--danger)',color:'#fff',border:'none'}} onClick={deleteStaff}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Month filter */}
      <div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:12,paddingBottom:4}}>
        {MONTHS.map((m,i)=>(
          <button key={i} onClick={()=>setMonthFilter(i)} style={{padding:'5px 10px',borderRadius:20,border:'1px solid',fontSize:11.5,fontWeight:600,whiteSpace:'nowrap',cursor:'pointer',background:monthFilter===i?'var(--navy)':'#fff',borderColor:monthFilter===i?'var(--navy)':'var(--border)',color:monthFilter===i?'#fff':'var(--text2)'}}>{m}</button>
        ))}
      </div>

      {/* Team metrics */}
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Team size</div><div className="metric-value blue">{staff.length}</div></div>
        <div className="metric-card"><div className="metric-label">Files — {MONTHS[monthFilter]}</div><div className="metric-value">{teamFiles}</div></div>
        <div className="metric-card"><div className="metric-label">Revenue</div><div className="metric-value green">৳{teamRevenue.toLocaleString()}</div></div>
        <div className="metric-card"><div className="metric-label">Team bonus</div><div className="metric-value amber">৳{teamBonus.toLocaleString()}</div></div>
      </div>

      {/* Team target bar */}
      <div className="card mb-12">
        <div className="card-header"><Target size={14}/> Team target — {MONTHS[monthFilter]}</div>
        <div style={{padding:'12px 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12.5,marginBottom:6}}>
            <span style={{color:'var(--text2)'}}>Files completed</span>
            <span style={{fontWeight:700}}>{teamFiles} / {MONTHLY_TARGET} ({Math.min(Math.round(teamFiles/MONTHLY_TARGET*100),100)}%)</span>
          </div>
          <div style={{height:12,background:'var(--surface2)',borderRadius:6,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:6,width:`${Math.min(Math.round(teamFiles/MONTHLY_TARGET*100),100)}%`,background:teamFiles>=MONTHLY_TARGET?'var(--success)':'var(--navy)',transition:'width .3s'}}/>
          </div>
          {teamFiles >= MONTHLY_TARGET
            ? <div style={{marginTop:8,fontSize:12.5,color:'var(--success)',fontWeight:600,display:'flex',alignItems:'center',gap:6}}><Award size={14}/> Target hit! ৳{BONUS_PER_FILE}/extra file per member</div>
            : <div style={{marginTop:6,fontSize:12,color:'var(--text3)'}}>{MONTHLY_TARGET-teamFiles} more files to unlock bonus</div>
          }
        </div>
      </div>

      {/* Lead source breakdown */}
      {Object.keys(teamBySource).length > 0 && (
        <div className="card mb-12">
          <div className="card-header"><TrendingUp size={14}/> Lead sources — {MONTHS[monthFilter]}</div>
          <div style={{padding:'12px 16px'}}>
            {Object.entries(teamBySource).sort((a,b)=>b[1]-a[1]).map(([src,count])=>(
              <div key={src} style={{marginBottom:8}}>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12.5,marginBottom:3}}>
                  <span style={{color:'var(--text2)'}}>{src}</span>
                  <span style={{fontWeight:700}}>{count} <span style={{color:'var(--text3)',fontWeight:400}}>({Math.round(count/teamFiles*100)}%)</span></span>
                </div>
                <div style={{height:6,background:'var(--surface2)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,width:`${Math.round(count/teamFiles*100)}%`,background:'var(--navy)'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs">
        {['overview','kpi','form'].map(t=>(
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>{setTab(t);if(t==='form'){setAdding(true);setEditStaff(null);setForm({name:'',role:'Sales Assistant',phone:'',email:'',salary:0,join_date:new Date().toISOString().slice(0,10),staff_id:''})}}}>
            {t==='form'?'+ Add staff':t==='kpi'?'KPI Report':'Team'}
          </button>
        ))}
      </div>

      {/* Add/Edit form */}
      {(tab==='form'||adding) && (
        <div className="card mb-12">
          <div className="card-header">{editStaff?'Edit staff member':'Add staff member'}</div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Staff ID</label>
              <input className="form-input" placeholder="Auto-generated" value={form.staff_id} onChange={e=>setForm(f=>({...f,staff_id:e.target.value}))} />
              <div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>Leave blank to auto-generate (e.g. VVC-STF-2606-001)</div>
            </div>
            <div className="form-group"><label className="form-label">Full name</label><input className="form-input" placeholder="e.g. Rahim Uddin" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="form-group">
              <label className="form-label">Position / Role</label>
              <div style={{display:'flex',gap:6}}>
                <select className="form-select" style={{flex:1}} value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  {roles.map(r=><option key={r}>{r}</option>)}
                </select>
                {addingRole ? (
                  <div style={{display:'flex',gap:4}}>
                    <input className="form-input" style={{width:120}} placeholder="Role name" value={customRole} onChange={e=>setCustomRole(e.target.value)}/>
                    <button className="btn btn-primary btn-sm" onClick={()=>{if(customRole.trim()){setRoles(r=>[...r,customRole.trim()]);setForm(f=>({...f,role:customRole.trim()}));setCustomRole('');setAddingRole(false)}}}>Add</button>
                    <button className="btn btn-sm" onClick={()=>{setAddingRole(false);setCustomRole('')}}>✕</button>
                  </div>
                ) : (
                  <button className="btn btn-sm" style={{whiteSpace:'nowrap'}} onClick={()=>setAddingRole(true)}>+ New</button>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Monthly salary (৳)</label><input className="form-input" type="number" value={form.salary} onChange={e=>setForm(f=>({...f,salary:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Join date</label><input className="form-input" type="date" value={form.join_date} onChange={e=>setForm(f=>({...f,join_date:e.target.value}))}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>{setAdding(false);setEditStaff(null);setTab('overview')}}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={saveStaff}>{editStaff?'Save changes':'Add staff'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Team overview */}
      {tab==='overview' && (
        <div className="card">
          {staff.length===0 && <div style={{padding:24,textAlign:'center',color:'var(--text3)',fontSize:13}}>No staff added yet. Use "+ Add staff" tab.</div>}
          {staff.map(s=>{
            const kpi = getStaffKPI(s,monthFilter)
            return (
              <div key={s.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:6}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13.5}}>{s.name}</div>
                    <div style={{fontSize:11.5,color:'var(--text3)'}}>{s.staff_id} · {s.role}</div>
                    <div style={{fontSize:11.5,color:'var(--text3)'}}>৳{Number(s.salary).toLocaleString()}/mo {s.phone && `· ${s.phone}`}</div>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>openEdit(s)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--navy)',padding:4}}><Edit2 size={14}/></button>
                    <button onClick={()=>setConfirmDelete(s)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4}}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{display:'flex',gap:12,fontSize:12,marginBottom:6}}>
                  <span><strong>{kpi.files}</strong> files</span>
                  <span style={{color:'var(--success)'}}><strong>৳{kpi.revenue.toLocaleString()}</strong></span>
                  {kpi.bonus>0 && <span style={{color:'var(--success)'}}>+৳{kpi.bonus} bonus</span>}
                </div>
                <div style={{height:6,background:'var(--surface2)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,width:`${kpi.progress}%`,background:kpi.progress>=100?'var(--success)':'var(--navy)'}}/>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* KPI Report */}
      {tab==='kpi' && (
        <div>
          {staff.length===0 && <div className="card" style={{padding:24,textAlign:'center',color:'var(--text3)',fontSize:13}}>No staff added yet.</div>}
          {staff.map(s=>{
            const kpi = getStaffKPI(s,monthFilter)
            return (
              <div key={s.id} className="card mb-12">
                <div className="card-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{display:'flex',alignItems:'center',gap:6}}><User size={14}/> {s.name}</span>
                  <span style={{fontSize:11,color:'var(--text3)',fontWeight:400}}>{s.staff_id} · {s.role}</span>
                </div>
                <div className="metrics-grid" style={{gridTemplateColumns:'repeat(3,1fr)',padding:'8px 12px'}}>
                  <div style={{textAlign:'center',padding:8}}>
                    <div style={{fontSize:18,fontWeight:800,color:'var(--navy)'}}>{kpi.files}</div>
                    <div style={{fontSize:10.5,color:'var(--text3)'}}>Files</div>
                  </div>
                  <div style={{textAlign:'center',padding:8}}>
                    <div style={{fontSize:18,fontWeight:800,color:'var(--success)'}}>৳{kpi.revenue.toLocaleString()}</div>
                    <div style={{fontSize:10.5,color:'var(--text3)'}}>Revenue</div>
                  </div>
                  <div style={{textAlign:'center',padding:8}}>
                    <div style={{fontSize:18,fontWeight:800,color:kpi.bonus>0?'var(--success)':'var(--text3)'}}>৳{kpi.bonus.toLocaleString()}</div>
                    <div style={{fontSize:10.5,color:'var(--text3)'}}>Bonus</div>
                  </div>
                </div>
                <div style={{padding:'0 16px 12px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                    <div style={{background:'#FEF3C7',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{fontSize:10.5,color:'var(--text3)'}}>Suspicious flagged</div>
                      <div style={{fontWeight:700,color:'var(--warning)'}}>{kpi.suspicious}</div>
                    </div>
                    <div style={{background:'#FEE2E2',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{fontSize:10.5,color:'var(--text3)'}}>Fraudulent found</div>
                      <div style={{fontWeight:700,color:'var(--danger)'}}>{kpi.fraudulent}</div>
                    </div>
                    <div style={{background:'#F0FDF4',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{fontSize:10.5,color:'var(--text3)'}}>Completed</div>
                      <div style={{fontWeight:700,color:'var(--success)'}}>{kpi.completed}</div>
                    </div>
                    <div style={{background:'var(--surface2)',borderRadius:8,padding:'8px 12px'}}>
                      <div style={{fontSize:10.5,color:'var(--text3)'}}>Target %</div>
                      <div style={{fontWeight:700}}>{kpi.progress}%</div>
                    </div>
                  </div>
                  {!hasAssignedData && staff.length > 1 && (
                    <div style={{fontSize:11,color:'var(--warning)',marginBottom:8,padding:'6px 10px',background:'var(--warning-bg)',borderRadius:6}}>
                      ⚠ Cases not yet assigned to staff. Showing team total. Select "Handled by" when creating new cases to track per-staff.
                    </div>
                  )}
                  {Object.keys(kpi.bySource).length>0 && (
                    <div>
                      <div style={{fontSize:12,fontWeight:600,marginBottom:6,color:'var(--text2)'}}>Lead sources</div>
                      {Object.entries(kpi.bySource).sort((a,b)=>b[1]-a[1]).map(([src,cnt])=>(
                        <div key={src} style={{display:'flex',justifyContent:'space-between',fontSize:12,padding:'3px 0',borderBottom:'1px solid var(--border)'}}>
                          <span style={{color:'var(--text2)'}}>{src}</span><span style={{fontWeight:600}}>{cnt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Target progress */}
                  <div style={{marginTop:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:11.5,marginBottom:3}}>
                      <span style={{color:'var(--text3)'}}>Monthly target</span>
                      <span style={{fontWeight:600}}>{kpi.files}/{MONTHLY_TARGET}</span>
                    </div>
                    <div style={{height:6,background:'var(--surface2)',borderRadius:3,overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:3,width:`${kpi.progress}%`,background:kpi.progress>=100?'var(--success)':'var(--navy)'}}/>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
