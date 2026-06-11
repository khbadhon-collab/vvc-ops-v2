import React, { useState, useEffect } from 'react'
import { supabase, buildWhatsAppLink, WA_TEMPLATES } from '../lib/supabase'
import { MessageCircle, Copy, CheckCircle, Plus, Edit2, Trash2 } from 'lucide-react'

const BUILT_IN = [
  { key:'initial_reply', label:'Initial inquiry reply', desc:'First response to new enquiry', inputs:['client'], icon:'👋' },
  { key:'payment_reminder', label:'Payment reminder', desc:'Chase unpaid invoice', inputs:['client','caseId','amount','method'], icon:'💰' },
  { key:'report_ready', label:'Report ready', desc:'Notify client report is done', inputs:['client','caseId','verdict'], icon:'✅' },
  { key:'review_request', label:'Review request', desc:'Ask for Facebook review', inputs:['client'], icon:'⭐' },
  { key:'follow_up', label:'Follow-up', desc:'Chase pending document submission', inputs:['client','caseId'], icon:'📞' },
  { key:'fraud_alert', label:'Fraud alert broadcast', desc:'Warn about new fraud pattern', inputs:['country','docType'], icon:'⚠️' },
]
const INPUT_LABELS = { client:'Client name', caseId:'Case ID', amount:'Amount (৳)', method:'Payment method', verdict:'Verdict', country:'Country', docType:'Document type' }

