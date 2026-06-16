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
  return `https://api.whatsapp.com/send?phone=${clean}&text=${encoded}`
}

export const waInvoiceMessage = (client, caseId, amount, method) =>
  `আসসালামু আলাইকুম ${client}! 🙏\n\nআপনার ডকুমেন্ট যাচাই সেবার জন্য ইনভয়েস পাঠানো হলো।\n\n📋 কেস আইডি: ${caseId}\n💰 পরিমাণ: ৳${amount}\n💳 পেমেন্ট পদ্ধতি: ${method}\n\nঅনুগ্রহ করে পেমেন্ট করার পরে স্ক্রিনশট পাঠান। আমরা নিশ্চিত করব।\n\nধন্যবাদ\nVVC Global — Document Intelligence Unit`

export const waReportMessage = (client, caseId, verdict) =>
  `আসসালামু আলাইকুম ${client}! 🙏\n\nআপনার রিপোর্ট তৈরি হয়েছে।\n\n📋 কেস আইডি: ${caseId}\n\nরিপোর্টটি সংযুক্ত করা হলো। অনুগ্রহ করে ডাউনলোড করে দেখুন।\n\nযেকোনো প্রশ্নের জন্য যোগাযোগ করুন।\n\nধন্যবাদ\nVVC Global`

export const waPaymentConfirm = (client, caseId) =>
  `আসসালামু আলাইকুম ${client}! ✅\n\nআপনার পেমেন্ট সফলভাবে গ্রহণ করা হয়েছে।\n\n📋 কেস আইডি: ${caseId}\n\nআমরা আপনার ডকুমেন্ট যাচাই প্রক্রিয়া শুরু করেছি। রিপোর্ট তৈরি হলে আপনাকে জানানো হবে।\n\nধন্যবাদ\nVVC Global — Document Intelligence Unit`

// ── WHATSAPP TEMPLATES ──
export const WA_TEMPLATES = {
  initial_reply: (client) =>
    `আসসালামু আলাইকুম ${client}! 🙏\n\nআমাদের সাথে যোগাযোগ করার জন্য আন্তরিক ধন্যবাদ।\n\nVVC Global — Document Intelligence Unit বিদেশে কর্মসংস্থান ও ভ্রমণ সংক্রান্ত সকল ধরনের ডকুমেন্ট যাচাই করে থাকে, যেমন: ভিসা, ওয়ার্ক পারমিট, অফার লেটার, এমপ্লয়মেন্ট কনট্র্যাক্ট ইত্যাদি।\n\nআপনার ডকুমেন্টগুলো পাঠান। আমরা যাচাই করে জানাবো এগুলো আসল কিনা।\n\n✅ Basic: ৳১,০০০ (৪৮ ঘণ্টা)\n✅ Urgent: ৳৩,০০০ (২৪ ঘণ্টা)\n💳 Payment: bKash / Nagad / Rocket\n\nসন্দেহ হলে আগে যাচাই করুন, তারপর টাকা দিন।\n\nধন্যবাদ\nVVC Global`,

  payment_reminder: (client, caseId, amount, method) =>
    `আসসালামু আলাইকুম ${client}! 🙏\n\nআপনার কেস (${caseId}) এর পেমেন্ট এখনো পাওয়া যায়নি।\n\n💰 পরিমাণ: ৳${amount}\n💳 পেমেন্ট: ${method}\n\nঅনুগ্রহ করে পেমেন্ট করে স্ক্রিনশট পাঠান।\n\nধন্যবাদ\nVVC Global`,

  report_ready: (client, caseId, verdict) =>
    `আসসালামু আলাইকুম ${client}! 🙏\n\nআপনার ডকুমেন্ট যাচাই রিপোর্ট তৈরি হয়েছে।\n\n📋 কেস আইডি: ${caseId}\n\nরিপোর্টটি সংযুক্ত করা হলো। অনুগ্রহ করে ডাউনলোড করে বিস্তারিত দেখুন।\n\nরিপোর্টটি বাংলায় পড়তে Google Translate ব্যবহার করতে পারেন।\n\nযেকোনো প্রশ্নের জন্য আমাদের সাথে যোগাযোগ করুন।\n\nধন্যবাদ\nVVC Global — Document Intelligence Unit`,

  review_request: (client) =>
    `আসসালামু আলাইকুম ${client}! 🙏\n\nআশা করি আমাদের ডকুমেন্ট যাচাই সেবা আপনার কাজে এসেছে।\n\nআপনার একটি রিভিউ আমাদের অনেক সাহায্য করবে এবং অন্য মানুষদের প্রতারণা থেকে বাঁচাতে সহায়তা করবে। 🌟\n\n👉 রিভিউ দিতে এখানে ক্লিক করুন:\nhttps://www.facebook.com/VisaVerificationCenter\n\nআপনার বিশ্বাস ও সহযোগিতার জন্য আন্তরিক ধন্যবাদ।\nVVC Global — Document Intelligence Unit`,

  follow_up: (client, caseId) =>
    `আসসালামু আলাইকুম ${client}! 🙏\n\nআপনার কেস (${caseId}) সম্পর্কে একটু জানতে চাইছিলাম।\n\nআপনার ডকুমেন্টগুলো এখনো পাওয়া যায়নি। অনুগ্রহ করে যত দ্রুত সম্ভব পাঠান, যাতে আমরা যাচাই প্রক্রিয়া শুরু করতে পারি।\n\nকোনো সমস্যা হলে জানান, আমরা সাহায্য করব।\n\nধন্যবাদ\nVVC Global`,

  fraud_alert: (country, docType) =>
    `⚠️ জরুরি সতর্কবার্তা!\n\n${country} থেকে ${docType} সংক্রান্ত জাল ডকুমেন্ট সম্প্রতি আমাদের নজরে এসেছে।\n\nবিদেশে যাওয়ার আগে অবশ্যই আপনার ডকুমেন্ট যাচাই করুন। প্রতারণার শিকার হলে অর্থ ও সময় দুটোই নষ্ট হবে।\n\n✅ VVC Global — Document Intelligence Unit\n🔍 ১০০% ডিজিটাল · নিরাপদ · বিশ্বস্ত\n\nসন্দেহ হলে আগে যাচাই করুন।`,
}

export const waFollowUp = (client, caseId) => WA_TEMPLATES.follow_up(client, caseId)
export const waReviewRequest = (client) => WA_TEMPLATES.review_request(client)

// ── KEEP SUPABASE ALIVE (prevents free tier pausing) ──
// Pings the database every 5 minutes while app is open
const keepAlive = () => {
  supabase.from('cases').select('id').limit(1).then(() => {})
}
setInterval(keepAlive, 5 * 60 * 1000) // every 5 minutes
