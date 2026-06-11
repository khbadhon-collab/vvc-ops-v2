import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ulpreqvxedabsrhzylzk.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVscHJlcXZ4ZWRhYnNyaHp5bHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMTU0MjQsImV4cCI6MjA5NjU5MTQyNH0.dW-pAHqodSn0rCSXiYf4qqVjzc7KSYt6bbIl3JTeq2w'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ── AUTH ──
export const signIn = (email, password) =>
  supabase.auth.signInWithPassword({ email, password })

export const signOut = () => supabase.auth.signOut()

export const getSession = () => supabase.auth.getSession()

// ── CASES ── 
export const getCases = () =>
  supabase.from('cases').select('*').order('created_at', { ascending: false })

export const getCaseById = (id) =>
  supabase.from('cases').select('*').eq('id', id).single()

export const createCase = async (data) => {
  const caseId = generateCaseId()
  // Use insert WITHOUT .select() to avoid RLS select policy issue
  const { error } = await supabase.from('cases').insert([{
    ...data,
    case_id: caseId,
    status: 'new',
    created_at: new Date().toISOString()
  }])
  if (error) return { data: null, error }
  // Fetch the created case separately
  const { data: created, error: fetchError } = await supabase
    .from('cases').select('*').eq('case_id', caseId).single()
  return { data: created, error: fetchError }
}

export const updateCase = (id, data) =>
  supabase.from('cases').update(data).eq('id', id)

export const deleteCase = (id) =>
  supabase.from('cases').delete().eq('id', id)

// ── INVOICES ──
export const getInvoices = () =>
  supabase.from('invoices').select('*').order('created_at', { ascending: false })

export const createInvoice = async (data) => {
  const { error } = await supabase.from('invoices').insert([{
    ...data,
    invoice_number: generateInvoiceNumber(),
    status: 'unpaid',
    created_at: new Date().toISOString()
  }])
  return { error }
}

export const markInvoicePaid = (id, method) =>
  supabase.from('invoices').update({
    status: 'paid',
    payment_method: method,
    paid_at: new Date().toISOString()
  }).eq('id', id)

// ── EXPENSES ──
export const getExpenses = () =>
  supabase.from('expenses').select('*').order('date', { ascending: false })

export const addExpense = async (data) => {
  const { error } = await supabase.from('expenses').insert([{
    ...data,
    created_at: new Date().toISOString()
  }])
  return { error }
}

// ── HELPERS ──
export const generateCaseId = () => {
  const d = new Date()
  const date = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const seq = String(Math.floor(1000 + Math.random() * 9000))
  return `VVC-${date}-${seq}`
}

export const generateInvoiceNumber = () => {
  const d = new Date()
  return `INV-${d.getFullYear()}-${String(Math.floor(1000 + Math.random() * 9000))}`
}

// ── WHATSAPP DEEP LINKS ──
export const buildWhatsAppLink = (phone, message) => {
  const clean = (phone || '').replace(/\D/g, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${clean}?text=${encoded}`
}

export const waInvoiceMessage = (client, caseId, amount, method) =>
  `আসসালামু আলাইকুম ${client}! 🙏\n\nআপনার ভিসা যাচাই সেবার জন্য ইনভয়েস:\n\n📋 কেস আইডি: ${caseId}\n💰 পরিমাণ: ৳${amount}\n💳 পেমেন্ট: ${method}\n\nপেমেন্ট করার পরে স্ক্রিনশট পাঠান।\n\nধন্যবাদ\nVVC Global`

export const waReportMessage = (client, caseId, verdict) =>
  `আসসালামু আলাইকুম ${client}! 🙏\n\nআপনার ভিসা যাচাই রিপোর্ট তৈরি হয়েছে।\n\n📋 কেস আইডি: ${caseId}\n🔍 ফলাফল: ${verdict}\n\nরিপোর্টটি সংযুক্ত করা হয়েছে। যেকোনো প্রশ্নের জন্য যোগাযোগ করুন।\n\nধন্যবাদ\nVVC Global`

export const waPaymentConfirm = (client, caseId) =>
  `আসসালামু আলাইকুম ${client}! ✅\n\nআপনার পেমেন্ট নিশ্চিত হয়েছে।\n📋 কেস আইডি: ${caseId}\n\nআপনার ডকুমেন্টগুলো পাঠান, আমরা যাচাই শুরু করব।\n\nধন্যবাদ\nVVC Global`

// ── WHATSAPP TEMPLATES ──
export const WA_TEMPLATES = {
  initial_reply: (client) =>
    `আসসালামু আলাইকুম ${client}! 🙏\n\nআমাদের সাথে যোগাযোগ করার জন্য ধন্যবাদ।\n\nVisa Verification Center (VVC) আপনার ভিসা ও কর্মসংস্থান ডকুমেন্ট যাচাই করে। আপনার ডকুমেন্টগুলো পাঠান এবং আমরা জানাব এগুলো আসল কিনা।\n\n✅ সার্ভিস: Basic ৳১,০০০ (৪৮ঘণ্টা) | Urgent ৳৩,০০০ (২৪ঘণ্টা)\n💳 Payment: bKash / Nagad\n\nধন্যবাদ\nVVC Global`,

  payment_reminder: (client, caseId, amount, method) =>
    `আসসালামু আলাইকুম ${client}! 🙏\n\nআপনার কেস (${caseId}) এর পেমেন্ট এখনো পাওয়া যায়নি।\n\n💰 পরিমাণ: ৳${amount}\n💳 পেমেন্ট: ${method}\n\nঅনুগ্রহ করে পেমেন্ট করে স্ক্রিনশট পাঠান।\n\nধন্যবাদ\nVVC Global`,

  report_ready: (client, caseId, verdict) =>
    `আসসালামু আলাইকুম ${client}! ✅\n\nআপনার ভিসা যাচাই রিপোর্ট তৈরি হয়েছে।\n\n📋 কেস: ${caseId}\n🔍 ফলাফল: ${verdict}\n\nরিপোর্টটি নিচে পাঠানো হলো। যেকোনো প্রশ্নের জন্য যোগাযোগ করুন।\n\nধন্যবাদ\nVVC Global`,

  review_request: (client) =>
    `আসসালামু আলাইকুম ${client}! 🙏\n\nআমাদের সেবা আপনার কেমন লেগেছে? একটু রিভিউ দিলে আমরা খুব খুশি হবো। 🌟\n\n👉 https://www.facebook.com/VisaVerificationCenter\n\nআপনার সহযোগিতার জন্য ধন্যবাদ।\nVVC Global`,

  follow_up: (client, caseId) =>
    `আসসালামু আলাইকুম ${client}! 🙏\n\nআপনার কেস (${caseId}) এর বিষয়ে জানতে চাইছিলাম। ডকুমেন্টগুলো কি পাঠাতে পারবেন?\n\nধন্যবাদ\nVVC Global`,

  fraud_alert: (country, docType) =>
    `⚠️ সতর্কতা!\n\n${country} থেকে ${docType} সংক্রান্ত জাল ডকুমেন্ট ধরা পড়েছে।\n\nবিদেশে যাওয়ার আগে আপনার ডকুমেন্ট যাচাই করুন।\n\n📞 VVC Global — Visa Verification Center\n✅ ১০০% ডিজিটাল সার্ভিস`,
}

export const waFollowUp = (client, caseId) => WA_TEMPLATES.follow_up(client, caseId)
export const waReviewRequest = (client) => WA_TEMPLATES.review_request(client)
