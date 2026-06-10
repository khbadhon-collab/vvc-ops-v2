import React, { useState, useEffect } from 'react'
import { supabase, getCases } from '../lib/supabase'
import { Plus, Edit2, Trash2, Target, TrendingUp, Award } from 'lucide-react'

const MONTHLY_TARGET = 150
const BONUS_PER_FILE = 50 // ৳ bonus per file above target

export default function Staff() {
  const [staff, setStaff] = useState([])
  const [cases, setCases] = useState([])
  const [tab, setTab] = useState('overview')
  const [adding, setAdding] = useState(false)
  const [editStaff, setEditStaff] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ name:'', role:'Analyst', phone:'', email:'', salary:0, join_date: new Date().toISOString().slice(0,10) })

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  useEffect(() => {
    loadStaff()
    getCases().then(({ data }) => { if (data?.length) setCases(data) })
  }, [])

  const loadStaff = async () => {
    const { data } = await supabase.from('staff').select('*').order('created_at', { ascending: true })
    if (data) setStaff(data)
  }

  const thisMonthCases = cases.filter(c => c.created_at >= monthStart)

  // Cases per staff member — for now total cases divided (will be per-staff when cases have assigned_to)
  const totalThisMonth = thisMonthCases.length

  const getStaffStats = (s) => {
    // In future: filter by assigned_to = s.id. For now show team total.
    const files = Math.round(totalThisMonth / Math.max(staff.length, 1))
    const bonus = files > MONTHLY_TARGET ? (files - MONTHLY_TARGET) * BONUS_PER_FILE : 0
    const progress = Math.min(Math.round(files / MONTHLY_TARGET * 100), 100)
    return { files, bonus, progress }
  }

  const saveStaff = async () => {
    if (!form.name) return
    if (editStaff) {
      await supabase.from('staff').update({ ...form, salary: Number(form.salary) }).eq('id', editStaff.id)
    } else {
      await supabase.from('staff').insert([{ ...form, salary: Number(form.salary), created_at: new Date().toISOString() }])
    }
    await loadStaff()
    setAdding(false)
    setEditStaff(null)
    setForm({ name:'', role:'Analyst', phone:'', email:'', salary:0, join_date: new Date().toISOString().slice(0,10) })
  }

  const openEdit = (s) => { setEditStaff(s); setForm({ name:s.name, role:s.role, phone:s.phone||'', email:s.email||'', salary:s.salary||0, join_date:s.join_date||'' }); setAdding(true) }

  const deleteStaff = async () => {
    await supabase.from('staff').delete().eq('id', confirmDelete.id)
    setStaff(list => list.filter(s => s.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const teamFiles = Math.round(totalThisMonth)
  const teamBonus = teamFiles > MONTHLY_TARGET ? (teamFiles - MONTHLY_TARGET) * BONUS_PER_FILE * staff.length : 0

  return (
    <div>
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,maxWidth:320,width:'100%'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Remove staff member?</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}><strong>{confirmDelete.name}</strong><br/>This cannot be undone.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{background:'var(--danger)',color:'#fff',border:'none'}} onClick={deleteStaff}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Team summary */}
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Team size</div><div className="metric-value blue">{staff.length}</div></div>
        <div className="metric-card"><div className="metric-label">Files this month</div><div className="metric-value">{teamFiles}</div></div>
        <div className="metric-card"><div className="metric-label">Target</div><div className="metric-value amber">{MONTHLY_TARGET}</div><div className="metric-sub">per month</div></div>
        <div className="metric-card"><div className="metric-label">Team bonus</div><div className="metric-value green">৳{teamBonus.toLocaleString()}</div></div>
      </div>

      {/* Team progress bar */}
      <div className="card mb-12">
        <div className="card-header"><Target size={14}/> Monthly target progress</div>
        <div style={{padding:'12px 16px'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:12.5,marginBottom:6}}>
            <span style={{color:'var(--text2)'}}>Files completed</span>
            <span style={{fontWeight:700}}>{teamFiles} / {MONTHLY_TARGET} <span style={{color:teamFiles>=MONTHLY_TARGET?'var(--success)':'var(--text3)',fontSize:11}}>({Math.min(Math.round(teamFiles/MONTHLY_TARGET*100),100)}%)</span></span>
          </div>
          <div style={{height:12,background:'var(--surface2)',borderRadius:6,overflow:'hidden'}}>
            <div style={{height:'100%',borderRadius:6,width:`${Math.min(Math.round(teamFiles/MONTHLY_TARGET*100),100)}%`,background:teamFiles>=MONTHLY_TARGET?'var(--success)':'var(--navy)',transition:'width .3s'}} />
          </div>
          {teamFiles >= MONTHLY_TARGET && (
            <div style={{marginTop:8,fontSize:12.5,color:'var(--success)',fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
              <Award size={14}/> Target hit! Bonus: ৳{BONUS_PER_FILE} per extra file per staff member
            </div>
          )}
          {teamFiles < MONTHLY_TARGET && (
            <div style={{marginTop:6,fontSize:12,color:'var(--text3)'}}>
              {MONTHLY_TARGET - teamFiles} more files needed to unlock bonus
            </div>
          )}
        </div>
      </div>

      <div className="tabs">
        {['overview','add'].map(t => (
          <button key={t} className={`tab-btn ${tab===t?'active':''}`} onClick={()=>{setTab(t);if(t==='add'){setAdding(true);setEditStaff(null);setForm({name:'',role:'Analyst',phone:'',email:'',salary:0,join_date:new Date().toISOString().slice(0,10)})}}}>
            {t === 'add' ? '+ Add staff' : 'Team overview'}
          </button>
        ))}
      </div>

      {/* Add / Edit form */}
      {(adding || tab === 'add') && (
        <div className="card mb-12">
          <div className="card-header">{editStaff ? 'Edit staff member' : 'Add staff member'}</div>
          <div className="card-body">
            <div className="form-group"><label className="form-label">Full name</label><input className="form-input" placeholder="e.g. Rahim Uddin" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={e=>setForm(f=>({...f,role:e.target.value}))}>
                  {['Analyst','Senior Analyst','Manager','Admin'].map(r=><option key={r}>{r}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Monthly salary (৳)</label><input className="form-input" type="number" value={form.salary} onChange={e=>setForm(f=>({...f,salary:e.target.value}))} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
              <div className="form-group"><label className="form-label">Join date</label><input className="form-input" type="date" value={form.join_date} onChange={e=>setForm(f=>({...f,join_date:e.target.value}))} /></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>{setAdding(false);setEditStaff(null);setTab('overview')}}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={saveStaff}>{editStaff?'Save changes':'Add staff'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Staff list */}
      {tab === 'overview' && (
        <div className="card">
          {staff.length === 0 && <div style={{padding:24,textAlign:'center',color:'var(--text3)',fontSize:13}}>No staff added yet.<br/>Go to "Add staff" tab to get started.</div>}
          {staff.map(s => {
            const { files, bonus, progress } = getStaffStats(s)
            return (
              <div key={s.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:13.5}}>{s.name}</div>
                    <div style={{fontSize:11.5,color:'var(--text3)'}}>{s.role} · ৳{Number(s.salary).toLocaleString()}/mo</div>
                  </div>
                  <div style={{display:'flex',gap:4}}>
                    <button onClick={()=>openEdit(s)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--navy)',padding:4}}><Edit2 size={14}/></button>
                    <button onClick={()=>setConfirmDelete(s)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4}}><Trash2 size={14}/></button>
                  </div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:12,marginBottom:4}}>
                  <span style={{color:'var(--text2)'}}>This month</span>
                  <span style={{fontWeight:600}}>{files} files {bonus > 0 && <span style={{color:'var(--success)'}}>· +৳{bonus} bonus</span>}</span>
                </div>
                <div style={{height:6,background:'var(--surface2)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{height:'100%',borderRadius:3,width:`${progress}%`,background:progress>=100?'var(--success)':'var(--navy)'}} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
