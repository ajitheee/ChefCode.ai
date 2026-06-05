// services/authService.ts
// Real authentication via Supabase Auth
// Replaces the hardcoded admin/admin123, chef/chef123 mock login

import { supabase } from './supabaseClient';

export type AppUserRole = 'admin' | 'chef' | null;
export type Plan = 'starter' | 'professional';

const PLAN_LIMITS: Record<Plan, { max_locations: number; max_users: number; max_invoices_per_month: number }> = {
  starter:      { max_locations: 1, max_users: 3,  max_invoices_per_month: 200 },
  professional: { max_locations: 5, max_users: 15, max_invoices_per_month: 1000 },
};

// ─── Sign Up ────────────────────────────────────────────────────────
// New signups become the OWNER of a new tenant unless an invitation
// already exists for their email (handled by DB trigger).
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  tenantName: string,
  plan: Plan = 'starter',
) {
  // 1. Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign up failed');

  // 2. The DB trigger handles invitation-based signups automatically.
  // For self-signups (no invitation), create their organization here.
  // Check if their profile was already linked to an org by the trigger.
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', data.user.id)
    .single();

  if (profile?.org_id) {
    // They were attached to an existing org via invitation. Nothing to create.
    return data;
  }

  // 3. Create the new tenant organization
  const limits = PLAN_LIMITS[plan];
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: tenantName.trim(),
      type: 'restaurant',
      plan,
      owner_id: data.user.id,
      max_locations: limits.max_locations,
      max_users: limits.max_users,
      max_invoices_per_month: limits.max_invoices_per_month,
      is_trial: true,
      trial_ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select()
    .single();

  if (orgError) {
    console.warn('Org creation failed:', orgError.message);
    return data;
  }

  // 4. Set them as owner of their new tenant
  if (org) {
    await supabase
      .from('profiles')
      .update({ org_id: org.id, role: 'owner' })
      .eq('id', data.user.id);
  }

  return data;
}

// ─── Sign In ────────────────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;

  if (data.user) {
    await ensureUserHasOrg(data.user);
  }

  return data;
}

// ─── Ensure user has an organization ────────────────────────────────
// Safety net: if a user signs in and somehow has no org (legacy bug),
// give them their own fallback tenant.
async function ensureUserHasOrg(user: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (profile && !profile.org_id) {
    const fullName = user.user_metadata?.full_name || user.email;
    const limits = PLAN_LIMITS.starter;
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: `${fullName}'s Organization`,
        type: 'restaurant',
        plan: 'starter',
        owner_id: user.id,
        max_locations: limits.max_locations,
        max_users: limits.max_users,
        max_invoices_per_month: limits.max_invoices_per_month,
        is_trial: true,
        trial_ends_at: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (org) {
      await supabase
        .from('profiles')
        .update({ org_id: org.id, role: 'owner' })
        .eq('id', user.id);
    }
  }
}

// ─── Sign Out ───────────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ─── Get current session ────────────────────────────────────────────
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

// ─── Get user role from metadata ────────────────────────────────────
export function getUserRole(user: any): AppUserRole {
  const role = user?.user_metadata?.role;
  if (role === 'admin' || role === 'owner' || role === 'manager') return 'admin';
  return 'chef';
}

// ─── Get user display name ──────────────────────────────────────────
export function getUserName(user: any): string {
  return user?.user_metadata?.full_name || user?.email || 'User';
}

// ─── Listen for auth state changes ──────────────────────────────────
export function onAuthStateChange(callback: (user: any | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null);
  });
  return data.subscription;
}
