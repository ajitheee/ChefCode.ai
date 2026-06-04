// services/authService.ts
// Real authentication via Supabase Auth
// Replaces the hardcoded admin/admin123, chef/chef123 mock login

import { supabase } from './supabaseClient';

export type AppUserRole = 'admin' | 'chef' | null;

// ─── Sign Up (creates user + org + links profile) ──────────────────
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: 'admin' | 'chef' = 'admin'
) {
  // 1. Create auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Sign up failed');

  // 2. Create an organization for this user
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: `${fullName}'s Organization`, type: 'restaurant' })
    .select()
    .single();

  if (orgError) {
    console.warn('Org creation failed (may need email confirmation first):', orgError.message);
    // Don't throw — user still created. Org will be created on first sign-in if needed.
    return data;
  }

  // 3. Link profile to org
  if (org) {
    await supabase
      .from('profiles')
      .update({ org_id: org.id, role: role === 'admin' ? 'owner' : 'chef' })
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

  // Ensure user has an org (covers case where signup email wasn't confirmed before)
  if (data.user) {
    await ensureUserHasOrg(data.user);
  }

  return data;
}

// ─── Ensure user has an organization ────────────────────────────────
async function ensureUserHasOrg(user: any) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  if (profile && !profile.org_id) {
    const fullName = user.user_metadata?.full_name || user.email;
    const { data: org } = await supabase
      .from('organizations')
      .insert({ name: `${fullName}'s Organization`, type: 'restaurant' })
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
