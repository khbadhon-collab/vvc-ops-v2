import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, Instagram, Facebook, Twitter, Linkedin, Clock, CheckCircle, XCircle } from 'lucide-react'

const PLATFORMS = ['Facebook','Instagram','LinkedIn','Twitter/X']
const TONES = ['Professional','Awareness','Urgent Alert','Educational','Promotional']
const STATUSES = ['Scheduled','Posted','Skipped']
const PLATFORM_COLORS = { Facebook:'#1877F2', Instagram:'#E1306C', LinkedIn:'#0A66C2', 'Twitter/X':'#000' }

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''

export default function Social() {
  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('queue')
  const [adding, setAdding] = useState(false)
  const [editPost, setEditPost] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ platform:'Facebook', tone:'Professional', caption:'', hashtags:'', scheduled_date:'', status:'Scheduled', notes:'' })
  const [saving, setSaving] = useState(false)
  const [filterPlatform, setFilterPlatform] = useState('all')

  useEffect(() => { loadPosts() }, [])

  const loadPosts = async () => {
    const { data } = await supabase.from('social_posts').select('*').order('scheduled_date',{ascending:true})
    if (data) setPosts(data)
  }

  const save = async () => {
    if (!form.caption) return
    setSaving(true)
    if (editPost) {
      await supabase.from('social_posts').update({ ...form }).eq('id',editPost.id)
    } else {
      await supabase.from('social_posts').insert([{ ...form, created_at:new Date().toISOString() }])
    }
    await loadPosts()
    setSaving(false); setAdding(false); setEditPost(null)
    setForm({ platform:'Facebook', tone:'Professional', caption:'', hashtags:'', scheduled_date:'', status:'Scheduled', notes:'' })
  }

  const openEdit = (p) => {
    setEditPost(p)
    setForm({ platform:p.platform, tone:p.tone||'Professional', caption:p.caption, hashtags:p.hashtags||'', scheduled_date:p.scheduled_date?.slice(0,16)||'', status:p.status, notes:p.notes||'' })
    setAdding(true)
  }

  const markPosted = async (p) => {
    await supabase.from('social_posts').update({ status:'Posted' }).eq('id',p.id)
    setPosts(list=>list.map(x=>x.id===p.id?{...x,status:'Posted'}:x))
  }

  const del = async () => {
    await supabase.from('social_posts').delete().eq('id',confirmDelete.id)
    setPosts(l=>l.filter(x=>x.id!==confirmDelete.id))
    setConfirmDelete(null)
  }

  const now = new Date()
  const today = now.toISOString().slice(0,10)
  const todayPosts = posts.filter(p=>p.scheduled_date?.slice(0,10)===today)
  const scheduled = posts.filter(p=>p.status==='Scheduled')
  const posted = posts.filter(p=>p.status==='Posted')
  const skipped = posts.filter(p=>p.status==='Skipped')

  const filtered = posts.filter(p=>{
    const matchPlatform = filterPlatform==='all'||p.platform===filterPlatform
    const matchTab = tab==='queue'?p.status==='Scheduled':tab==='posted'?p.status==='Posted':tab==='skipped'?p.status==='Skipped':true
    return matchPlatform && matchTab
  })

  const PlatformDot = ({platform}) => (
    <span style={{width:8,height:8,borderRadius:'50%',background:PLATFORM_COLORS[platform]||'var(--navy)',display:'inline-block',marginRight:4}}/>
  )

  return (
    <div>
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,maxWidth:320,width:'100%'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Delete post?</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}>{confirmDelete.platform} post<br/>This cannot be undone.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{background:'var(--danger)',color:'#fff',border:'none'}} onClick={del}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Today</div><div className="metric-value blue">{todayPosts.length}</div><div className="metric-sub">posts scheduled</div></div>
        <div className="metric-card"><div className="metric-label">Scheduled</div><div className="metric-value amber">{scheduled.length}</div></div>
        <div className="metric-card"><div className="metric-label">Posted</div><div className="metric-value green">{posted.length}</div></div>
        <div className="metric-card"><div className="metric-label">Skipped</div><div className="metric-value red">{skipped.length}</div></div>
      </div>

      {/* Facebook Page quick link */}
      <div style={{background:'#E7F3FF',border:'1px solid #B3D4FF',borderRadius:8,padding:'10px 14px',marginBottom:12,display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:28,height:28,borderRadius:'50%',background:'#1877F2',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <span style={{color:'#fff',fontWeight:700,fontSize:13}}>f</span>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:12.5,fontWeight:600,color:'#1877F2'}}>VVC Facebook Page</div>
          <div style={{fontSize:11.5,color:'var(--text3)'}}>facebook.com/VisaVerificationCenter</div>
        </div>
        <a href="https://www.facebook.com/VisaVerificationCenter" target="_blank" rel="noreferrer" className="btn btn-sm" style={{color:'#1877F2',borderColor:'#1877F2',flexShrink:0}}>Open →</a>
      </div>

      {/* Facebook note */}
      <div style={{background:'var(--warning-bg)',border:'1px solid #FDE68A',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12.5,color:'var(--warning)'}}>
        💡 <strong>Auto-posting not available</strong> — Facebook requires business app verification (weeks of review). Use this tracker to plan posts, then manually post on Facebook. Tap "Open →" above to go to your page.
      </div>

      {/* Today's posts alert */}
      {todayPosts.length > 0 && (
        <div style={{background:'var(--info-bg)',border:'1px solid var(--info)',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13}}>
          <strong style={{color:'var(--info)'}}>📅 Today — {todayPosts.length} post{todayPosts.length!==1?'s':''} scheduled</strong>
          <div style={{marginTop:4,display:'flex',gap:6,flexWrap:'wrap'}}>
            {todayPosts.map(p=>(
              <span key={p.id} style={{fontSize:11.5,background:'#fff',borderRadius:10,padding:'2px 8px',border:'1px solid var(--border)'}}>
                <PlatformDot platform={p.platform}/>{p.platform} · {p.scheduled_date?.slice(11,16)}
                {p.status==='Scheduled' && <button onClick={()=>markPosted(p)} style={{marginLeft:6,background:'none',border:'none',cursor:'pointer',color:'var(--success)',fontSize:11,fontWeight:600,padding:0}}>✓ Mark posted</button>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Platform filter */}
      <div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:12,paddingBottom:4}}>
        {['all',...PLATFORMS].map(p=>(
          <button key={p} onClick={()=>setFilterPlatform(p)} style={{padding:'5px 12px',borderRadius:20,border:'1px solid',fontSize:12,fontWeight:600,whiteSpace:'nowrap',cursor:'pointer',background:filterPlatform===p?'var(--navy)':'#fff',borderColor:filterPlatform===p?'var(--navy)':'var(--border)',color:filterPlatform===p?'#fff':'var(--text2)'}}>
            {p==='all'?'All':p}
          </button>
        ))}
      </div>

      {/* Add post button */}
      {!adding && (
        <button className="btn btn-primary btn-full mb-12" style={{padding:11}} onClick={()=>{setAdding(true);setEditPost(null);setForm({ platform:'Facebook', tone:'Professional', caption:'', hashtags:'', scheduled_date:'', status:'Scheduled', notes:'' })}}>
          <Plus size={15}/> Schedule new post
        </button>
      )}

      {/* Tabs */}
      <div className="tabs">
        {[{key:'queue',label:`Queue (${posts.filter(p=>p.status==='Scheduled').length})`},{key:'posted',label:`Posted (${posted.length})`},{key:'skipped',label:`Skipped (${skipped.length})`}].map(({key,label})=>(
          <button key={key} className={`tab-btn ${tab===key?'active':''}`} onClick={()=>setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* Add/Edit form */}
      {(adding||tab==='form') && (
        <div className="card mb-12">
          <div className="card-header">{editPost?'Edit post':'Schedule post'}</div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Platform</label>
                <select className="form-select" value={form.platform} onChange={e=>setForm(f=>({...f,platform:e.target.value}))}>
                  {PLATFORMS.map(p=><option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Tone</label>
                <select className="form-select" value={form.tone} onChange={e=>setForm(f=>({...f,tone:e.target.value}))}>
                  {TONES.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Caption</label>
              <textarea className="form-input" rows={4} placeholder="Write your post caption here (Bengali or English)..." value={form.caption} onChange={e=>setForm(f=>({...f,caption:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
            <div className="form-group"><label className="form-label">Hashtags</label>
              <input className="form-input" placeholder="#VVC #VisaVerification #সতর্কতা" value={form.hashtags} onChange={e=>setForm(f=>({...f,hashtags:e.target.value}))}/>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Scheduled date & time</label>
                <input className="form-input" type="datetime-local" value={form.scheduled_date} onChange={e=>setForm(f=>({...f,scheduled_date:e.target.value}))}/>
              </div>
              <div className="form-group"><label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                  {STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>{setAdding(false);setEditPost(null)}}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>{saving?'Saving...':'Save post'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Post list */}
      {!adding && (
        <div className="card">
          {filtered.length===0 && <div style={{padding:24,textAlign:'center',color:'var(--text3)',fontSize:13}}>No posts here yet.</div>}
          {filtered.map(p=>(
            <div key={p.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                    <PlatformDot platform={p.platform}/>
                    <span style={{fontWeight:600,fontSize:12.5,color:PLATFORM_COLORS[p.platform]||'var(--navy)'}}>{p.platform}</span>
                    <span style={{fontSize:11,color:'var(--text3)'}}>· {p.tone}</span>
                    {p.scheduled_date && <span style={{fontSize:11,color:'var(--text3)'}}>· {fmtDate(p.scheduled_date)}</span>}
                  </div>
                  <div style={{fontSize:13,color:'var(--text)',lineHeight:1.5,marginBottom:4,whiteSpace:'pre-wrap'}}>{p.caption?.slice(0,120)}{p.caption?.length>120?'...':''}</div>
                  {p.hashtags && <div style={{fontSize:11,color:'var(--info)'}}>{p.hashtags}</div>}
                </div>
                <div style={{display:'flex',gap:4,flexShrink:0,flexDirection:'column',alignItems:'flex-end'}}>
                  <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:10,background:p.status==='Posted'?'var(--success-bg)':p.status==='Skipped'?'var(--danger-bg)':'var(--warning-bg)',color:p.status==='Posted'?'var(--success)':p.status==='Skipped'?'var(--danger)':'var(--warning)'}}>
                    {p.status}
                  </span>
                  <div style={{display:'flex',gap:2,marginTop:4}}>
                    {p.status==='Scheduled' && <button onClick={()=>markPosted(p)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--success)',padding:4}}><CheckCircle size={14}/></button>}
                    <button onClick={()=>openEdit(p)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--navy)',padding:4}}><Edit2 size={14}/></button>
                    <button onClick={()=>setConfirmDelete(p)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4}}><Trash2 size={14}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
