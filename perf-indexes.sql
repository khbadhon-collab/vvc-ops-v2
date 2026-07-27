-- VVC Ops — performance indexes
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New query).
-- Safe to run anytime; IF NOT EXISTS makes it safe to re-run too.
-- Every list page orders by created_at, and Cases/Staff/Intelligence
-- filter by status/country — without indexes these become sequential
-- scans that get slower every month as the tables grow.

CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases (status);
CREATE INDEX IF NOT EXISTS idx_cases_country ON cases (country);

CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_case_ref ON invoices (case_ref);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices (status);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses (date DESC);
