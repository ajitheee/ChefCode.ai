-- ============================================================
-- READ-ONLY CHECK — is RLS on, and what policies exist?
-- ============================================================
-- Run this FIRST in the Supabase SQL editor. It changes nothing.
-- The key thing to read is the first result: for EVERY row, rls_enabled
-- should be TRUE. If `invitations` or `user_location_access` show FALSE, they
-- are cross-tenant readable and you must run chefcode_rls_fix_invitations_access.sql.
-- ============================================================

-- 1) RLS on/off per table (want: all TRUE)
SELECT tablename, rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'invitations','user_location_access','profiles','organizations','locations',
    'invoices','invoice_items','products','gl_codes','vendors','audit_logs'
  )
ORDER BY rls_enabled, tablename;

-- 2) Existing policies on the two tables in question (want: org-scoped, not USING(true))
SELECT tablename, policyname, cmd, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('invitations','user_location_access')
ORDER BY tablename, policyname;

-- 3) Columns present (so the hardening migration matches the real schema)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('invitations','user_location_access')
ORDER BY table_name, ordinal_position;
