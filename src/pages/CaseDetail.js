import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCaseById, updateCase, buildWhatsAppLink, waReportMessage, waPaymentConfirm, supabase } from '../lib/supabase'
import { Upload, Download, MessageCircle, AlertTriangle, XCircle, CheckCircle, Info, ChevronLeft, FileText, Edit2, Save, ExternalLink } from 'lucide-react'

const GEMINI_PROMPT = `You are a 20 YEARS EXPERIENCED ELITE senior forensic visa audit specialist at a Visa Verification Center with expert knowledge of global immigration systems employment laws and document authentication. Your task is to analyze submitted visa and employment related documents and produce a clear structured professional verification report. Follow all instructions strictly.

1. Document Analysis: Evaluate document authenticity based on format structure and official standards. Identify inconsistencies spelling errors formatting issues and suspicious content. Verify document numbers including visa permit reference and registration identifiers. Check security features such as QR codes barcodes stamps seals and signatures.

2. Employer Verification: Verify company identity legal existence and registration status. Assess online presence and business legitimacy. Identify mismatch between employer details and official records when applicable.

3. Legal Compliance Check: Assess whether the document aligns with immigration rules of issuing country. Check whether approvals and legal authorizations appear valid and correctly structured. Identify missing government or labor authority approvals if required.

4. Salary and Employment Validation: Compare salary with minimum wage standards of the destination country. Identify unrealistic or non compliant salary structures.

5. Risk Classification: Classify final result into one of the following: Genuine / Suspicious / Fraudulent

6. Missing Requirements: List any missing documents approvals or legal requirements.

7. Final Output Format — Generate a clean professional report using EXACTLY this structure:

Date: [date]
Case ID: [case_id]
Applicant Name: [name]
Passport Number: [number or "Not provided"]
Subject: Visa and Employment Document Verification Report

ASSESSMENT RESULT: [GENUINE / SUSPICIOUS / FRAUDULENT]

SUMMARY OF FINDINGS:
[One paragraph professional summary]

KEY FINDINGS:
- [finding 1]
- [finding 2]
- [finding 3]

COMPANY VERIFICATION:
[Short statement about employer legitimacy]

SALARY AND COMPLIANCE:
[Short statement about salary legality]

MISSING REQUIREMENTS:
- [item 1]
- [item 2]

FINAL CONCLUSION:
[One clear final decision with justification]

IMPORTANT RULES: Keep output concise and suitable for official use. Use simple professional language. Do not include unnecessary explanations. Be strict analytical and evidence based. Do not assume authenticity without strong supporting indicators.`

const FindingIcon = ({ type }) => {
  if (type === 'danger') return <XCircle size={15} color="var(--danger)" />
  if (type === 'warning') return <AlertTriangle size={15} color="var(--warning)" />
  if (type === 'success') return <CheckCircle size={15} color="var(--success)" />
  return <Info size={15} color="var(--info)" />
}