export default function Templates() {
  const [active, setActive] = useState(null)
  const [inputs, setInputs] = useState({})
  const [phone, setPhone] = useState('')
  const [waAccount, setWaAccount] = useState(1)
  const [waNumbers, setWaNumbers] = useState([])
  const [preview, setPreview] = useState('')
  const [copied, setCopied] = useState(false)
  const [cases, setCases] = useState([])
  const [selectedCase, setSelectedCase] = useState('')
  // Custom templates
  const [customTpls, setCustomTpls] = useState([])
  const [addingCustom, setAddingCustom] = useState(false)
  const [editCustom, setEditCustom] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [customForm, setCustomForm] = useState({ label:'', icon:'💬', body:'' })
  const [savingCustom, setSavingCustom] = useState(false)
  const [tab, setTab] = useState('builtin')

  useEffect(() => {
    // Load cases
    supabase.from('cases').select('id,client_name,client_phone,case_id,amount,verdict').order('created_at',{ascending:false}).then(({data})=>{ if(data) setCases(data) })
    // Load WA numbers from settings
    supabase.from('settings').select('wa_number_1,wa_name_1,wa_number_2,wa_name_2,wa_number_3,wa_name_3').eq('id',1).single().then(({data})=>{
      if (data) {
        const nums = [1,2,3].map(n => ({ n, number: data[`wa_number_${n}`]||'', name: data[`wa_name_${n}`]||`Account ${n}` })).filter(x => x.number)
        setWaNumbers(nums)
        if (nums.length > 0) setWaAccount(nums[0].n)
      }
    })
    // Load custom templates
    loadCustom()
  }, [])

  const loadCustom = async () => {
    const { data } = await supabase.from('custom_templates').select('*').order('created_at',{ascending:true})
    if (data) setCustomTpls(data)
  }

  const saveCustom = async () => {
    if (!customForm.label || !customForm.body) return
    setSavingCustom(true)
    if (editCustom) {
      await supabase.from('custom_templates').update({ label: customForm.label, icon: customForm.icon, body: customForm.body }).eq('id', editCustom.id)
    } else {
      await supabase.from('custom_templates').insert([{ ...customForm, created_at: new Date().toISOString() }])
    }
    await loadCustom()
    setSavingCustom(false)
    setAddingCustom(false)
    setEditCustom(null)
    setCustomForm({ label:'', icon:'💬', body:'' })
  }

  const delCustom = async () => {
    await supabase.from('custom_templates').delete().eq('id', confirmDelete.id)
    setCustomTpls(l => l.filter(t => t.id !== confirmDelete.id))
    setConfirmDelete(null)
  }

  const openEditCustom = (t) => { setEditCustom(t); setCustomForm({ label:t.label, icon:t.icon||'💬', body:t.body }); setAddingCustom(true) }

  const fillFromCase = (caseId) => {
    const c = cases.find(x=>x.id===caseId)
    if (!c) return
    setSelectedCase(caseId)
    setPhone(c.client_phone||'')
    setInputs(prev=>({ ...prev, client:c.client_name||'', caseId:c.case_id||'', amount:c.amount||'', verdict:c.verdict||'' }))
  }

  const selectBuiltin = (t) => { setActive({...t, isCustom:false}); setPreview(''); setInputs({}); setPhone(''); setSelectedCase('') }
  const selectCustom = (t) => { setActive({...t, isCustom:true}); setPreview(t.body); setInputs({}); setPhone(''); setSelectedCase('') }

  const generate = () => {
    if (!active) return
    if (active.isCustom) { setPreview(active.body); return }
    try {
      const fn = WA_TEMPLATES[active.key]
      if (!fn) { setPreview('Template not found'); return }
      const args = active.inputs.map(k => inputs[k]||'...')
      setPreview(fn(...args))
    } catch(e) { setPreview('Error: ' + e.message) }
  }

  const copy = () => { navigator.clipboard.writeText(preview); setCopied(true); setTimeout(()=>setCopied(false),2000) }

  const activeWaNumber = waNumbers.find(w => w.n === waAccount)?.number || ''

  return (
    <div>
      {confirmDelete && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,maxWidth:320,width:'100%'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:8}}>Delete template?</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}>{confirmDelete.label}</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-full" style={{background:'var(--danger)',color:'#fff',border:'none'}} onClick={delCustom}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* WA account selector */}
      {waNumbers.length > 0 && (
        <div className="card mb-12" style={{padding:'12px 16px'}}>
          <div style={{fontSize:11.5,fontWeight:600,color:'var(--text2)',marginBottom:8,textTransform:'uppercase',letterSpacing:'.4px'}}>Send from WhatsApp account</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {waNumbers.map(w=>(
              <button key={w.n} onClick={()=>setWaAccount(w.n)} style={{padding:'6px 12px',borderRadius:20,border:'2px solid',fontSize:12,fontWeight:600,cursor:'pointer',background:waAccount===w.n?'#25D366':'#fff',borderColor:waAccount===w.n?'#25D366':'var(--border)',color:waAccount===w.n?'#fff':'var(--text2)'}}>
                <MessageCircle size={11} style={{marginRight:4,display:'inline'}}/>{w.name} · {w.number.slice(-4)}
              </button>
            ))}
          </div>
          {waNumbers.length === 0 && <div style={{fontSize:12,color:'var(--text3)'}}>No WA numbers saved. Go to Settings → add WhatsApp Business accounts.</div>}
        </div>
      )}
      {waNumbers.length === 0 && (
        <div style={{background:'var(--warning-bg)',border:'1px solid #FDE68A',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:12.5,color:'var(--warning)'}}>
          ⚠ No WhatsApp numbers saved. Go to <strong>Settings → WhatsApp Business accounts</strong> to add up to 3 numbers.
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" style={{marginBottom:12}}>
        <button className={`tab-btn ${tab==='builtin'?'active':''}`} onClick={()=>setTab('builtin')}>Built-in templates</button>
        <button className={`tab-btn ${tab==='custom'?'active':''}`} onClick={()=>setTab('custom')}>My templates ({customTpls.length})</button>
      </div>

      {/* Built-in templates */}
      {tab === 'builtin' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
          {BUILT_IN.map(t=>(
            <div key={t.key} onClick={()=>selectBuiltin(t)} style={{background:active?.key===t.key?'var(--info-bg)':'#fff',border:`2px solid ${active?.key===t.key?'var(--navy)':'var(--border)'}`,borderRadius:10,padding:'12px 14px',cursor:'pointer'}}>
              <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
              <div style={{fontWeight:700,fontSize:12.5,color:active?.key===t.key?'var(--navy)':'var(--text)'}}>{t.label}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{t.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Custom templates */}
      {tab === 'custom' && (
        <div>
          {!addingCustom && (
            <button className="btn btn-primary btn-full mb-12" style={{padding:11}} onClick={()=>{setAddingCustom(true);setEditCustom(null);setCustomForm({label:'',icon:'💬',body:''})}}>
              <Plus size={15}/> Add custom template
            </button>
          )}
          {addingCustom && (
            <div className="card mb-12">
              <div className="card-header">{editCustom?'Edit template':'New custom template'}</div>
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group" style={{maxWidth:70}}>
                    <label className="form-label">Icon</label>
                    <input className="form-input" value={customForm.icon} onChange={e=>setCustomForm(f=>({...f,icon:e.target.value}))} style={{textAlign:'center',fontSize:18}}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Template name</label>
                    <input className="form-input" placeholder="e.g. Appointment reminder" value={customForm.label} onChange={e=>setCustomForm(f=>({...f,label:e.target.value}))}/>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Message body (Bengali or English)</label>
                  <textarea className="form-input" rows={6} placeholder="Write your template message here..." value={customForm.body} onChange={e=>setCustomForm(f=>({...f,body:e.target.value}))} style={{resize:'vertical'}}/>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button className="btn btn-full" onClick={()=>{setAddingCustom(false);setEditCustom(null)}}>Cancel</button>
                  <button className="btn btn-primary btn-full" onClick={saveCustom} disabled={savingCustom}>{savingCustom?'Saving...':'Save template'}</button>
                </div>
              </div>
            </div>
          )}
          <div className="card">
            {customTpls.length === 0 && <div style={{padding:24,textAlign:'center',color:'var(--text3)',fontSize:13}}>No custom templates yet. Add your own Bengali messages above.</div>}
            {customTpls.map(t=>(
              <div key={t.id} style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}} onClick={()=>selectCustom(t)}>
                <div style={{fontSize:20,flexShrink:0}}>{t.icon||'💬'}</div>
                <div style={{flex:1,minWidth:0,cursor:'pointer'}}>
                  <div style={{fontWeight:600,fontSize:13}}>{t.label}</div>
                  <div style={{fontSize:11.5,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.body?.slice(0,60)}...</div>
                </div>
                <button onClick={e=>{e.stopPropagation();openEditCustom(t)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--navy)',padding:4}}><Edit2 size={13}/></button>
                <button onClick={e=>{e.stopPropagation();setConfirmDelete(t)}} style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',padding:4}}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template builder — shows when any template is selected */}
      {active && (
        <div className="card" style={{marginTop:16}}>
          <div className="card-header">{active.icon} {active.label}</div>
          <div className="card-body">
            {!active.isCustom && (
              <>
                <div className="form-group">
                  <label className="form-label">Quick fill from case (optional)</label>
                  <select className="form-select" value={selectedCase} onChange={e=>fillFromCase(e.target.value)}>
                    <option value="">— Select a case —</option>
                    {cases.map(c=><option key={c.id} value={c.id}>{c.client_name} · {c.case_id}</option>)}
                  </select>
                </div>
                {active.inputs.map(k=>(
                  <div key={k} className="form-group">
                    <label className="form-label">{INPUT_LABELS[k]||k}</label>
                    <input className="form-input" value={inputs[k]||''} onChange={e=>setInputs(p=>({...p,[k]:e.target.value}))} placeholder={INPUT_LABELS[k]}/>
                  </div>
                ))}
              </>
            )}
            <div className="form-group">
              <label className="form-label">Client WhatsApp number</label>
              <input className="form-input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+880 1XXXXXXXXX"/>
            </div>
            {!active.isCustom && (
              <button className="btn btn-primary btn-full" style={{marginBottom:10}} onClick={generate}>Generate message</button>
            )}
            {preview && (
              <div>
                <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:12,fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap',marginBottom:10}}>{preview}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button className="btn btn-full" onClick={copy} style={{color:copied?'var(--success)':'var(--text)'}}>
                    {copied?<><CheckCircle size={14}/> Copied!</>:<><Copy size={14}/> Copy</>}
                  </button>
                  <a href={buildWhatsAppLink(phone || activeWaNumber, preview)} target="_blank" rel="noreferrer" className="btn btn-wa btn-full" style={{justifyContent:'center'}}>
                    <MessageCircle size={14}/> Open WhatsApp
                  </a>
                </div>
                {waNumbers.length > 1 && (
                  <div style={{fontSize:11.5,color:'var(--text3)',marginTop:8,textAlign:'center'}}>
                    Sending from: {waNumbers.find(w=>w.n===waAccount)?.name} ({waNumbers.find(w=>w.n===waAccount)?.number})
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
