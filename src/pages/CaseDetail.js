import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCaseById, updateCase, buildWhatsAppLink, waReportMessage, waPaymentConfirm, supabase } from '../lib/supabase'
import { Download, MessageCircle, CheckCircle, Info, ChevronLeft, FileText, Edit2, Save, AlertTriangle, Upload } from 'lucide-react'

const statusLabel = { pending:'Awaiting docs', progress:'In review', suspicious:'Suspicious', manipulated:'Manipulated', done:'Delivered', new:'New' }
const STATUS_OPTIONS = ['new','pending','progress','suspicious','manipulated','done']

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])
  const [receiptUploading, setReceiptUploading] = useState(false)
  const [reportText, setReportText] = useState('')
  const [editingReport, setEditingReport] = useState(false)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [sentLog, setSentLog] = useState({})
  const [editingCase, setEditingCase] = useState(false)
  const [editData, setEditData] = useState({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadCase()
    const saved = localStorage.getItem('sentLog_'+id)
    if (saved) setSentLog(JSON.parse(saved))
  }, [id])

  const loadCase = async () => {
    const { data } = await getCaseById(id)
    if (data) {
      setCaseData(data)
      if (data.report_text) setReportText(data.report_text)
      if (data.notes) setNotes(data.notes)
      setEditData({ client_name:data.client_name, client_phone:data.client_phone||'', client_email:data.client_email||'', country:data.country, doc_type:data.doc_type, amount:data.amount, status:data.status||'new', verdict:data.verdict||'' })
    }
  }

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(()=>setSuccess(''),3000) }
  const showError = (msg) => { setError(msg); setTimeout(()=>setError(''),4000) }

  // ── File upload ──
  const handleFileUpload = async (e) => {
    const uploadedFiles = Array.from(e.target.files)
    if (!uploadedFiles.length) return
    setUploading(true)
    const newFiles = uploadedFiles.map(f => ({ name:f.name, size:f.size, type:f.type }))
    setFiles(prev => [...prev, ...newFiles])
    setUploading(false)
    showSuccess(`${uploadedFiles.length} file(s) added`)
  }

  // ── Receipt upload ──
  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setReceiptUploading(true)
    await updateCase(id, { payment_status:'received' })
    await loadCase()
    setReceiptUploading(false)
    showSuccess('Payment receipt saved')
  }

  // ── Save report ──
  const saveReport = async () => {
    setSaving(true)
    await updateCase(id, { report_text: reportText, verdict: editData.verdict })
    await loadCase()
    setEditingReport(false)
    setSaving(false)
    showSuccess('Report saved')
  }

  // ── Save notes ──
  const saveNotes = async () => {
    setSavingNotes(true)
    await updateCase(id, { notes })
    setSavingNotes(false)
    showSuccess('Notes saved')
  }

  // ── Save case edits ──
  const saveEditCase = async () => {
    await updateCase(id, editData)
    await loadCase()
    setEditingCase(false)
    showSuccess('Case updated')
  }

  // ── Mark sent ──
  const markSent = (action) => {
    const updated = { ...sentLog, [action]: new Date().toLocaleString('en-GB') }
    setSentLog(updated)
    localStorage.setItem('sentLog_'+id, JSON.stringify(updated))
    supabase.from('comms_log').insert([{
      case_id: id, client_name: caseData?.client_name, client_phone: caseData?.client_phone,
      channel:'WhatsApp', direction:'outbound', outcome:'Sent', notes:action,
      date: new Date().toISOString(), created_at: new Date().toISOString()
    }])
    showSuccess('Marked as sent ✓')
  }

  // ── Download PDF ──
  const downloadPDF = async () => {
    if (!reportText) { showError('No report to download yet.'); return }
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' })
    const W = 210, pad = 18
    doc.setFillColor(15,76,129); doc.rect(0,0,W,40,'F')
    doc.setTextColor(255,255,255); doc.setFontSize(16); doc.setFont('helvetica','bold')
    doc.text('VISA VERIFICATION CENTER — VVC GLOBAL', pad, 15)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.text('Document Intelligence Unit | Consumer Protection Advisory', pad, 22)
    doc.text('Dhaka, Bangladesh  |  vvcbd2026@gmail.com', pad, 29)
    doc.text(`Case ID: ${caseData?.case_id||''}  |  Date: ${new Date().toLocaleDateString('en-GB')}`, pad, 36)
    doc.setDrawColor(212,175,55); doc.setLineWidth(1); doc.line(0,40,W,40)
    doc.setFillColor(248,250,252); doc.rect(pad,45,W-pad*2,22,'F')
    doc.setTextColor(40,40,40); doc.setFontSize(9); doc.setFont('helvetica','bold')
    doc.text('CLIENT:', pad+3, 53); doc.text('COUNTRY:', pad+3, 60)
    doc.setFont('helvetica','normal')
    doc.text(caseData?.client_name||'—', pad+22, 53)
    doc.text(`${caseData?.country||'—'}  |  ${caseData?.doc_type||'—'}`, pad+22, 60)
    doc.setFontSize(9.5); doc.setFont('helvetica','normal'); doc.setTextColor(30,30,30)
    const lines = doc.splitTextToSize(reportText, W-pad*2)
    let y = 74
    lines.forEach(line => {
      if (y > 268) { doc.addPage(); y = 20 }
      doc.text(line, pad, y); y += 5.5
    })
    const pages = doc.getNumberOfPages()
    for (let i=1;i<=pages;i++) {
      doc.setPage(i); doc.setFillColor(15,76,129); doc.rect(0,282,W,15,'F')
      doc.setTextColor(255,255,255); doc.setFontSize(7.5)
      doc.text('CONFIDENTIAL — VVC Global, Document Intelligence Unit', pad, 288)
      doc.text(`Page ${i} of ${pages}`, W-pad, 293, {align:'right'})
    }
    doc.save(`VVC-Report-${caseData?.case_id||id}.pdf`)
    showSuccess('PDF downloaded')
  }

  if (!caseData) return <div style={{padding:20,textAlign:'center',color:'var(--text3)'}}>Loading case...</div>
  const c = caseData
  const waReportLink = buildWhatsAppLink(c.client_phone, waReportMessage(c.client_name, c.case_id, c.verdict||'See attached report'))
  const waConfirmLink = buildWhatsAppLink(c.client_phone, waPaymentConfirm(c.client_name, c.case_id))
  const waReviewMsg = `আসসালামু আলাইকুম ${c.client_name}! 🙏\n\nআশা করি আমাদের ডকুমেন্ট যাচাই সেবা আপনার কাজে এসেছে।\n\nআপনার একটি রিভিউ আমাদের অনেক সাহায্য করবে। 🌟\n\n👉 https://www.facebook.com/VisaVerificationCenter\n\nধন্যবাদ\nVVC Global`
  const waReviewLink = buildWhatsAppLink(c.client_phone, waReviewMsg)
  const waTranslatorLink = buildWhatsAppLink(c.client_phone, `আসসালামু আলাইকুম ${c.client_name}! 🙏\n\nআপনার VVC রিপোর্টটি বাংলায় পড়তে Google Translate ব্যবহার করুন:\n\n👉 https://play.google.com/store/apps/details?id=com.google.android.apps.translate\n\nঅ্যাপ ওপেন করে Documents অপশন সিলেক্ট করুন → PDF আপলোড করুন → English থেকে Bangla তে অনুবাদ করুন।\n\nধন্যবাদ\nVVC Global`)
  const waAdvisoryLink = buildWhatsAppLink(c.client_phone, `আসসালামু আলাইকুম ${c.client_name}! 🙏\n\nআপনার জন্য VVC Global-এর ক্লায়েন্ট সুরক্ষা নির্দেশিকা পাঠানো হলো।\n\nঅনুগ্রহ করে সংযুক্ত PDF ফাইলটি ডাউনলোড করুন এবং বিস্তারিত পড়ুন।\n\nধন্যবাদ\nVVC Global — Document Intelligence Unit`)

  const WA_ACTIONS = [
    { key:'payment_confirm', label:'Payment confirmation', sub:'Notify client payment received', link:waConfirmLink },
    { key:'report_sent', label:'Send report', sub:'Open WhatsApp → attach PDF → send', link:waReportLink },
    { key:'translator', label:'Send translator guide', sub:'How to read report in Bengali', link:waTranslatorLink },
    { key:'advisory', label:'Send client advisory', sub:'Client protection guidelines', link:waAdvisoryLink },
    { key:'review', label:'Request review', sub:'Ask for Facebook review', link:waReviewLink },
  ]

  return (
    <div>
      {error && <div style={{background:'#FEE2E2',border:'1px solid #FECACA',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#DC2626',display:'flex',gap:8}}><AlertTriangle size={15}/>{error}</div>}
      {success && <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'10px 14px',marginBottom:12,fontSize:13,color:'var(--success)',display:'flex',gap:8}}><CheckCircle size={15}/>{success}</div>}

      {/* Case header */}
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'}}>
        <button className="btn btn-icon" onClick={()=>navigate('/cases')}><ChevronLeft size={18}/></button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:15}}>{c.client_name}</div>
          <div style={{fontSize:12,color:'var(--text3)'}}>{c.case_id} · {c.country} · {c.doc_type}</div>
        </div>
        <select value={editData.status||c.status||'new'} onChange={async e=>{setEditData(d=>({...d,status:e.target.value}));await updateCase(id,{status:e.target.value});showSuccess('Status updated')}}
          style={{fontSize:12,fontWeight:600,padding:'5px 10px',borderRadius:20,border:'2px solid var(--navy)',color:'var(--navy)',cursor:'pointer',background:'#fff'}}>
          {STATUS_OPTIONS.map(s=><option key={s} value={s}>{statusLabel[s]||s}</option>)}
        </select>
        <button className="btn btn-sm" onClick={()=>setEditingCase(true)} style={{flexShrink:0}}><Edit2 size={13}/> Edit</button>
      </div>

      {/* Edit case modal */}
      {editingCase && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
          <div style={{background:'#fff',borderRadius:12,padding:24,maxWidth:380,width:'100%'}}>
            <div style={{fontWeight:700,fontSize:15,marginBottom:16}}>Edit Case</div>
            {[{k:'client_name',l:'Client name'},{k:'client_phone',l:'Phone'},{k:'client_email',l:'Email'},{k:'country',l:'Country'},{k:'doc_type',l:'Document type'},{k:'amount',l:'Amount (৳)'},{k:'verdict',l:'Verdict'}].map(({k,l})=>(
              <div key={k} className="form-group"><label className="form-label">{l}</label>
                <input className="form-input" value={editData[k]||''} onChange={e=>setEditData(d=>({...d,[k]:e.target.value}))}/>
              </div>
            ))}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <button className="btn btn-full" onClick={()=>setEditingCase(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={saveEditCase}>Save</button>
            </div>
          </div>
        </div>
      )}



      {/* ── SECTION 2: Payment receipt ── */}
      <div className="card mb-12">
        <div className="card-header">
          💳 Step 1 — Payment receipt
          {c.payment_status==='received' && <span className="badge done">Received ✓</span>}
        </div>
        <div className="card-body">
          <label className="upload-zone" style={{cursor:receiptUploading?'wait':'pointer'}}>
            <Upload size={18} style={{margin:'0 auto 4px',display:'block'}}/>
            <p style={{fontSize:12.5}}>{receiptUploading?'Saving...':'Upload bKash/Nagad screenshot'}</p>
            <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{display:'none'}} onChange={handleReceiptUpload} disabled={receiptUploading}/>
          </label>
          {c.payment_status==='received' && <div style={{marginTop:8,fontSize:12,color:'var(--success)',display:'flex',gap:6,alignItems:'center'}}><CheckCircle size={13}/>Payment receipt saved</div>}
        </div>
      </div>

      {/* ── SECTION 3: Report ── */}
      <div className="card mb-12">
        <div className="card-header"><FileText size={14}/> Step 2 — VVC Report</div>
        <div className="card-body">
          {!reportText && !editingReport ? (
            <div>
              <div style={{fontSize:12.5,color:'var(--text2)',marginBottom:10}}>Paste or type the VVC report here after completing your analysis.</div>
              <button className="btn btn-primary btn-full" onClick={()=>setEditingReport(true)}>+ Add report</button>
            </div>
          ) : (
            <div>
              {editingReport ? (
                <div>
                  <textarea value={reportText} onChange={e=>setReportText(e.target.value)}
                    style={{width:'100%',minHeight:300,padding:12,border:'1px solid var(--navy)',borderRadius:8,fontSize:12.5,lineHeight:1.7,fontFamily:'monospace',resize:'vertical',marginBottom:10}}
                    placeholder="Paste your VVC report here..."/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <button className="btn btn-full" onClick={()=>setEditingReport(false)}>Cancel</button>
                    <button className="btn btn-primary btn-full" onClick={saveReport} disabled={saving}>{saving?'Saving...':'Save report'}</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
                    <button className="btn btn-full" onClick={()=>setEditingReport(true)}><Edit2 size={13}/> Edit report</button>
                    <button className="btn btn-primary btn-full" onClick={downloadPDF}><Download size={13}/> Download PDF</button>
                  </div>
                  <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:8,padding:'10px 14px',fontSize:12.5,color:'var(--success)',marginBottom:10}}>
                    ✅ Report saved · Download PDF → Go to Actions → Send to client via WhatsApp
                  </div>
                  <div style={{background:'#fff',border:'1px solid var(--border)',borderRadius:8,padding:14,maxHeight:200,overflow:'auto'}}>
                    <pre style={{whiteSpace:'pre-wrap',fontSize:11.5,lineHeight:1.7,fontFamily:'-apple-system,sans-serif',color:'var(--text)',margin:0}}>{reportText.slice(0,500)}{reportText.length>500?'...':''}</pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 4: Notes ── */}
      <div className="card mb-12">
        <div className="card-header">📝 Step 3 — Notes & advice for client</div>
        <div className="card-body">
          <textarea value={notes} onChange={e=>setNotes(e.target.value)}
            placeholder="Write your advice, observations, or notes about this case..."
            style={{width:'100%',minHeight:120,padding:12,border:'1px solid var(--border)',borderRadius:8,fontSize:13,lineHeight:1.7,resize:'vertical',fontFamily:'-apple-system,sans-serif'}}/>
          <button className="btn btn-primary btn-full" style={{marginTop:8}} onClick={saveNotes} disabled={savingNotes}>
            {savingNotes?'Saving...':'Save notes'}
          </button>
        </div>
      </div>

      {/* ── SECTION 5: WhatsApp Actions ── */}
      <div className="card mb-12">
        <div className="card-header">📱 Step 4 — Send to client via WhatsApp</div>
        <div style={{background:'var(--surface2)',padding:'8px 14px',fontSize:12,color:'var(--text2)'}}>
          Click <strong>Send</strong> → WhatsApp opens → attach file if needed → send → come back → tap <strong>✓ Sent</strong>
        </div>
        {WA_ACTIONS.map(action=>(
          <div key={action.key} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderTop:'1px solid var(--border)'}}>
            <MessageCircle size={16} color="#25D366" style={{flexShrink:0}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:600,fontSize:13}}>{action.label}</div>
              <div style={{fontSize:11.5,color:'var(--text3)'}}>{action.sub}</div>
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              {sentLog[action.key] ? (
                <span style={{fontSize:11.5,color:'var(--success)',fontWeight:600,display:'flex',alignItems:'center',gap:4}}><CheckCircle size={13}/>Sent</span>
              ) : (
                <>
                  <a href={action.link} target="_blank" rel="noreferrer" className="btn btn-wa btn-sm">Send</a>
                  <button className="btn btn-sm" style={{fontSize:11,padding:'4px 8px',color:'var(--success)',borderColor:'var(--success)'}} onClick={()=>markSent(action.key)}>✓ Sent</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── SECTION 6: Email Actions ── */}
      <div className="card mb-12">
        <div className="card-header">✉️ Email actions</div>
        <div style={{padding:'10px 14px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:'#EA4335',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <span style={{color:'#fff',fontWeight:700,fontSize:12}}>G</span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:600,fontSize:13}}>Send report via email</div>
            <div style={{fontSize:11.5,color:'var(--text3)'}}>Opens Gmail · attach report · send</div>
          </div>
          <a href={`mailto:${c.client_email||''}?subject=VVC Report — ${c.case_id}&body=Dear ${c.client_name},%0A%0APlease find your document verification report attached.%0A%0ACase ID: ${c.case_id}%0A%0AThank you%0AVVC Global`}
            className="btn btn-sm" style={{background:'#EA4335',color:'#fff',border:'none',flexShrink:0}}>Send</a>
        </div>
        {!c.client_email && <div style={{padding:'0 14px 10px',fontSize:11.5,color:'var(--text3)'}}>No email saved. Click Edit to add client email.</div>}
      </div>

      {/* ── Facebook review ── */}
      <div className="card mb-12">
        <div className="card-header">⭐ Facebook review</div>
        <div style={{padding:'10px 14px',display:'flex',gap:10}}>
          <a href="https://www.facebook.com/VisaVerificationCenter" target="_blank" rel="noreferrer" className="btn btn-full" style={{flex:1,justifyContent:'center'}}>Our page</a>
          <a href={waReviewLink} target="_blank" rel="noreferrer" className="btn btn-wa btn-full" style={{flex:1,justifyContent:'center'}}><MessageCircle size={13}/>Request review</a>
        </div>
      </div>
    </div>
  )
}
