-- ============================================================
-- Trial / plan enforcement at the database (high finding)
-- ============================================================
-- The app blocks an expired-trial tenant in the UI, but that is bypassable via
-- the public REST API. This gates the invoices INSERT policy so an inactive or
-- expired-trial org physically cannot save new invoices, matching the client's
-- "read-only when expired" rule. Editing existing invoices is intentionally
-- still allowed (fixing past data isn't new usage). Idempotent + safe to re-run.
-- Run in the Supabase SQL editor.
-- ============================================================

DROP POLICY IF EXISTS "inv_insert" ON public.invoices;
CREATE POLICY "inv_insert" ON public.invoices
  FOR INSERT
  WITH CHECK (
    org_id = get_my_org_id()
    AND EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = org_id
        AND COALESCE(o.is_active, TRUE)
        AND (
          COALESCE(o.is_trial, FALSE) = FALSE          -- paid plan
          OR o.trial_ends_at IS NULL                    -- no expiry set
          OR o.trial_ends_at > now()                    -- trial still active
        )
    )
  );
