import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCase, createInvoice, buildWhatsAppLink, waInvoiceMessage } from '../lib/supabase'
import { Upload, X, MessageCircle, FileText, CheckCircle, AlertCircle, Edit2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const COUNTRIES = [
  // Middle East & Gulf
  'Bahrain','Iran','Iraq','Israel','Jordan','Kuwait','Lebanon','Oman','Palestine','Qatar','Saudi Arabia','Syria','Turkey','UAE','Yemen',
  // South Asia
  'Afghanistan','Bangladesh','Bhutan','India','Maldives','Nepal','Pakistan','Sri Lanka',
  // Southeast Asia
  'Brunei','Cambodia','Indonesia','Laos','Malaysia','Myanmar','Philippines','Singapore','Thailand','Timor-Leste','Vietnam',
  // East Asia
  'China','Hong Kong','Japan','Macau','Mongolia','North Korea','South Korea','Taiwan',
  // Central Asia & Caucasus
  'Armenia','Azerbaijan','Georgia','Kazakhstan','Kyrgyzstan','Tajikistan','Turkmenistan','Uzbekistan',
  // Europe - Western
  'Andorra','Austria','Belgium','Denmark','Finland','France','Germany','Greece','Iceland','Ireland',
  'Italy','Liechtenstein','Luxembourg','Malta','Monaco','Netherlands','Norway','Portugal','San Marino','Spain','Sweden','Switzerland','UK','Vatican City',
  // Europe - Eastern
  'Albania','Belarus','Bosnia','Bulgaria','Croatia','Cyprus','Czech Republic','Estonia',
  'Hungary','Kosovo','Latvia','Lithuania','Moldova','Montenegro','North Macedonia','Poland',
  'Romania','Russia','Serbia','Slovakia','Slovenia','Ukraine',
  // Africa - North
  'Algeria','Egypt','Libya','Morocco','Sudan','Tunisia',
  // Africa - Sub-Saharan
  'Angola','Benin','Botswana','Burkina Faso','Burundi','Cabo Verde','Cameroon','Central African Republic','Chad','Comoros',
  'Congo (DRC)','Congo (Republic)','Djibouti','Equatorial Guinea','Eritrea','Eswatini','Ethiopia','Gabon','Gambia','Ghana',
  'Guinea','Guinea-Bissau','Ivory Coast','Kenya','Lesotho','Liberia','Madagascar','Malawi','Mali','Mauritania',
  'Mauritius','Mozambique','Namibia','Niger','Nigeria','Rwanda','Sao Tome and Principe','Senegal','Seychelles','Sierra Leone',
  'Somalia','South Africa','South Sudan','Tanzania','Togo','Uganda','Zambia','Zimbabwe',
  // Americas - North & Central
  'Antigua and Barbuda','Bahamas','Barbados','Belize','Canada','Costa Rica','Cuba','Dominica','Dominican Republic','El Salvador',
  'Grenada','Guatemala','Haiti','Honduras','Jamaica','Mexico','Nicaragua','Panama','Saint Kitts and Nevis','Saint Lucia',
  'Saint Vincent and the Grenadines','Trinidad and Tobago','USA',
  // Americas - South
  'Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Guyana','Paraguay','Peru','Suriname','Uruguay','Venezuela',
  // Oceania & Pacific
  'Australia','Fiji','Kiribati','Marshall Islands','Micronesia','Nauru','New Zealand','Palau','Papua New Guinea',
  'Samoa','Solomon Islands','Tonga','Tuvalu','Vanuatu'
].sort()
const DOC_TYPES = ['Employment visa','Work permit','Employment contract','Offer letter','Visa + permit bundle','Residence permit','Business visa','Student visa','Other']
const TIERS = [
  { key: 'basic', label: 'Basic Verification', price: 1000, time: '48 hrs' },
  { key: 'urgent', label: 'Urgent Verification', price: 3000, time: '24 hrs' },
]
const PAYMENT_METHODS = ['bKash Send Money', 'bKash Merchant', 'Nagad', 'Rocket', 'EBL Bank', 'Cash']
const LEAD_SOURCES = ['Facebook Ads','WhatsApp','Phone Call','Facebook Organic','Referral','Other']

// Today's date in YYYY-MM-DD local format
const todayLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

export default function NewCase() {
  const navigate = useNavigate()
  const [paymentReceived, setPaymentReceived] = useState(false)
  const [staffList, setStaffList] = useState([])

  useEffect(() => {
    supabase.from('staff').select('id,name,role').order('name').then(({ data }) => { if (data) setStaffList(data) })
  }, [])
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdCase, setCreatedCase] = useState(null)

  // Edit mode after case creation
  const [editMode, setEditMode] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editSuccess, setEditSuccess] = useState(false)

  const [form, setForm] = useState({
    client_name: '', client_phone: '', client_email: '',
    country: '', doc_type: '', notes: '',
    tier: 'basic', ai_engine: 'gemini',
    payment_method: 'bKash Send Money',
    lead_source: 'WhatsApp',
    assigned_to: '',
    referred_by: '',
    intake_date: todayLocal()
  })
  const [qty, setQty] = useState(1)
  const [customPrice, setCustomPrice] = useState(false)
  const [customAmount, setCustomAmount] = useState('')
  const [discountReason, setDiscountReason] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const tier = TIERS.find(t => t.key === form.tier) || TIERS[0]
  const standardAmount = tier.price * qty
  const totalAmount = (customPrice && customAmount !== '') ? Number(customAmount) : standardAmount

  const handleSubmit = async () => {
    setError('')
    setSaving(true)
    const discountNote = (customPrice && customAmount !== '' && Number(customAmount) !== standardAmount)
      ? `[Custom price: ৳${Number(customAmount).toLocaleString()} instead of ৳${standardAmount.toLocaleString()}${discountReason ? ' — Reason: ' + discountReason : ''}]`
      : ''
    const finalForm = {
      ...form,
      client_name: form.client_name.trim() || 'প্রিয় গ্রাহক',
      country: form.country || 'Other',
      doc_type: form.doc_type || 'Other',
      notes: [form.notes, discountNote].filter(Boolean).join('\n'),
    }

    // Build the created_at timestamp from intake_date
    const intakeDateISO = form.intake_date
      ? new Date(form.intake_date + 'T12:00:00').toISOString()
      : new Date().toISOString()

    try {
      const { client_email: _ce, intake_date: _id, ...caseForm } = finalForm
      const { data: newCase, error: caseErr } = await createCase({
        ...caseForm,
        amount: totalAmount,
        qty,
        status: 'new',
        ai_engine: 'gemini',
        created_at: intakeDateISO
      })
      if (caseErr) {
        setError(`Failed to create case: ${caseErr.message}`)
        setSaving(false)
        return
      }
      await createInvoice({
        case_ref: newCase.case_id,
        client_name: finalForm.client_name,
        client_phone: form.client_phone,
        amount: totalAmount,
        tier: form.tier,
        payment_method: form.payment_method,
        lead_source: form.lead_source,
        assigned_to: form.assigned_to,
        referred_by: form.referred_by,
        created_at: intakeDateISO,
      })
      setCreatedCase(newCase)
      setStep(3)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  const handleEditSave = async () => {
    if (!createdCase) return
    setEditSaving(true)
    setEditSuccess(false)
    const { updateCase } = await import('../lib/supabase')
    const intakeDateISO = form.intake_date
      ? new Date(form.intake_date + 'T12:00:00').toISOString()
      : createdCase.created_at
    await updateCase(createdCase.id, {
      client_name: form.client_name || 'প্রিয় গ্রাহক',
      client_phone: form.client_phone,
      country: form.country || 'Other',
      doc_type: form.doc_type || 'Other',
      lead_source: form.lead_source,
      assigned_to: form.assigned_to,
      referred_by: form.referred_by,
      notes: form.notes,
      created_at: intakeDateISO
    })
    setEditSaving(false)
    setEditSuccess(true)
    setEditMode(false)
  }

  const waLink = createdCase
    ? buildWhatsAppLink(form.client_phone, waInvoiceMessage(form.client_name || 'প্রিয় গ্রাহক', createdCase.case_id, totalAmount, form.payment_method))
    : '#'

  const markPaymentReceived = async () => {
    if (!createdCase) return
    const { markInvoicePaid, getInvoices } = await import('../lib/supabase')
    const { data: invs } = await getInvoices()
    const inv = invs?.find(i => i.case_ref === createdCase.case_id)
    if (inv) await markInvoicePaid(inv.id, form.payment_method)
    const { updateCase } = await import('../lib/supabase')
    await updateCase(createdCase.id, { payment_status: 'received' })
    setPaymentReceived(true)
  }

  // Step 3 - Success
  if (step === 3 && createdCase) {
    return (
      <div>
        <div style={{ textAlign: 'center', padding: '24px 0 20px' }}>
          <CheckCircle size={52} color="var(--success)" style={{ margin: '0 auto 12px', display: 'block' }} />
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Case created!</h2>
          <p style={{ color: 'var(--text2)', fontSize: 13 }}>{createdCase.case_id}</p>
        </div>

        {/* Invoice summary */}
        {!editMode && (
          <div className="card mb-12">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Invoice ready to send</span>
              <button
                onClick={() => { setEditMode(true); setEditSuccess(false) }}
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: 'var(--navy)', background: 'var(--info-bg)', border: '1px solid var(--navy)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}
              >
                <Edit2 size={12} /> Edit
              </button>
            </div>
            <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Client</span><span>{form.client_name || 'প্রিয় গ্রাহক'}</span></div>
            <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Phone</span><span>{form.client_phone || '—'}</span></div>
            <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Case ID</span><span>{createdCase.case_id}</span></div>
            <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Date</span><span>{form.intake_date}</span></div>
            <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Service</span><span>{tier.label} · {tier.time}</span></div>
            <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Persons</span><span>{qty} person{qty > 1 ? 's' : ''}</span></div>
            <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Payment</span><span>{form.payment_method}</span></div>
            <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Lead source</span><span>{form.lead_source}</span></div>
            {form.assigned_to && <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Handled by</span><span>{staffList.find(s=>s.id===form.assigned_to)?.name||'—'}</span></div>}
            {form.referred_by && <div className="inv-line"><span style={{ color: 'var(--text2)' }}>Referred by</span><span>{form.referred_by}</span></div>}
            <div className="inv-line total"><span>Total</span><span style={{ color: 'var(--navy)' }}>৳{totalAmount.toLocaleString()}</span></div>
          </div>
        )}

        {/* Edit panel */}
        {editMode && (
          <div className="card mb-12">
            <div className="card-header">Edit case details</div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Full name</label>
                <input className="form-input" placeholder="প্রিয় গ্রাহক" value={form.client_name} onChange={e => set('client_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp number</label>
                <input className="form-input" placeholder="+880 1XXXXXXXXX" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} type="tel" />
              </div>
              <div className="form-group">
                <label className="form-label">Case date</label>
                <input className="form-input" type="date" value={form.intake_date} onChange={e => set('intake_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Destination country</label>
                <select className="form-select" value={form.country} onChange={e => set('country', e.target.value)}>
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Document type</label>
                <select className="form-select" value={form.doc_type} onChange={e => set('doc_type', e.target.value)}>
                  <option value="">Select type</option>
                  {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Lead source</label>
                  <select className="form-select" value={form.lead_source} onChange={e => set('lead_source', e.target.value)}>
                    {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Handled by</label>
                  <select className="form-select" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                    <option value="">— Select staff —</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{marginTop:10}}>
                <label className="form-label">Referred by</label>
                <input className="form-input" placeholder="Who referred this client?" value={form.referred_by} onChange={e => set('referred_by', e.target.value)} />
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" placeholder="Any extra context..." value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '0 16px 16px' }}>
              <button className="btn btn-full" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn btn-primary btn-full" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        )}

        {editSuccess && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
            <CheckCircle size={15} /> Case details updated successfully
          </div>
        )}

        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <MessageCircle size={20} color="#25D366" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>Send invoice via WhatsApp</div>
            <div style={{ fontSize: 12, color: 'var(--text2)' }}>Opens WhatsApp with pre-filled Bengali message</div>
          </div>
          <a href={waLink} target="_blank" rel="noreferrer" className="btn btn-wa btn-sm">Send</a>
        </div>

        {paymentReceived ? (
          <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
            <CheckCircle size={18} color="var(--success)" />
            <div style={{ fontSize:13, fontWeight:600, color:'var(--success)' }}>Payment received — invoice marked paid</div>
          </div>
        ) : (
          <button className="btn btn-success btn-full" style={{ marginBottom:16, padding:11 }} onClick={markPaymentReceived}>
            <CheckCircle size={15} /> Mark payment received
          </button>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button className="btn btn-full" onClick={() => {
            setStep(1)
            setForm({ client_name:'', client_phone:'', client_email:'', country:'', doc_type:'', notes:'', tier:'basic', ai_engine:'gemini', payment_method:'bKash Send Money', lead_source:'WhatsApp', assigned_to:'', referred_by:'', intake_date: todayLocal() })
            setQty(1)
            setCreatedCase(null)
            setEditMode(false)
            setEditSuccess(false)
          }}>New case</button>
          <button className="btn btn-primary btn-full" onClick={() => navigate(`/cases/${createdCase.id}`)}>Open case →</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {['Client info', 'Service details'].map((label, i) => (
          <div key={i} style={{ flex: 1 }}>
            <div style={{ height: 4, borderRadius: 2, background: step > i+1 ? 'var(--success)' : step === i+1 ? 'var(--navy)' : 'var(--border)', marginBottom: 4, transition: 'background .3s' }} />
            <div style={{ fontSize: 10.5, color: step === i+1 ? 'var(--navy)' : 'var(--text3)', fontWeight: step === i+1 ? 700 : 400 }}>{label}</div>
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--danger)', display: 'flex', gap: 8 }}>
          <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />{error}
        </div>
      )}

      {/* Step 1 - Client details */}
      {step === 1 && (
        <div>
          <div className="card mb-16">
            <div className="card-header">Client details</div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Full name (optional)</label>
                <input className="form-input" placeholder="প্রিয় গ্রাহক (leave blank)" value={form.client_name} onChange={e => set('client_name', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">WhatsApp number (optional)</label>
                <input className="form-input" placeholder="+880 1XXXXXXXXX" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} type="tel" />
              </div>
              <div className="form-group">
                <label className="form-label">Case date</label>
                <input className="form-input" type="date" value={form.intake_date} onChange={e => set('intake_date', e.target.value)} max={todayLocal()} />
              </div>
              <div className="form-group">
                <label className="form-label">Destination country (optional)</label>
                <select className="form-select" value={form.country} onChange={e => set('country', e.target.value)}>
                  <option value="">Select country</option>
                  {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Document type (optional)</label>
                <select className="form-select" value={form.doc_type} onChange={e => set('doc_type', e.target.value)}>
                  <option value="">Select type</option>
                  {DOC_TYPES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-row">
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Lead source</label>
                  <select className="form-select" value={form.lead_source} onChange={e => set('lead_source', e.target.value)}>
                    {LEAD_SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{marginBottom:0}}>
                  <label className="form-label">Handled by (staff)</label>
                  <select className="form-select" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)}>
                    <option value="">— Select staff —</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{marginBottom:0}}>
                <label className="form-label">Referred by (optional)</label>
                <input className="form-input" placeholder="Who referred this client?" value={form.referred_by} onChange={e => set('referred_by', e.target.value)} />
              </div>
            </div>
          </div>
          <button
            className="btn btn-primary btn-full"
            style={{ padding: 12 }}
            onClick={() => setStep(2)}
          >Continue →</button>
        </div>
      )}

      {/* Step 2 - Service */}
      {step === 2 && (
        <div>
          <div className="card mb-12">
            <div className="card-header">Service tier</div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {TIERS.map(t => (
                  <div key={t.key} className={`tier-card ${form.tier === t.key ? 'selected' : ''}`} onClick={() => set('tier', t.key)}>
                    <div className="tier-name">{t.label}</div>
                    <div className="tier-price">৳{t.price.toLocaleString()}</div>
                    <div className="tier-time">{t.time}</div>
                  </div>
                ))}
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Number of persons / documents</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
                  <button type="button" onClick={() => setQty(q => Math.max(1, q-1))} style={{ width: 38, height: 38, borderRadius: 8, border: '1px solid var(--border2)', background: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontSize: 24, fontWeight: 700, minWidth: 30, textAlign: 'center' }}>{qty}</span>
                  <button type="button" onClick={() => setQty(q => Math.min(20, q+1))} style={{ width: 38, height: 38, borderRadius: 8, border: '1px solid var(--border2)', background: '#fff', fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  <span style={{ fontSize: 13, color: 'var(--text2)' }}>× ৳{tier.price.toLocaleString()} = <strong style={{ color: 'var(--navy)', fontSize: 15 }}>৳{standardAmount.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-12">
            <div className="card-header">
              <span>Price override</span>
              <button
                type="button"
                onClick={() => { setCustomPrice(v => !v); if (!customPrice) setCustomAmount(String(standardAmount)) }}
                style={{ fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 20, border: '1px solid', cursor: 'pointer',
                  background: customPrice ? 'var(--navy)' : '#fff', borderColor: customPrice ? 'var(--navy)' : 'var(--border2)', color: customPrice ? '#fff' : 'var(--text2)' }}>
                {customPrice ? 'Custom price ON' : 'Apply discount / custom price'}
              </button>
            </div>
            {customPrice && (
              <div className="card-body">
                <div className="form-row">
                  <div className="form-group" style={{marginBottom:0}}>
                    <label className="form-label">Final amount (৳)</label>
                    <input className="form-input" type="number" min="0" value={customAmount} onChange={e => setCustomAmount(e.target.value)} placeholder={String(standardAmount)} />
                  </div>
                  <div className="form-group" style={{marginBottom:0}}>
                    <label className="form-label">Reason (optional)</label>
                    <input className="form-input" value={discountReason} onChange={e => setDiscountReason(e.target.value)} placeholder="e.g. loyal client, bulk case" />
                  </div>
                </div>
                {customAmount !== '' && Number(customAmount) !== standardAmount && (
                  <div style={{marginTop:8,fontSize:12,color: Number(customAmount) < standardAmount ? 'var(--success)' : 'var(--warning)', fontWeight:600}}>
                    {Number(customAmount) < standardAmount
                      ? `Discount: ৳${(standardAmount - Number(customAmount)).toLocaleString()} off standard price`
                      : `৳${(Number(customAmount) - standardAmount).toLocaleString()} above standard price`}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card mb-12">
            <div className="card-header">Payment method</div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 8 }}>
                {PAYMENT_METHODS.map(m => (
                  <button key={m} onClick={() => set('payment_method', m)} style={{ flex: 1, padding: '9px 4px', borderRadius: 8, border: '2px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer', borderColor: form.payment_method === m ? 'var(--navy)' : 'var(--border)', background: form.payment_method === m ? 'var(--info-bg)' : '#fff', color: form.payment_method === m ? 'var(--navy)' : 'var(--text2)' }}>{m}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="card mb-16">
            <div className="card-header">Notes (optional)</div>
            <div className="card-body">
              <textarea className="form-textarea" placeholder="Any extra context about this case..." value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 14px', marginBottom:10, background:'var(--info-bg)', borderRadius:8 }}>
            <span style={{ fontSize:12.5, fontWeight:600, color:'var(--navy)' }}>Amount to charge</span>
            <span style={{ fontSize:18, fontWeight:800, color:'var(--navy)' }}>৳{totalAmount.toLocaleString()}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button className="btn btn-full" onClick={() => setStep(1)}>← Back</button>
            <button className="btn btn-primary btn-full" style={{ padding: 12 }} onClick={handleSubmit} disabled={saving}>
              {saving ? 'Creating...' : 'Create case ✓'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