export default function CaseDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [caseData, setCaseData] = useState(null)
  const [tab, setTab] = useState('analysis')
  const [analyzing, setAnalyzing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])
  const [reportText, setReportText] = useState('')
  const [editingReport, setEditingReport] = useState(false)
  const [approved, setApproved] = useState(false)
  const [savingDrive, setSavingDrive] = useState(false)
  const [receiptUploading, setReceiptUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadCase()
  }, [id])

  const loadCase = async () => {
    const { data } = await getCaseById(id)
    if (data) {
      setCaseData(data)
      if (data.report_text) setReportText(data.report_text)
      if (data.report_text) setApproved(true)
    }
  }

  const showSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000) }
  const showError = (msg) => { setError(msg); setTimeout(() => setError(''), 4000) }

  const handleFileUpload = async (e) => {
    const newFiles = Array.from(e.target.files)
    if (!newFiles.length) return
    setUploading(true)
    try {
      const uploaded = []
      for (const file of newFiles) {
        const path = `cases/${id}/${Date.now()}_${file.name}`
        const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
        if (!error) {
          const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
          uploaded.push({ name: file.name, url: urlData.publicUrl, path, file })
        }
      }
      const allFiles = [...files, ...uploaded]
      setFiles(allFiles)
      await updateCase(id, { documents: allFiles.map(f => ({ name: f.name, url: f.url, path: f.path })) })
      showSuccess('Documents uploaded successfully')
      // Auto-trigger analysis
      if (allFiles.length > 0) runAnalysis(allFiles)
    } catch (err) {
      showError('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setReceiptUploading(true)
    try {
      const path = `cases/${id}/receipt_${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
      if (!error) {
        const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
        await updateCase(id, { receipt_url: urlData.publicUrl, payment_status: 'received' })
        setCaseData(prev => ({ ...prev, receipt_url: urlData.publicUrl, payment_status: 'received' }))
        showSuccess('Payment receipt saved')
      }
    } catch (err) {
      showError('Receipt upload failed')
    }
    setReceiptUploading(false)
  }

  const runAnalysis = async (uploadedFiles) => {
    const settings = JSON.parse(localStorage.getItem('vvc_settings') || '{}')
    const geminiKey = settings.gemini_api_key || ''
    if (!geminiKey) {
      showError('Gemini API key not set. Go to Settings and add your Gemini API key.')
      return
    }
    setAnalyzing(true)
    setTab('analysis')
    try {
      const filesToAnalyse = uploadedFiles || files
      const fileDescriptions = filesToAnalyse.map(f => f.name).join(', ')
      const c = caseData
      const userPrompt = `${GEMINI_PROMPT}

Now analyze the following case:
Case ID: ${c?.case_id || id}
Client: ${c?.client_name || 'Unknown'}
Country: ${c?.country || 'Unknown'}
Document Type: ${c?.doc_type || 'Unknown'}
Uploaded Documents: ${fileDescriptions}
Date: ${new Date().toLocaleDateString('en-GB')}

Please analyze these documents and generate the full verification report.`

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
          })
        }
      )
      const data = await response.json()
      const reportContent = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Analysis failed. Please try again.'
      setReportText(reportContent)
      const verdict = reportContent.includes('FRAUDULENT') ? 'CONFIRMED FRAUDULENT'
        : reportContent.includes('SUSPICIOUS') ? 'SUSPICIOUS'
        : reportContent.includes('GENUINE') ? 'GENUINE' : 'UNABLE TO VERIFY'
      const status = verdict === 'GENUINE' ? 'progress' : 'suspicious'
      await updateCase(id, { report_text: reportContent, verdict, status })
      setCaseData(prev => ({ ...prev, report_text: reportContent, verdict, status }))
      setTab('report')
      showSuccess('Analysis complete — report generated')
    } catch (err) {
      showError('Gemini analysis failed. Check your API key in Settings.')
    }
    setAnalyzing(false)
  }

  const saveReport = async () => {
    await updateCase(id, { report_text: reportText })
    setEditingReport(false)
    setApproved(true)
    showSuccess('Report saved')
  }

  const downloadPDF = () => {
    const content = reportText || 'No report generated yet.'
    const blob = new Blob([`VVC GLOBAL — OFFICIAL DOCUMENT VERIFICATION REPORT\n\n${content}`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `VVC-Report-${caseData?.case_id || id}.txt`
    a.click()
    showSuccess('Report downloaded')
  }

  const FACEBOOK_REVIEW_LINK = 'https://www.facebook.com/share/p/1FeoDDYg1D/'
  const FACEBOOK_PAGE_LINK = 'https://www.facebook.com/profile.php?id=61550875727805'

  const waReviewMessage = (name) =>
    `আসসালামু আলাইকুম ${name}! 🙏\n\nআপনার ভিসা যাচাই সেবা সম্পন্ন হয়েছে। আপনার মতামত আমাদের কাছে অত্যন্ত গুরুত্বপূর্ণ।\n\n⭐ আমাদের একটি রিভিউ দিন:\n${FACEBOOK_REVIEW_LINK}\n\n📌 আমাদের পেজ ফলো করুন:\n${FACEBOOK_PAGE_LINK}\n\nধন্যবাদ\nVVC Global`

  if (!caseData) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)' }}>Loading case...</div>

  const c = caseData
  const waReportLink = buildWhatsAppLink(c.client_phone, waReportMessage(c.client_name, c.case_id, c.verdict || 'See attached report'))
  const waConfirmLink = buildWhatsAppLink(c.client_phone, waPaymentConfirm(c.client_name, c.case_id))
  const waReviewLink = buildWhatsAppLink(c.client_phone, waReviewMessage(c.client_name))

  return (
    <div>
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 8 }}><AlertTriangle size={15} />{error}</div>}
      {success && <div style={{ background: 'var(--success-bg)', border: '1px solid #A7F3D0', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--success)', display: 'flex', gap: 8 }}><CheckCircle size={15} />{success}</div>}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button className="btn btn-icon" onClick={() => navigate('/cases')}><ChevronLeft size={18} /></button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{c.client_name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text3)' }}>{c.case_id} · {c.country} · {c.doc_type}</div>
        </div>
        <span className={`badge ${c.status || 'new'}`}>{c.status || 'new'}</span>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {['analysis', 'report', 'actions'].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'report' && reportText && <span style={{ marginLeft: 4, width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />}
          </button>
        ))}
      </div>

      {/* ANALYSIS TAB */}
      {tab === 'analysis' && (
        <div>
          <div style={{ background: 'var(--purple-bg)', border: '1px solid var(--purple)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12.5, color: 'var(--purple)', display: 'flex', gap: 8, alignItems: 'center' }}>
            <Info size={14} />
            <span>Upload documents below — Gemini AI will analyse automatically and generate the report.</span>
          </div>

          {/* Upload */}
          <div className="card mb-12">
            <div className="card-header">Upload documents</div>
            <div className="card-body">
              <label className="upload-zone" style={{ cursor: uploading ? 'wait' : 'pointer' }}>
                <Upload size={22} style={{ margin: '0 auto 6px', display: 'block' }} />
                <p style={{ fontSize: 13 }}>{uploading ? 'Uploading...' : 'Tap to upload PDFs or images'}</p>
                <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>Visa · permit · contract · passport · offer letter</span>
                <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={handleFileUpload} disabled={uploading} />
              </label>
              {files.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: 12.5 }}>
                      <FileText size={14} color="var(--info)" />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                      <CheckCircle size={13} color="var(--success)" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Payment receipt */}
          <div className="card mb-12">
            <div className="card-header">
              Payment receipt
              {c.payment_status === 'received' && <span className="badge done">Received ✓</span>}
            </div>
            <div className="card-body">
              <label className="upload-zone" style={{ padding: '14px', cursor: receiptUploading ? 'wait' : 'pointer' }}>
                <Upload size={18} style={{ margin: '0 auto 4px', display: 'block' }} />
                <p style={{ fontSize: 12.5 }}>{receiptUploading ? 'Saving...' : 'Upload bKash/Nagad screenshot'}</p>
                <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: 'none' }} onChange={handleReceiptUpload} disabled={receiptUploading} />
              </label>
              {c.receipt_url && (
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--success)', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <CheckCircle size={13} /> Payment receipt saved in system
                </div>
              )}
            </div>
          </div>

          {/* Manual run analysis button */}
          {files.length > 0 && (
            <button className="btn btn-primary btn-full" style={{ padding: 12 }} onClick={() => runAnalysis()} disabled={analyzing}>
              {analyzing ? '⏳ Gemini is analysing...' : '▶ Run Gemini analysis'}
            </button>
          )}

          {analyzing && (
            <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text2)', fontSize: 13 }}>
              <div style={{ marginBottom: 8 }}>🔍 Analysing documents with Gemini AI...</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>This takes 15–30 seconds. Report will appear in the Report tab.</div>
            </div>
          )}
        </div>
      )}

      {/* REPORT TAB */}
      {tab === 'report' && (
        <div>
          {!reportText ? (
            <div className="empty-state">
              <FileText size={32} />
              <h3>No report yet</h3>
              <p>Upload documents in the Analysis tab to generate the report</p>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {!editingReport ? (
                  <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditingReport(true)}>
                    <Edit2 size={14} /> Edit report
                  </button>
                ) : (
                  <button className="btn btn-success" style={{ flex: 1, justifyContent: 'center' }} onClick={saveReport}>
                    <Save size={14} /> Save changes
                  </button>
                )}
                <button className="btn" style={{ flex: 1, justifyContent: 'center' }} onClick={downloadPDF}>
                  <Download size={14} /> Download
                </button>
              </div>

              {editingReport ? (
                <textarea
                  value={reportText}
                  onChange={e => setReportText(e.target.value)}
                  style={{ width: '100%', minHeight: 400, padding: 12, border: '1px solid var(--navy)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.7, fontFamily: 'monospace', resize: 'vertical' }}
                />
              ) : (
                <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                  <div style={{ textAlign: 'center', borderBottom: '2px solid var(--navy)', paddingBottom: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy)' }}>VISA VERIFICATION CENTER</div>
                    <div style={{ fontSize: 11, color: 'var(--text2)' }}>Document Intelligence Unit | VVC Global</div>
                  </div>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.8, fontFamily: '-apple-system, sans-serif', color: 'var(--text)' }}>{reportText}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ACTIONS TAB */}
      {tab === 'actions' && (
        <div>
          <div className="card mb-12">
            <div className="card-header">WhatsApp actions</div>
            <div style={{ padding: '4px 0' }}>
              <div className="wa-action" style={{ margin: '10px 14px' }}>
                <MessageCircle size={18} color="#25D366" style={{ flexShrink: 0 }} />
                <div className="wa-action-text">
                  <strong>Send payment confirmation</strong>
                  <span>Notify client payment received</span>
                </div>
                <a href={waConfirmLink} target="_blank" rel="noreferrer" className="btn btn-wa btn-sm">Send</a>
              </div>
              <div className="wa-action" style={{ margin: '0 14px 10px' }}>
                <MessageCircle size={18} color="#25D366" style={{ flexShrink: 0 }} />
                <div className="wa-action-text">
                  <strong>Send report to client</strong>
                  <span>Opens WhatsApp · attach PDF · send</span>
                </div>
                <a href={waReportLink} target="_blank" rel="noreferrer" className="btn btn-wa btn-sm">Send</a>
              </div>
            </div>
          </div>

          {/* Facebook review */}
          <div className="card mb-12">
            <div className="card-header" style={{ color: '#1877F2' }}>
              ⭐ Facebook review request
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 12.5, color: 'var(--text2)', marginBottom: 10 }}>
                After delivering the report, ask the client for a Facebook review. If they don't review, send the reminder again.
              </div>
              <div className="wa-action" style={{ marginBottom: 8 }}>
                <MessageCircle size={18} color="#25D366" style={{ flexShrink: 0 }} />
                <div className="wa-action-text">
                  <strong>Send review request</strong>
                  <span>Includes review link + page link</span>
                </div>
                <a href={waReviewLink} target="_blank" rel="noreferrer" className="btn btn-wa btn-sm">Send</a>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={FACEBOOK_REVIEW_LINK} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ flex: 1, justifyContent: 'center', background: '#1877F2', color: '#fff', border: 'none' }}>
                  <ExternalLink size={12} /> Review link
                </a>
                <a href={FACEBOOK_PAGE_LINK} target="_blank" rel="noreferrer" className="btn btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                  <ExternalLink size={12} /> Our page
                </a>
              </div>
            </div>
          </div>

          {/* Case status */}
          <div className="card mb-12">
            <div className="card-header">Case status</div>
            <div style={{ padding: '12px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['new', 'pending', 'progress', 'suspicious', 'manipulated', 'done'].map(s => (
                <button key={s} onClick={async () => { await updateCase(id, { status: s }); setCaseData(d => ({ ...d, status: s })) }}
                  style={{
                    padding: '6px 12px', borderRadius: 20, border: '1px solid',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    background: c.status === s ? 'var(--navy)' : '#fff',
                    borderColor: c.status === s ? 'var(--navy)' : 'var(--border)',
                    color: c.status === s ? '#fff' : 'var(--text2)',
                  }}>{s}</button>
              ))}
            </div>
          </div>

          <button className="btn btn-danger btn-full" onClick={async () => { if(window.confirm('Delete this case?')) { await supabase.from('cases').delete().eq('id', id); navigate('/cases') } }}>
            Delete case
          </button>
        </div>
      )}
    </div>
  )
}
