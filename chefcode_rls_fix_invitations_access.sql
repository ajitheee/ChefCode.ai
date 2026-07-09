-- ============================================================
-- SECURITY FIX — RLS on invitations + user_location_access (blocker #3)
-- ============================================================
-- These two tables are used by the app but were never in the committed schema,
-- so RLS may be OFF. If it is, ANY authenticated user can read every tenant's
-- pending invitations (their invitees' emails) and every location-access grant
-- across all tenants — a cross-tenant data leak.
--
-- This enables RLS and adds org-scoped policies. Idempotent + safe to re-run.
-- Run chefcode_rls_check.sql FIRST; only run this if those tables show
-- rls_enabled = FALSE (or have no org-scoped policy). Uses the existing
-- SECURITY DEFINER helpers get_my_org_id() / get_my_role().
--
-- After running, TEST: create a location, invite a teammate, and log in as a
-- teammate — all should still work (owner/manager can manage; users see their own).
-- ============================================================

-- ── invitations (has org_id) ──
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Read: only invitations belonging to your org.
DROP POLICY IF EXISTS "invitations_select_org" ON public.invitations;
CREATE POLICY "invitations_select_org" ON public.invitations
  FOR SELECT USING (org_id = get_my_org_id());

-- Create / update / delete: owners + managers of that org only.
DROP POLICY IF EXISTS "invitations_write_owner_mgr" ON public.invitations;
CREATE POLICY "invitations_write_owner_mgr" ON public.invitations
  FOR ALL
  USING (org_id = get_my_org_id() AND get_my_role() IN ('owner','manager'))
  WITH CHECK (org_id = get_my_org_id() AND get_my_role() IN ('owner','manager'));

-- ── user_location_access (no org_id — scoped via the location's org) ──
ALTER TABLE public.user_location_access ENABLE ROW LEVEL SECURITY;

-- Read: your own access rows, plus any grant for a location in your org
-- (so owners/managers can see the team's access map).
DROP POLICY IF EXISTS "ula_select" ON public.user_location_access;
CREATE POLICY "ula_select" ON public.user_location_access
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = location_id AND l.org_id = get_my_org_id()
    )
  );

-- Grant / revoke access: owners + managers, only for locations in their org.
DROP POLICY IF EXISTS "ula_write_owner_mgr" ON public.user_location_access;
CREATE POLICY "ula_write_owner_mgr" ON public.user_location_access
  FOR ALL
  USING (
    get_my_role() IN ('owner','manager')
    AND EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = location_id AND l.org_id = get_my_org_id()
    )
  )
  WITH CHECK (
    get_my_role() IN ('owner','manager')
    AND EXISTS (
      SELECT 1 FROM public.locations l
      WHERE l.id = location_id AND l.org_id = get_my_org_id()
    )
  );
