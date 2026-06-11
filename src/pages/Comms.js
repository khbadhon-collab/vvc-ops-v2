import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, getCases, buildWhatsAppLink } from '../lib/supabase'
import { MessageCircle, Phone, Mail, Facebook, Plus, Edit2, Trash2, ChevronRight, Search } from 'lucide-react'

const CHANNELS = ['WhatsApp','Phone Call','Facebook','Email','In Person']
const OUTCOMES = ['Interested','Not interested','Converted','No reply','Follow up needed','Closed']
const CHANNEL_ICONS = { WhatsApp: MessageCircle, 'Phone Call': Phone, Email: Mail, Facebook: Facebook, 'In Person': Phone }
const CHANNEL_COLORS = { WhatsApp:'#25D366','Phone Call':'var(--info)',Email:'var(--warning)',Facebook:'#1877F2','In Person':'var(--purple)' }

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : ''

export default function Comms() {
  const [logs, setLogs] = useState([])
  const [cases, setCases] = useState([])
  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [editLog, setEditLog] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [form, setForm] = useState({ case_id:'', client_name:'', client_phone:'', channel:'WhatsApp', direction:'inbound', outcome:'Interested', notes:'', date: new Date().toISOString().slice(0,16) })
  const [saving, setSaving] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    loadLogs()
    getCases().then(({ data }) => { if (data?.length) setCases(data) })
  }, [])

  const loadLogs = async () => {
    const { data } = await supabase.from('comms_log').select('*').order('date', { ascending: false })
    if (data) setLogs(data)
  }

  const save = async () => {
    if (!form.client_name || !form.channel) return
    setSaving(true)
    if (editLog) {
      await supabase.from('comms_log').update({ ...form }).eq('id', editLog.id)
    } else {
      await supabase.from('comms_log').insert([{ ...form, created_at: new Date().toISOString() }])
    }
    await loadLogs()
    setSaving(false)
    setAdding(false)
    setEditLog(null)
    resetForm()
  }

  const resetForm = () => setForm({ case_id:'', client_name:'', client_phone:'', channel:'WhatsApp', direction:'inbound', outcome:'Interested', notes:'', date: new Date().toISOString().slice(0,16) })

  const openEdit = (log) => {
    setEditLog(log)
    setForm({ case_id:log.case_id||'', client_name:log.client_name||'', client_phone:log.client_phone||'', channel:log.channel, direction:log.direction||'inbound', outcome:log.outcome, notes:log.notes||'', date:log.date?.slice(0,16)||'' })
    setAdding(true)
  }

  const del = async () => {
    await supabase.from('comms_log').delete().eq('id', confirmDelete.id)
    setLogs(l => l.filter(x => x.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const onCaseSelect = (caseId) => {
    const c = cases.find(x => x.id === caseId)
    if (c) setForm(f => ({ ...f, case_id: caseId, client_name: c.client_name, client_phone: c.client_phone||'' }))
    else setForm(f => ({ ...f, case_id: caseId }))
  }

  const filtered = logs.filter(l => {
    const matchTab = tab === 'all' || l.channel === tab
    const matchSearch = !search || l.client_name?.toLowerCase().includes(search.toLowerCase()) || l.notes?.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  // Stats
  const today = new Date().toISOString().slice(0,10)
  const todayLogs = logs.filter(l => l.date?.slice(0,10) === today)
  const byChannel = {}
  logs.forEach(l => { byChannel[l.channel] = (byChannel[l.channel]||0)+1 })
  const converted = logs.filter(l => l.outcome === 'Converted').length

  const Icon = ({ channel, size=14 }) => {
    const C = CHANNEL_ICONS[channel] || MessageCircle
    return <C size={size} color={CHANNEL_COLORS[channel]} />
  }

  return (
    <div>
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,maxWidth:320,width:'100%'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Delete log entry?</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}>{confirmDelete.client_name} · {confirmDelete.channel}<br/>This cannot be undone.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{background:'var(--danger)',color:'#fff',border:'none'}} onClick={del}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Total logs</div><div className="metric-value blue">{logs.length}</div></div>
        <div className="metric-card"><div className="metric-label">Today</div><div className="metric-value">{todayLogs.length}</div></div>
        <div className="metric-card"><div className="metric-label">Converted</div><div className="metric-value green">{converted}</div></div>
        <div className="metric-card"><div className="metric-label">Conv. rate</div><div className="metric-value amber">{logs.length>0?Math.round(converted/logs.length*100):0}%</div></div>
      </div>

      {/* Channel breakdown */}
      {Object.keys(byChannel).length > 0 && (
        <div className="card mb-12" style={{padding:'12px 16px'}}>
          <div style={{fontSize:11.5,fontWeight:600,color:'var(--text2)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.4px'}}>Enquiries by channel</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {Object.entries(byChannel).sort((a,b)=>b[1]-a[1]).map(([ch,cnt])=>(
              <div key={ch} style={{display:'flex',alignItems:'center',gap:5,background:'var(--surface2)',borderRadius:20,padding:'4px 10px',fontSize:12}}>
                <Icon channel={ch} size={12}/>
                <span style={{fontWeight:600}}>{ch}</span>
                <span style={{color:'var(--text3)'}}>{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add button */}
      {!adding && (
        <button className="btn btn-primary btn-full mb-12" style={{padding:11}} onClick={()=>{setAdding(true);setEditLog(null);resetForm()}}>
          <Plus size={15}/> Log communication
        </button>
      )}

      {/* Add/Edit form */}
      {adding && (
        <div className="card mb-12">
          <div className="card-header">{editLog ? 'Edit log' : 'Log communication'}</div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Link to case (optional)</label>
              <select className="form-select" value={form.case_id} onChange={e=>onCaseSelect(e.target.value)}>
                <option value="">— No case linked —</option>
                {cases.map(c=><option key={c.id} value={c.id}>{c.client_name} · {c.case_id}</option>)}
              </select>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Client name</label>
                <input className="form-input" placeholder="Name" value={form.client_name} onChange={e=>setForm(f=>({...f,client_name:e.target.value}))}/>
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="+880..." value={form.client_phone} onChange={e=>setForm(f=>({...f,client_phone:e.target.value}))}/>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Channel</label>
                <select className="form-select" value={form.channel} onChange={e=>setForm(f=>({...f,channel:e.target.value}))}>
                  {CHANNELS.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Direction</label>
                <select className="form-select" value={form.direction} onChange={e=>setForm(f=>({...f,direction:e.target.value}))}>
                  <option value="inbound">Inbound (they contacted us)</option>
                  <option value="outbound">Outbound (we contacted them)</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Outcome</label>
                <select className="form-select" value={form.outcome} onChange={e=>setForm(f=>({...f,outcome:e.target.value}))}>
                  {OUTCOMES.map(o=><option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Date & time</label>
                <input className="form-input" type="datetime-local" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={3} placeholder="What was discussed? Any follow-up needed?" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={{resize:'vertical'}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>{setAdding(false);setEditLog(null);resetForm()}}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={save} disabled={saving}>{saving?'Saving...':'Save log'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="search-bar">
        <Search size={15} color="var(--text3)"/>
        <input placeholder="Search by name or notes..." value={search} onChange={e=>setSearch(e.target.value)}/>
      </div>

      {/* Channel filter tabs */}
      <div style={{display:'flex',gap:6,overflowX:'auto',marginBottom:12,paddingBottom:4}}>
        {['all',...CHANNELS].map(ch=>(
          <button key={ch} onClick={()=>setTab(ch)} style={{padding:'5px 12px',borderRadius:20,border:'1px solid',fontSize:12,fontWeight:600,whiteSpace:'nowrap',cursor:'pointer',background:tab===ch?'var(--navy)':'#fff',borderColor:tab===ch?'var(--navy)':'var(--border)',color:tab===ch?'#fff':'var(--text2)'}}>
            {ch==='all'?'All':ch}
          </button>
        ))}
      </div>

      {/* Log list */}
      <div className="card">
        {filtered.length===0 && <div style={{padding:24,textAlign:'center',color:'var(--text3)',fontSize:13}}>No communications logged yet.</div>}
        {filtered.map(log=>(
          <div key={log.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
              <div style={{display:'flex',gap:10,flex:1,minWidth:0}}>
                <div style={{width:32,height:32,borderRadius:'50%',background:'var(--surface2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <Icon channel={log.channel} size={15}/>
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:600,fontSize:13}}>{log.client_name}</div>
                  <div style={{fontSize:11.5,color:'var(--text3)',marginTop:1}}>
                    {log.channel} · {log.direction==='inbound'?'↙ Inbound':'↗ Outbound'} · {fmtDate(log.date)}
                  </div>
                  {log.notes && <div style={{fontSize:12,color:'var(--text2)',marginTop:4,lineHeight:1.4}}>{log.notes}</div>}
                  <div style={{display:'flex',gap:6,marginTop:6,flexWrap:'wrap',alignItems:'center'}}>
                    <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:10,background:log.outcome==='Converted'?'var(--success-bg)':log.outcome==='Not interested'?'var(--danger-bg)':'var(--surface2)',color:log.outcome==='Converted'?'var(--success)':log.outcome==='Not interested'?'var(--danger)':'var(--text2)'}}>
                      {log.outcome}
                    </span>
                    {log.case_id && (
                      <button onClick={()=>navigate(`/cases/${log.case_id}`)} style={{background:'none',border:'none',cursor:'pointer',fontSize:11,color:'var(--navy)',display:'flex',alignItems:'center',gap:3,padding:0}}>
                        View case <ChevronRight size={10}/>
                      </button>
                    )}
                    {log.client_phone && (
                      <a href={buildWhatsAppLink(log.client_phone,'')} target="_blank" rel="noreferrer" style={{fontSize:11,color:'#25D366',display:'flex',alignItems:'center',gap:3,textDecoration:'none'}}>
                        <MessageCircle size={10}/> WhatsApp
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',gap:4,flexShrink:0}}>
                <button onClick={()=>openEdit(log)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--navy)',padding:4}}><Edit2 size={14}/></button>
                <button onClick={()=>setConfirmDelete(log)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4}}><Trash2 size={14}/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {filtered.length>0 && <div style={{fontSize:12,color:'var(--text3)',textAlign:'center',marginTop:10}}>{filtered.length} log{filtered.length!==1?'s':''}</div>}
    </div>
  )
}
