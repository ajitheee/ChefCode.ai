// ============================================================
// Supabase Edge Function: invite-user
// ============================================================
// Sends an invitation email via Supabase Auth.
//
// Flow:
//   1. Owner (authenticated) calls this function with { email }
//   2. We verify they're an owner via their JWT
//   3. We call auth.admin.inviteUserByEmail() with service_role
//   4. Supabase sends the invitee an email with a "set password" link
//   5. When they click it, they set password, log in, and the
//      handle_new_user() trigger attaches them to the inviter's
//      org based on the invitations table row.
//
// Deploy via Supabase Dashboard → Edge Functions → New function
// Name: invite-user
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Parse request body
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return json({ error: "Email is required" }, 400);
    }
    const normalizedEmail = email.toLowerCase().trim();

    // 2. Verify caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authorization header required" }, 401);
    }

    // 3. Verify caller identity using their JWT
    const supabaseAuthClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: userErr } = await supabaseAuthClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: "Invalid auth token" }, 401);
    }

    // 4. Confirm caller is an owner (with service_role to bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role, org_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "owner") {
      return json({ error: "Only owners can invite team members" }, 403);
    }

    // 5. Send invitation email via Supabase Auth
    // This creates an unconfirmed user + sends them a magic link
    // to set their password and log in for the first time.
    const { data: inviteRes, error: inviteErr } = await supabaseAdmin.auth.admin
      .inviteUserByEmail(normalizedEmail, {
        redirectTo: "https://chefcode.cc/app",
      });

    if (inviteErr) {
      // Common case: user already exists. That's not really an error —
      // the invitations row still applies when they next log in.
      const msg = inviteErr.message || "Unknown invite error";
      if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("registered")) {
        return json({
          ok: true,
          warning: "User already exists. Invitation saved — they'll be auto-added to your org next time they sign in.",
        });
      }
      return json({ error: `Failed to send invite: ${msg}` }, 500);
    }

    return json({ ok: true, user: inviteRes.user });
  } catch (e) {
    return json({ error: (e as Error).message || "Unknown error" }, 500);
  }
});
