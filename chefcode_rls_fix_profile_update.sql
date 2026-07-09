-- ============================================================
-- SECURITY FIX — profiles self-update privilege escalation (blocker #1)
-- ============================================================
-- The "profile_update_self" policy had a USING clause but NO WITH CHECK.
-- For an UPDATE, USING only restricts WHICH rows you may touch (your own);
-- it does NOT restrict the values you write. So any authenticated user could
-- PATCH their own profiles row via the public REST API and set:
--   role = 'owner'                 -> take over their tenant
--   org_id = <another org's UUID>  -> jump into a victim tenant's data
--   is_platform_admin = TRUE       -> cross-tenant super-admin (read/alter
--                                     EVERY tenant, change any plan)
--
-- This migration locks role + org_id to be immutable once set (the first
-- NULL -> value claim during signup is still allowed so onboarding works),
-- and makes is_platform_admin entirely non-writable from the client.
--
-- Safe + idempotent. Run in the Supabase SQL editor (SQL editor runs as the
-- postgres/service role, which bypasses these restrictions, so your manual
-- "make me a platform admin" UPDATE still works).
-- ============================================================

-- 1) is_platform_admin can NEVER be written by the client.
--    Column-level REVOKE is absolute for the anon/authenticated API roles.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_platform_admin'
  ) THEN
    EXECUTE 'REVOKE UPDATE (is_platform_admin) ON public.profiles FROM anon, authenticated';
  END IF;
END $$;

-- 2) Harden the self-update policy. get_my_org_id() / get_my_role() are
--    SECURITY DEFINER + STABLE, so inside WITH CHECK they read the CURRENT
--    (pre-update) values — the new values written by this same UPDATE are not
--    yet visible to them, which is exactly what we need to compare against.
DROP POLICY IF EXISTS "profile_update_self" ON public.profiles;
CREATE POLICY "profile_update_self" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    -- org_id: must stay the same, UNLESS this is the first claim (was NULL)
    AND (org_id IS NOT DISTINCT FROM get_my_org_id() OR get_my_org_id() IS NULL)
    -- role: must stay the same, UNLESS this is that same first-org claim
    AND (role = get_my_role() OR get_my_org_id() IS NULL)
  );

-- 3) Defense-in-depth: harden the self-INSERT path too. The app never inserts
--    profiles from the client (the SECURITY DEFINER signup trigger does, and it
--    bypasses these rules), so a client self-insert may only create a benign,
--    unclaimed profile — never assert an elevated role/org/platform-admin.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_platform_admin'
  ) THEN
    EXECUTE 'REVOKE INSERT (is_platform_admin) ON public.profiles FROM anon, authenticated';
  END IF;
END $$;

DROP POLICY IF EXISTS "profile_insert_self" ON public.profiles;
CREATE POLICY "profile_insert_self" ON public.profiles
  FOR INSERT
  WITH CHECK (
    id = auth.uid()
    AND org_id IS NULL
    AND role = 'chef'
  );

-- ── Quick self-check after running (optional) ──
-- As a normal (non-platform) test user, these should now FAIL:
--   update profiles set role = 'owner' where id = auth.uid();
--   update profiles set is_platform_admin = true where id = auth.uid();
-- while a plain profile edit should still succeed:
--   update profiles set full_name = 'New Name' where id = auth.uid();
