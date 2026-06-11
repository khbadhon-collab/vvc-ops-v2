import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth, ROLES } from '../App'
import { Plus, Edit2, Trash2, ShieldCheck, Eye, EyeOff } from 'lucide-react'

export default function AccessControl() {
  const { user: currentUser, role: currentRole } = useAuth()
  const [users, setUsers] = useState([])
  const [adding, setAdding] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ email:'', password:'', role:'sales', name:'' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    const { data } = await supabase.from('user_roles').select('*').order('created_at', { ascending: true })
    if (data) setUsers(data)
  }

  const createUser = async () => {
    if (!form.email || !form.password) { setError('Email and password required'); return }
    setSaving(true); setError('')
    try {
      // Create auth user via Supabase Admin API (using service role won't work from browser)
      // Instead we use signUp and then set role
      const { data, error: signUpErr } = await supabase.auth.signUp({ email: form.email, password: form.password })
      if (signUpErr) { setError(signUpErr.message); setSaving(false); return }
      const userId = data.user?.id
      if (userId) {
        await supabase.from('user_roles').upsert([{ user_id: userId, email: form.email, role: form.role, name: form.name, created_at: new Date().toISOString() }])
        await loadUsers()
      }
      setAdding(false)
      setForm({ email:'', password:'', role:'sales', name:'' })
    } catch(e) { setError(e.message) }
    setSaving(false)
  }

  const updateRole = async () => {
    if (!editUser) return
    setSaving(true)
    await supabase.from('user_roles').update({ role: form.role, name: form.name }).eq('id', editUser.id)
    await loadUsers()
    setEditUser(null)
    setSaving(false)
  }

  const openEdit = (u) => { setEditUser(u); setForm({ email:u.email, password:'', role:u.role, name:u.name||'' }); setAdding(true) }

  const deleteUser = async () => {
    await supabase.from('user_roles').delete().eq('id', confirmDelete.id)
    setUsers(list => list.filter(u => u.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const ROLE_DESCRIPTIONS = {
    admin: 'Full access — all pages, settings, staff, finance, intelligence',
    sales: 'Cases, comms, marketing, social media, WhatsApp templates',
    accounting: 'Invoices and finance only',
  }

  return (
    <div>
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,maxWidth:320,width:'100%'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Remove user access?</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}><strong>{confirmDelete.email}</strong><br/>They will no longer be able to log in.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{background:'var(--danger)',color:'#fff',border:'none'}} onClick={deleteUser}>Remove</button>
            </div>
          </div>
        </div>
      )}

      {/* Role overview */}
      <div style={{marginBottom:16}}>
        {Object.entries(ROLES).map(([key, info])=>(
          <div key={key} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:10,height:10,borderRadius:'50%',background:info.color,flexShrink:0}}/>
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{info.label}</div>
              <div style={{fontSize:11.5,color:'var(--text3)'}}>{ROLE_DESCRIPTIONS[key]}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add user button */}
      {!adding && (
        <button className="btn btn-primary btn-full mb-12" style={{padding:11}} onClick={()=>{setAdding(true);setEditUser(null);setForm({email:'',password:'',role:'sales',name:''})}}>
          <Plus size={15}/> Add staff account
        </button>
      )}

      {/* Add / Edit form */}
      {adding && (
        <div className="card mb-12">
          <div className="card-header">{editUser ? 'Edit access' : 'Create staff account'}</div>
          <div className="card-body">
            {error && <div style={{background:'var(--danger-bg)',color:'var(--danger)',borderRadius:6,padding:'8px 12px',fontSize:12.5,marginBottom:12}}>{error}</div>}
            <div className="form-group"><label className="form-label">Full name</label><input className="form-input" placeholder="e.g. Rahim Uddin" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            {!editUser && (
              <>
                <div className="form-group"><label className="form-label">Email (login email)</label><input className="form-input" type="email" placeholder="staff@vvc.com" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div style={{position:'relative'}}>
                    <input className="form-input" type={showPwd?'text':'password'} placeholder="Min 6 characters" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} style={{paddingRight:36}}/>
                    <button type="button" onClick={()=>setShowPwd(p=>!p)} style={{position:'absolute',right:10,top:10,background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:0}}>
                      {showPwd?<EyeOff size={15}/>:<Eye size={15}/>}
                    </button>
                  </div>
                </div>
              </>
            )}
            <div className="form-group">
              <label className="form-label">Role / Access level</label>
              {Object.entries(ROLES).map(([key, info])=>(
                <div key={key} onClick={()=>setForm(f=>({...f,role:key}))} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',border:`2px solid ${form.role===key?info.color:'var(--border)'}`,borderRadius:8,marginBottom:6,cursor:'pointer',background:form.role===key?'var(--surface2)':'#fff',transition:'all .15s'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:info.color,flexShrink:0,marginTop:3}}/>
                  <div>
                    <div style={{fontWeight:600,fontSize:13,color:form.role===key?'var(--navy)':'var(--text)'}}>{info.label}</div>
                    <div style={{fontSize:11.5,color:'var(--text3)',marginTop:2}}>{ROLE_DESCRIPTIONS[key]}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>{setAdding(false);setEditUser(null);setError('')}}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={editUser?updateRole:createUser} disabled={saving}>{saving?'Saving...':editUser?'Save changes':'Create account'}</button>
            </div>
            {!editUser && <div style={{fontSize:11.5,color:'var(--text3)',marginTop:10,textAlign:'center'}}>Staff will receive a confirmation email to activate their account.</div>}
          </div>
        </div>
      )}

      {/* User list */}
      <div className="card">
        <div className="card-header"><ShieldCheck size={14}/> Staff accounts ({users.length})</div>
        {users.length === 0 && <div style={{padding:24,textAlign:'center',color:'var(--text3)',fontSize:13}}>No staff accounts yet. Add your first staff member above.</div>}
        {users.map(u => {
          const rInfo = ROLES[u.role] || ROLES.admin
          const isMe = u.email === currentUser?.email
          return (
            <div key={u.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:32,height:32,borderRadius:'50%',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,color:'var(--navy)',flexShrink:0}}>
                {(u.name||u.email).charAt(0).toUpperCase()}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13}}>{u.name||'—'} {isMe && <span style={{fontSize:10,background:'var(--info-bg)',color:'var(--info)',borderRadius:8,padding:'1px 6px',marginLeft:4}}>You</span>}</div>
                <div style={{fontSize:11.5,color:'var(--text3)'}}>{u.email}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:10,background:'var(--surface2)',color:rInfo.color,border:`1px solid ${rInfo.color}33`}}>{rInfo.label}</span>
                {!isMe && <>
                  <button onClick={()=>openEdit(u)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--navy)',padding:4}}><Edit2 size={13}/></button>
                  <button onClick={()=>setConfirmDelete(u)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4}}><Trash2 size={13}/></button>
                </>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
