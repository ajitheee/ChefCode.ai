-- ============================================================
-- ChefCode — Platform super-admin support
-- ============================================================
-- Adds a PLATFORM-level admin (the app owner) who can see every tenant
-- and change any tenant's plan. This is DIFFERENT from a tenant "owner",
-- who only ever sees their own organization.
--
-- Safe to run on the live database: every statement is additive and
-- idempotent. The new RLS policies are PERMISSIVE, so they OR together
-- with the existing per-tenant policies — normal tenants are unaffected.
--
-- Run this in the Supabase SQL editor, then run the one-time UPDATE at the
-- bottom to make yourself a platform admin.
-- ============================================================

-- 1. Flag on profiles (defaults false → every existing user stays a normal user)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Helper: is the current user a platform admin?
--    SECURITY DEFINER so it reads profiles without tripping RLS recursion.
CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT COALESCE((SELECT is_platform_admin FROM profiles WHERE id = auth.uid()), FALSE)
$$;

-- 3. Cross-tenant policies for platform admins (additive / permissive)

-- organizations: read all + update all (needed to change any tenant's plan)
DROP POLICY IF EXISTS "org_select_platform_admin" ON organizations;
CREATE POLICY "org_select_platform_admin" ON organizations
  FOR SELECT USING (is_platform_admin());

DROP POLICY IF EXISTS "org_update_platform_admin" ON organizations;
CREATE POLICY "org_update_platform_admin" ON organizations
  FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- profiles: read all (to show who onboarded + per-tenant user counts)
DROP POLICY IF EXISTS "profiles_select_platform_admin" ON profiles;
CREATE POLICY "profiles_select_platform_admin" ON profiles
  FOR SELECT USING (is_platform_admin());

-- locations: read all (per-tenant location counts)
DROP POLICY IF EXISTS "locations_select_platform_admin" ON locations;
CREATE POLICY "locations_select_platform_admin" ON locations
  FOR SELECT USING (is_platform_admin());

-- invoices: read all (per-tenant usage counts)
DROP POLICY IF EXISTS "invoices_select_platform_admin" ON invoices;
CREATE POLICY "invoices_select_platform_admin" ON invoices
  FOR SELECT USING (is_platform_admin());

-- ============================================================
-- 4. ONE-TIME: make yourself (the app owner) a platform admin.
--    Replace the email with your login email, then run this line.
-- ============================================================
-- UPDATE profiles SET is_platform_admin = TRUE
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
