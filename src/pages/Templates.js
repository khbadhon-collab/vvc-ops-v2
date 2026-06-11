import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { WA_TEMPLATES, buildWhatsAppLink } from '../lib/supabase'
import { MessageCircle, Copy, CheckCircle } from 'lucide-react'
import { useEffect } from 'react'

const TEMPLATE_LIST = [
  { key: 'initial_reply', label: 'Initial inquiry reply', desc: 'First response to new enquiry', inputs: ['client'], icon: '👋' },
  { key: 'payment_reminder', label: 'Payment reminder', desc: 'Chase unpaid invoice', inputs: ['client','caseId','amount','method'], icon: '💰' },
  { key: 'report_ready', label: 'Report ready', desc: 'Notify client report is done', inputs: ['client','caseId','verdict'], icon: '✅' },
  { key: 'review_request', label: 'Review request', desc: 'Ask for Facebook review', inputs: ['client'], icon: '⭐' },
  { key: 'follow_up', label: 'Follow-up', desc: 'Chase pending document submission', inputs: ['client','caseId'], icon: '📞' },
  { key: 'fraud_alert', label: 'Fraud alert broadcast', desc: 'Warn about new fraud pattern', inputs: ['country','docType'], icon: '⚠️' },
]

const INPUT_LABELS = { client:'Client name', caseId:'Case ID', amount:'Amount (৳)', method:'Payment method', verdict:'Verdict', country:'Country', docType:'Document type' }

export default function Templates() {
  const [active, setActive] = useState(null)
  const [inputs, setInputs] = useState({})
  const [phone, setPhone] = useState('')
  const [preview, setPreview] = useState('')
  const [copied, setCopied] = useState(false)
  const [cases, setCases] = useState([])
  const [selectedCase, setSelectedCase] = useState('')

  useEffect(() => {
    supabase.from('cases').select('id,client_name,client_phone,case_id,amount,verdict').order('created_at',{ascending:false}).then(({data})=>{ if(data) setCases(data) })
  }, [])

  const select = (t) => {
    setActive(t)
    setCopied(false)
    setPreview('')
    setInputs({})
    setPhone('')
    setSelectedCase('')
  }

  const fillFromCase = (caseId) => {
    const c = cases.find(x=>x.id===caseId)
    if (!c) return
    setSelectedCase(caseId)
    setPhone(c.client_phone||'')
    setInputs(prev=>({
      ...prev,
      client: c.client_name||'',
      caseId: c.case_id||'',
      amount: c.amount||'',
      verdict: c.verdict||'',
    }))
  }

  const generate = () => {
    if (!active) return
    try {
      const fn = WA_TEMPLATES[active.key]
      const args = active.inputs.map(k => inputs[k]||'...')
      const msg = fn(...args)
      setPreview(msg)
    } catch(e) { setPreview('Error generating message') }
  }

  const copy = () => {
    navigator.clipboard.writeText(preview)
    setCopied(true)
    setTimeout(()=>setCopied(false),2000)
  }

  return (
    <div>
      <div style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>
        Pre-written Bengali WhatsApp templates. Select a template, fill in details, then send directly or copy.
      </div>

      {/* Template grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {TEMPLATE_LIST.map(t=>(
          <div key={t.key} onClick={()=>select(t)} style={{background:'#fff',border:`2px solid ${active?.key===t.key?'var(--navy)':'var(--border)'}`,borderRadius:10,padding:'12px 14px',cursor:'pointer',transition:'border-color .15s',background:active?.key===t.key?'var(--info-bg)':'#fff'}}>
            <div style={{fontSize:18,marginBottom:4}}>{t.icon}</div>
            <div style={{fontWeight:700,fontSize:12.5,color:active?.key===t.key?'var(--navy)':'var(--text)'}}>{t.label}</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{t.desc}</div>
          </div>
        ))}
      </div>

      {/* Template builder */}
      {active && (
        <div className="card mb-12">
          <div className="card-header">{active.icon} {active.label}</div>
          <div className="card-body">
            {/* Quick fill from case */}
            <div className="form-group">
              <label className="form-label">Quick fill from case (optional)</label>
              <select className="form-select" value={selectedCase} onChange={e=>fillFromCase(e.target.value)}>
                <option value="">— Select a case —</option>
                {cases.map(c=><option key={c.id} value={c.id}>{c.client_name} · {c.case_id}</option>)}
              </select>
            </div>

            {/* Input fields */}
            {active.inputs.map(k=>(
              <div key={k} className="form-group">
                <label className="form-label">{INPUT_LABELS[k]||k}</label>
                <input className="form-input" value={inputs[k]||''} onChange={e=>setInputs(p=>({...p,[k]:e.target.value}))} placeholder={INPUT_LABELS[k]}/>
              </div>
            ))}

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Client WhatsApp number</label>
              <input className="form-input" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+880 1XXXXXXXXX"/>
            </div>

            <button className="btn btn-primary btn-full" style={{marginBottom:10}} onClick={generate}>
              Generate message
            </button>

            {/* Preview */}
            {preview && (
              <div>
                <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:12,fontSize:13,lineHeight:1.7,whiteSpace:'pre-wrap',marginBottom:10,fontFamily:'inherit'}}>
                  {preview}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  <button className="btn btn-full" onClick={copy} style={{color:copied?'var(--success)':'var(--text)'}}>
                    {copied?<><CheckCircle size={14}/> Copied!</>:<><Copy size={14}/> Copy text</>}
                  </button>
                  <a href={buildWhatsAppLink(phone, preview)} target="_blank" rel="noreferrer" className="btn btn-wa btn-full" style={{justifyContent:'center'}}>
                    <MessageCircle size={14}/> Open WhatsApp
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
