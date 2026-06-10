-- VVC Ops — Complete Fixed Database Schema
-- Run this ENTIRE script in Supabase SQL Editor
-- It fixes RLS policies so cases save correctly

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables to start clean
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- CASES table
CREATE TABLE cases (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  case_id TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  country TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'basic',
  amount INTEGER NOT NULL DEFAULT 1000,
  qty INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'new',
  ai_engine TEXT NOT NULL DEFAULT 'gemini',
  notes TEXT,
  verdict TEXT,
  report_text TEXT,
  report_url TEXT,
  receipt_url TEXT,
  payment_status TEXT DEFAULT 'pending',
  documents JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVOICES table
CREATE TABLE invoices (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  case_id BIGINT,
  case_ref TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  amount INTEGER NOT NULL,
  tier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT DEFAULT 'bKash',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- EXPENSES table
CREATE TABLE expenses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount INTEGER NOT NULL,
  date DATE NOT NULL,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SETTINGS table
CREATE TABLE settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  claude_api_key TEXT DEFAULT '',
  gemini_api_key TEXT DEFAULT '',
  wa_number TEXT DEFAULT '',
  bkash_number TEXT DEFAULT '',
  nagad_number TEXT DEFAULT '',
  vvc_email TEXT DEFAULT 'vvcbd2026@gmail.com',
  auto_case_id BOOLEAN DEFAULT TRUE,
  bengali_messages BOOLEAN DEFAULT TRUE,
  friday_closed BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- DROP old policies if exist
DROP POLICY IF EXISTS "Auth users full access on cases" ON cases;
DROP POLICY IF EXISTS "Auth users full access on invoices" ON invoices;
DROP POLICY IF EXISTS "Auth users full access on expenses" ON expenses;
DROP POLICY IF EXISTS "Auth users full access on settings" ON settings;

-- Create SEPARATE policies for each operation (fixes the insert+select RLS bug)
-- CASES
CREATE POLICY "cases_select" ON cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "cases_insert" ON cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "cases_update" ON cases FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "cases_delete" ON cases FOR DELETE TO authenticated USING (true);

-- INVOICES
CREATE POLICY "invoices_select" ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "invoices_insert" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "invoices_update" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "invoices_delete" ON invoices FOR DELETE TO authenticated USING (true);

-- EXPENSES
CREATE POLICY "expenses_select" ON expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "expenses_delete" ON expenses FOR DELETE TO authenticated USING (true);

-- SETTINGS
CREATE POLICY "settings_select" ON settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings_insert" ON settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "settings_update" ON settings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cases_updated_at ON cases;
CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Verify
SELECT 'cases' as table_name, count(*) as policies FROM pg_policies WHERE tablename = 'cases'
UNION ALL
SELECT 'invoices', count(*) FROM pg_policies WHERE tablename = 'invoices'
UNION ALL
SELECT 'expenses', count(*) FROM pg_policies WHERE tablename = 'expenses'
UNION ALL
SELECT 'settings', count(*) FROM pg_policies WHERE tablename = 'settings';
