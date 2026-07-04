import React, { useRef, useState, useEffect } from 'react';
import { Upload, Database, CheckCircle2, AlertCircle, Plus, Save, X, MapPin, Building2, Hash, Trash2, Edit2, Users, Tag, Lock, Shield, Settings as SettingsIcon, KeyRound, User } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';
import { importProductsFromExcel } from '../services/productService';
import { supabase } from '../services/supabaseClient';

interface LocationRow {
  id: string;
  name: string;
  location_code: string;
  address?: string;
  address_keywords?: string[];
}

interface VendorRow {
  id: string;
  canonical_name: string;
  account_code: string;
  type: string;
}

interface TeamMemberRow {
  id: string;
  full_name: string;
  role: string;
  location_id: string | null;
  location_name?: string;
  access_location_ids: string[]; // UUIDs of all locations this user can access
}

export const AdminPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Location & vendor code management
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<'products' | 'locations' | 'vendors' | 'glcodes' | 'team' | 'settings'>('locations');

  // GL codes (chart of accounts) — DB-backed
  const [glCodes, setGlCodes] = useState<{ id: string; code: string; category: string; description: string | null; type: string }[]>([]);
  const [newGlCode, setNewGlCode] = useState({ code: '', category: '', description: '', type: 'food' });
  const [glMsg, setGlMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Vendor bulk-import feedback + file input
  const [vendorMsg, setVendorMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const vendorFileRef = useRef<HTMLInputElement>(null);

  // Settings section (tenant + my account)
  const [myProfile, setMyProfile] = useState<{ id: string; full_name: string; email: string; role: string } | null>(null);
  const [orgInfo, setOrgInfo] = useState<{ id: string; name: string; plan: string } | null>(null);
  const [editTenantName, setEditTenantName] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [pwForm, setPwForm] = useState({ pw: '', confirm: '' });
  const [settingsMsg, setSettingsMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Invite form
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'chef', location_id: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Add/edit forms
  const [newLocation, setNewLocation] = useState({ name: '', location_code: '', address: '' });
  const [newVendor, setNewVendor] = useState({ name: '', account_code: '', type: 'food' });
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editLocCode, setEditLocCode] = useState('');
  const [editLocKeywords, setEditLocKeywords] = useState('');
  const [editVendorCode, setEditVendorCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocations();
    loadVendors();
    loadGlCodes();
    loadTeam();
    loadPendingInvites();
    loadSettings();
  }, []);

  // ─── Settings: tenant + my account ──────────────────────────
  const loadSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, role, org_id')
      .eq('id', user.id)
      .single();
    if (!profile) return;
    setMyProfile({ id: user.id, full_name: profile.full_name || '', email: user.email || '', role: profile.role || '' });
    setEditFullName(profile.full_name || '');
    if (profile.org_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, plan')
        .eq('id', profile.org_id)
        .single();
      if (org) {
        setOrgInfo(org);
        setEditTenantName(org.name || '');
      }
    }
  };

  const handleSaveTenantName = async () => {
    if (!orgInfo || !editTenantName.trim()) return;
    setSettingsSaving(true);
    setSettingsMsg(null);
    const { error } = await supabase
      .from('organizations')
      .update({ name: editTenantName.trim() })
      .eq('id', orgInfo.id);
    if (error) {
      setSettingsMsg({ type: 'error', text: error.message });
    } else {
      setOrgInfo({ ...orgInfo, name: editTenantName.trim() });
      setSettingsMsg({ type: 'success', text: 'Tenant ID updated. Everyone must use the new name at sign-in from now on.' });
    }
    setSettingsSaving(false);
  };

  const handleSaveProfile = async () => {
    if (!myProfile || !editFullName.trim()) return;
    setSettingsSaving(true);
    setSettingsMsg(null);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editFullName.trim() })
      .eq('id', myProfile.id);
    if (error) {
      setSettingsMsg({ type: 'error', text: error.message });
    } else {
      // Keep auth metadata in sync so the sidebar greeting updates too
      await supabase.auth.updateUser({ data: { full_name: editFullName.trim() } });
      setMyProfile({ ...myProfile, full_name: editFullName.trim() });
      setSettingsMsg({ type: 'success', text: 'Profile updated.' });
    }
    setSettingsSaving(false);
  };

  const handleChangePassword = async () => {
    if (pwForm.pw.length < 6) {
      setSettingsMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (pwForm.pw !== pwForm.confirm) {
      setSettingsMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setSettingsSaving(true);
    setSettingsMsg(null);
    const { error } = await supabase.auth.updateUser({ password: pwForm.pw });
    if (error) {
      setSettingsMsg({ type: 'error', text: error.message });
    } else {
      setPwForm({ pw: '', confirm: '' });
      setSettingsMsg({ type: 'success', text: 'Password changed successfully.' });
    }
    setSettingsSaving(false);
  };

  const loadLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('id, name, location_code, address, address_keywords')
      .eq('is_active', true)
      .order('name');
    setLocations(data || []);
  };

  const loadVendors = async () => {
    const { data } = await supabase
      .from('vendors')
      .select('id, canonical_name, account_code, type')
      .eq('is_active', true)
      .order('canonical_name');
    setVendors(data || []);
  };

  const handleAddLocation = async () => {
    if (!newLocation.name.trim() || !newLocation.location_code.trim()) return;
    setSaving(true);

    // Get org_id from profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data: profile } = await supabase.from('profiles').select('org_id, role').eq('id', user.id).single();
    if (!profile?.org_id) { setSaving(false); return; }

    // 1. Create the location
    const { data: newLoc, error } = await supabase
      .from('locations')
      .insert({
        org_id: profile.org_id,
        name: newLocation.name,
        location_code: newLocation.location_code,
        address: newLocation.address || null,
      })
      .select()
      .single();

    // 2. Auto-grant the creator access to the new location
    if (!error && newLoc) {
      await supabase.from('user_location_access').insert({
        user_id: user.id,
        location_id: newLoc.id,
        role: profile.role || 'owner',
      });

      setNewLocation({ name: '', location_code: '', address: '' });
      await loadLocations();
    }
    setSaving(false);
  };

  const handleUpdateLocationCode = async (id: string, code: string, keywordsStr: string) => {
    const keywords = keywordsStr
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    await supabase
      .from('locations')
      .update({ location_code: code, address_keywords: keywords })
      .eq('id', id);
    setEditingLocId(null);
    await loadLocations();
  };

  // ─── Team Member Management ─────────────────────────────────
  const loadTeam = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: myProfile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
    if (!myProfile?.org_id) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, role, location_id')
      .eq('org_id', myProfile.org_id)
      .eq('is_active', true)
      .order('full_name');

    if (!profiles) return;

    // Fetch all location access entries for these users
    const userIds = profiles.map(p => p.id);
    const { data: accessRows } = await supabase
      .from('user_location_access')
      .select('user_id, location_id')
      .in('user_id', userIds);

    // Build access map: user_id -> Set<location_id>
    const accessMap: Record<string, string[]> = {};
    (accessRows || []).forEach((r: any) => {
      if (!accessMap[r.user_id]) accessMap[r.user_id] = [];
      accessMap[r.user_id].push(r.location_id);
    });

    setTeam(profiles.map(p => ({
      id: p.id,
      full_name: p.full_name || 'Unnamed',
      role: p.role || 'chef',
      location_id: p.location_id,
      access_location_ids: accessMap[p.id] || [],
    })));
  };

  // Update role on the profile (cross-org default role)
  const handleUpdateTeamRole = async (userId: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', userId);
    await loadTeam();
  };

  // ─── Invitations ─────────────────────────────────────────────
  const loadPendingInvites = async () => {
    const { data } = await supabase
      .from('invitations')
      .select('id, email, role, location_id, status, created_at, expires_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setPendingInvites(data || []);
  };

  const handleSendInvite = async () => {
    if (!inviteForm.email.trim()) {
      setInviteMsg({ type: 'error', text: 'Email is required.' });
      return;
    }

    setInviteLoading(true);
    setInviteMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated.');
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
      if (!profile?.org_id) throw new Error('No organization found.');

      // 1. Create invitation record (the DB trigger will use this when invitee signs up)
      const { error: invErr } = await supabase
        .from('invitations')
        .upsert({
          org_id: profile.org_id,
          email: inviteForm.email.toLowerCase().trim(),
          role: inviteForm.role,
          location_id: inviteForm.location_id || null,
          invited_by: user.id,
          status: 'pending',
        }, { onConflict: 'org_id,email' });

      if (invErr) throw invErr;

      // 2. Try sending verification email via Edge Function (if deployed)
      let emailSent = false;
      try {
        const { data: fnRes, error: fnErr } = await supabase.functions.invoke('invite-user', {
          body: { email: inviteForm.email.toLowerCase().trim() },
        });
        if (!fnErr && fnRes?.ok) emailSent = true;
      } catch {
        // Edge function not deployed — that's OK, fallback to manual instructions
      }

      setInviteMsg({
        type: 'success',
        text: emailSent
          ? `Invitation email sent to ${inviteForm.email}. They'll get a link to set their password and join.`
          : `Invitation saved for ${inviteForm.email}. Ask them to sign up at chefcode.cc/app with this email — they'll be auto-added to your org.`,
      });
      setInviteForm({ email: '', role: 'chef', location_id: '' });
      await loadPendingInvites();
    } catch (e: any) {
      setInviteMsg({ type: 'error', text: e.message || 'Failed to send invitation.' });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleCancelInvite = async (id: string) => {
    await supabase.from('invitations').delete().eq('id', id);
    await loadPendingInvites();
  };

  // Toggle a single location's access for a user
  const handleToggleLocationAccess = async (userId: string, locationId: string, currentlyHas: boolean, role: string) => {
    if (currentlyHas) {
      await supabase
        .from('user_location_access')
        .delete()
        .eq('user_id', userId)
        .eq('location_id', locationId);
    } else {
      await supabase
        .from('user_location_access')
        .insert({ user_id: userId, location_id: locationId, role });
    }
    await loadTeam();
  };

  const handleAddVendorCode = async () => {
    if (!newVendor.name.trim() || !newVendor.account_code.trim()) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
    if (!profile?.org_id) { setSaving(false); return; }

    const { error } = await supabase.from('vendors').insert({
      org_id: profile.org_id,
      canonical_name: newVendor.name,
      account_code: newVendor.account_code,
      type: newVendor.type,
      aliases: [newVendor.name.toLowerCase()],
    });

    if (!error) {
      setNewVendor({ name: '', account_code: '', type: 'food' });
      await loadVendors();
    }
    setSaving(false);
  };

  const handleUpdateVendorCode = async (id: string, code: string) => {
    await supabase.from('vendors').update({ account_code: code }).eq('id', id);
    setEditingVendorId(null);
    await loadVendors();
  };

  // ─── Vendor bulk import (CSV / Excel) ───────────────────────
  const handleVendorUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVendorMsg(null);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws) as any[];
        const parsed = rows.map((r) => {
          const t = String(r['Type'] || r['type'] || 'food').toLowerCase();
          return {
            canonical_name: String(r['Vendor Name'] || r['Vendor'] || r['Name'] || r['canonical_name'] || '').trim(),
            account_code: String(r['Account Code'] || r['Code'] || r['Account'] || r['account_code'] || '').trim(),
            type: t.includes('non') ? 'non_food' : t.includes('both') ? 'both' : 'food',
          };
        }).filter((v) => v.canonical_name);

        if (parsed.length === 0) {
          setVendorMsg({ type: 'error', text: 'No vendors found. Expected columns: Vendor Name, Account Code, Type.' });
          return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setVendorMsg({ type: 'error', text: 'Not signed in.' }); return; }
        const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
        if (!profile?.org_id) { setVendorMsg({ type: 'error', text: 'No organization found.' }); return; }

        const seen = new Set(vendors.map((v) => v.canonical_name.toLowerCase()));
        const toInsert = parsed
          .filter((v) => { const k = v.canonical_name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
          .map((v) => ({
            org_id: profile.org_id,
            canonical_name: v.canonical_name,
            account_code: v.account_code || null,
            type: v.type,
            aliases: [v.canonical_name.toLowerCase()],
          }));

        if (toInsert.length === 0) {
          setVendorMsg({ type: 'success', text: 'All vendors in the file already exist — nothing to add.' });
          return;
        }
        const { error } = await supabase.from('vendors').insert(toInsert);
        if (error) setVendorMsg({ type: 'error', text: error.message });
        else { setVendorMsg({ type: 'success', text: `Imported ${toInsert.length} vendors to the database.` }); await loadVendors(); }
      } catch (err: any) {
        setVendorMsg({ type: 'error', text: err?.message || 'Failed to import vendors.' });
      } finally {
        if (vendorFileRef.current) vendorFileRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  // ─── GL codes (chart of accounts) ───────────────────────────
  const loadGlCodes = async () => {
    const { data } = await supabase
      .from('gl_codes')
      .select('id, code, category, description, type')
      .eq('is_active', true)
      .order('code');
    setGlCodes(data || []);
  };

  const handleAddGlCode = async () => {
    if (!newGlCode.code.trim() || !newGlCode.category.trim()) return;
    setSaving(true);
    setGlMsg(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
    if (!profile?.org_id) { setSaving(false); return; }

    const { error } = await supabase.from('gl_codes').insert({
      org_id: profile.org_id,
      code: newGlCode.code.trim(),
      category: newGlCode.category.trim(),
      description: newGlCode.description.trim() || null,
      type: newGlCode.type,
    });
    if (error) setGlMsg({ type: 'error', text: error.message });
    else { setNewGlCode({ code: '', category: '', description: '', type: 'food' }); await loadGlCodes(); }
    setSaving(false);
  };

  const handleDeleteGlCode = async (id: string) => {
    const { error } = await supabase.from('gl_codes').delete().eq('id', id);
    if (error) setGlMsg({ type: 'error', text: error.message });
    else await loadGlCodes();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('processing');
    setMessage('Reading file...');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        const products: Product[] = data.map((row: any) => ({
          productNo: String(row['Product Number'] || row['productNo'] || row['Item'] || ''),
          description: String(row['Description'] || row['description'] || ''),
          category: String(row['Category'] || row['category'] || 'Uncategorized'),
          code: String(row['GL Code'] || row['code'] || '')
        })).filter(p => p.description && p.code);
        const addedCount = await importProductsFromExcel(products);
        setStatus('success');
        setMessage(`Successfully imported ${addedCount} new products to the database from ${products.length} rows.`);
      } catch (error: any) {
        setStatus('error');
        setMessage(error?.message || 'Failed to import products.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-5xl mx-auto py-6">
      {/* ── Section Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 mb-8 w-fit">
        {[
          { key: 'locations' as const, label: 'Locations & Codes', icon: MapPin },
          { key: 'vendors' as const, label: 'Vendor Accounts', icon: Building2 },
          { key: 'glcodes' as const, label: 'GL Codes', icon: Tag },
          { key: 'team' as const, label: 'Team Members', icon: Users },
          { key: 'products' as const, label: 'Product Database', icon: Database },
          { key: 'settings' as const, label: 'Settings', icon: SettingsIcon },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeSection === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════
          LOCATIONS & CODES
          ═══════════════════════════════════════════════ */}
      {activeSection === 'locations' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Locations & Codes</h3>
                <p className="text-xs text-slate-500 mt-0.5">Each location has a unique code used in invoice references</p>
              </div>
            </div>

            {/* Location list */}
            <div className="divide-y divide-slate-100">
              {locations.map(loc => (
                <div key={loc.id} className="px-6 py-3.5 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
                        <MapPin size={14} className="text-cyan-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{loc.name}</p>
                        {loc.address && <p className="text-xs text-slate-400 truncate">{loc.address}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {editingLocId !== loc.id && (
                        <>
                          <span className={`text-sm font-mono font-bold px-3 py-1 rounded-lg ${loc.location_code ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                            {loc.location_code || 'No code'}
                          </span>
                          <button
                            onClick={() => {
                              setEditingLocId(loc.id);
                              setEditLocCode(loc.location_code || '');
                              setEditLocKeywords((loc.address_keywords || []).join(', '));
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Address Keywords (always visible, click to expand if any) */}
                  {editingLocId !== loc.id && (loc.address_keywords?.length || 0) > 0 && (
                    <div className="mt-2 ml-11 flex items-center gap-2 flex-wrap">
                      <Tag size={11} className="text-slate-400" />
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Address Match:</span>
                      {(loc.address_keywords || []).map((kw, i) => (
                        <span key={i} className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Inline Edit Form */}
                  {editingLocId === loc.id && (
                    <div className="mt-3 ml-11 grid grid-cols-1 md:grid-cols-[140px_1fr_auto] gap-2 items-start">
                      <input
                        type="text"
                        value={editLocCode}
                        onChange={(e) => setEditLocCode(e.target.value)}
                        className="text-sm font-mono border-slate-200 rounded-lg py-1.5 px-2.5 focus:ring-cyan-400 focus:border-cyan-400"
                        placeholder="Location code"
                        autoFocus
                      />
                      <input
                        type="text"
                        value={editLocKeywords}
                        onChange={(e) => setEditLocKeywords(e.target.value)}
                        className="text-sm border-slate-200 rounded-lg py-1.5 px-2.5 focus:ring-cyan-400 focus:border-cyan-400"
                        placeholder="Address keywords (comma-separated): centerpointe, 3801 W Temple, ..."
                      />
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleUpdateLocationCode(loc.id, editLocCode, editLocKeywords)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Save size={14} /></button>
                        <button onClick={() => setEditingLocId(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={14} /></button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {locations.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No locations yet. Add your first location below.
                </div>
              )}
            </div>

            {/* Add new location */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add New Location</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLocation.name}
                  onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                  placeholder="Location name (e.g. Centerpointe)"
                  className="flex-1 text-sm border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400"
                />
                <input
                  type="text"
                  value={newLocation.location_code}
                  onChange={(e) => setNewLocation({ ...newLocation, location_code: e.target.value })}
                  placeholder="Code (e.g. 170130)"
                  className="w-32 text-sm font-mono border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400"
                />
                <input
                  type="text"
                  value={newLocation.address}
                  onChange={(e) => setNewLocation({ ...newLocation, address: e.target.value })}
                  placeholder="Address (optional)"
                  className="flex-1 text-sm border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400 hidden lg:block"
                />
                <button
                  onClick={handleAddLocation}
                  disabled={saving || !newLocation.name.trim() || !newLocation.location_code.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          VENDOR ACCOUNTS
          ═══════════════════════════════════════════════ */}
      {activeSection === 'vendors' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Vendor Account Codes</h3>
              <p className="text-xs text-slate-500 mt-0.5">Account codes are the same across all locations (e.g. F02124 for Sysco)</p>
            </div>

            {/* Bulk import */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/30">
              <p className="text-xs text-slate-500">Bulk import from a spreadsheet — columns: <span className="font-mono">Vendor Name</span>, <span className="font-mono">Account Code</span>, <span className="font-mono">Type</span></p>
              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-xs font-semibold rounded-lg text-slate-600 bg-white hover:bg-slate-50 cursor-pointer transition-colors shrink-0">
                <Upload size={13} /> Upload CSV/Excel
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={vendorFileRef} onChange={handleVendorUpload} />
              </label>
            </div>
            {vendorMsg && (
              <div className={`px-6 py-2.5 text-xs flex items-center gap-2 border-b border-slate-100 ${vendorMsg.type === 'success' ? 'text-emerald-700 bg-emerald-50/50' : 'text-red-700 bg-red-50/50'}`}>
                {vendorMsg.type === 'success' ? <CheckCircle2 size={13} className="shrink-0" /> : <AlertCircle size={13} className="shrink-0" />} {vendorMsg.text}
              </div>
            )}

            {/* Vendor list */}
            <div className="divide-y divide-slate-100">
              {vendors.map(v => (
                <div key={v.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${v.type === 'food' ? 'bg-emerald-50' : v.type === 'non_food' ? 'bg-violet-50' : 'bg-amber-50'}`}>
                      <Building2 size={14} className={v.type === 'food' ? 'text-emerald-600' : v.type === 'non_food' ? 'text-violet-600' : 'text-amber-600'} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{v.canonical_name}</p>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{v.type === 'non_food' ? 'Non-Food' : v.type === 'both' ? 'Food & Non-Food' : 'Food'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingVendorId === v.id ? (
                      <>
                        <input
                          type="text"
                          value={editVendorCode}
                          onChange={(e) => setEditVendorCode(e.target.value)}
                          className="w-28 text-sm font-mono border-slate-200 rounded-lg py-1.5 px-2.5 focus:ring-cyan-400 focus:border-cyan-400"
                          placeholder="F02124"
                          autoFocus
                        />
                        <button onClick={() => handleUpdateVendorCode(v.id, editVendorCode)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Save size={14} /></button>
                        <button onClick={() => setEditingVendorId(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <span className={`text-sm font-mono font-bold px-3 py-1 rounded-lg ${v.account_code ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                          {v.account_code || 'No code'}
                        </span>
                        <button
                          onClick={() => { setEditingVendorId(v.id); setEditVendorCode(v.account_code || ''); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}

              {vendors.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No vendors yet. Add your first vendor below.
                </div>
              )}
            </div>

            {/* Add new vendor */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add New Vendor</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                  placeholder="Vendor name (e.g. Sysco)"
                  className="flex-1 text-sm border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400"
                />
                <input
                  type="text"
                  value={newVendor.account_code}
                  onChange={(e) => setNewVendor({ ...newVendor, account_code: e.target.value })}
                  placeholder="Account (e.g. F02124)"
                  className="w-32 text-sm font-mono border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400"
                />
                <select
                  value={newVendor.type}
                  onChange={(e) => setNewVendor({ ...newVendor, type: e.target.value })}
                  className="w-28 text-sm border-slate-200 rounded-lg py-2 px-2 focus:ring-cyan-400 focus:border-cyan-400"
                >
                  <option value="food">Food</option>
                  <option value="non_food">Non-Food</option>
                  <option value="both">Both</option>
                </select>
                <button
                  onClick={handleAddVendorCode}
                  disabled={saving || !newVendor.name.trim() || !newVendor.account_code.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          GL CODES (chart of accounts)
          ═══════════════════════════════════════════════ */}
      {activeSection === 'glcodes' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Chart of Accounts (GL Codes)</h3>
              <p className="text-xs text-slate-500 mt-0.5">The GL codes your invoices are coded to — the AI uses this list when coding line items</p>
            </div>

            {glMsg && (
              <div className={`px-6 py-2.5 text-xs flex items-center gap-2 border-b border-slate-100 ${glMsg.type === 'success' ? 'text-emerald-700 bg-emerald-50/50' : 'text-red-700 bg-red-50/50'}`}>
                {glMsg.type === 'success' ? <CheckCircle2 size={13} className="shrink-0" /> : <AlertCircle size={13} className="shrink-0" />} {glMsg.text}
              </div>
            )}

            {/* GL code list */}
            <div className="divide-y divide-slate-100">
              {glCodes.map((g) => (
                <div key={g.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm font-mono font-bold px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-100 shrink-0">{g.code}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{g.category}</p>
                      {g.description && <p className="text-[11px] text-slate-400 truncate">{g.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{g.type === 'non_food' ? 'Non-Food' : 'Food'}</span>
                    <button onClick={() => handleDeleteGlCode(g.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
              {glCodes.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-slate-500">No GL codes yet. Add your first below.</div>
              )}
            </div>

            {/* Add GL code */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Add GL Code</p>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={newGlCode.code}
                  onChange={(e) => setNewGlCode({ ...newGlCode, code: e.target.value })}
                  placeholder="Code (6321)"
                  className="w-28 text-sm font-mono border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400"
                />
                <input
                  type="text"
                  value={newGlCode.category}
                  onChange={(e) => setNewGlCode({ ...newGlCode, category: e.target.value })}
                  placeholder="Category (e.g. Meats)"
                  className="flex-1 min-w-[8rem] text-sm border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400"
                />
                <input
                  type="text"
                  value={newGlCode.description}
                  onChange={(e) => setNewGlCode({ ...newGlCode, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="flex-1 min-w-[8rem] text-sm border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400"
                />
                <select
                  value={newGlCode.type}
                  onChange={(e) => setNewGlCode({ ...newGlCode, type: e.target.value })}
                  className="w-28 text-sm border-slate-200 rounded-lg py-2 px-2 focus:ring-cyan-400 focus:border-cyan-400"
                >
                  <option value="food">Food</option>
                  <option value="non_food">Non-Food</option>
                </select>
                <button
                  onClick={handleAddGlCode}
                  disabled={saving || !newGlCode.code.trim() || !newGlCode.category.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Plus size={14} />
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TEAM MEMBERS
          ═══════════════════════════════════════════════ */}
      {activeSection === 'team' && (
        <div className="space-y-4">

          {/* ── Invite User Form ── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-cyan-50 to-blue-50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users size={14} className="text-cyan-600" /> Invite a Team Member
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">Enter their email, role, and location. They'll get a verification link to set their password.</p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2">
              <input
                type="email"
                value={inviteForm.email}
                onChange={(e) => { setInviteForm({ ...inviteForm, email: e.target.value }); setInviteMsg(null); }}
                placeholder="user@company.com"
                className="text-sm border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400"
              />
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="text-sm border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400 cursor-pointer"
              >
                <option value="chef">Chef</option>
                <option value="manager">Manager</option>
                <option value="viewer">Viewer</option>
                <option value="owner">Owner</option>
              </select>
              <select
                value={inviteForm.location_id}
                onChange={(e) => setInviteForm({ ...inviteForm, location_id: e.target.value })}
                className="text-sm border-slate-200 rounded-lg py-2 px-3 focus:ring-cyan-400 focus:border-cyan-400 cursor-pointer min-w-[150px]"
              >
                <option value="">— Select location —</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <button
                onClick={handleSendInvite}
                disabled={inviteLoading || !inviteForm.email.trim()}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-600 text-white text-sm font-semibold rounded-lg hover:bg-cyan-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {inviteLoading ? '...' : <><Plus size={14} /> Send Invite</>}
              </button>
            </div>

            {/* Success / error message */}
            {inviteMsg && (
              <div className={`mx-5 mb-5 p-3 rounded-lg text-sm border ${
                inviteMsg.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                {inviteMsg.text}
              </div>
            )}

            {/* Pending Invitations */}
            {pendingInvites.length > 0 && (
              <div className="px-5 pb-5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pending Invitations ({pendingInvites.length})</p>
                <div className="space-y-1.5">
                  {pendingInvites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-50/50 border border-amber-100 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md uppercase">Pending</span>
                        <span className="text-sm font-medium text-slate-700 truncate">{inv.email}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{inv.role}</span>
                      </div>
                      <button
                        onClick={() => handleCancelInvite(inv.id)}
                        className="text-[11px] font-semibold text-slate-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Team Members List ── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Team Members</h3>
              <p className="text-xs text-slate-500 mt-0.5">Click location pills to grant or revoke access. Each user sees only their accessible locations.</p>
            </div>

            <div className="divide-y divide-slate-100">
              {team.map(member => (
                <div key={member.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                  {/* Row 1: Avatar, name, role */}
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                        member.role === 'owner' ? 'bg-gradient-to-br from-amber-400 to-orange-500' :
                        member.role === 'manager' ? 'bg-gradient-to-br from-violet-400 to-purple-500' :
                        member.role === 'chef' ? 'bg-gradient-to-br from-cyan-400 to-blue-500' :
                        'bg-gradient-to-br from-slate-400 to-slate-500'
                      }`}>
                        {member.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{member.full_name}</p>
                        <p className="text-[11px] text-slate-400">
                          {member.access_location_ids.length === 0
                            ? 'No location access'
                            : `Access to ${member.access_location_ids.length} location${member.access_location_ids.length > 1 ? 's' : ''}`}
                        </p>
                      </div>
                    </div>

                    {/* Role selector */}
                    <select
                      value={member.role}
                      onChange={(e) => handleUpdateTeamRole(member.id, e.target.value)}
                      className={`text-xs font-bold py-1.5 px-2.5 rounded-lg border appearance-none cursor-pointer shrink-0 ${
                        member.role === 'owner' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        member.role === 'manager' ? 'bg-violet-50 text-violet-700 border-violet-200' :
                        member.role === 'chef' ? 'bg-cyan-50 text-cyan-700 border-cyan-200' :
                        'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="chef">Chef</option>
                      <option value="viewer">Viewer</option>
                    </select>
                  </div>

                  {/* Row 2: Location access pills (click to toggle) */}
                  <div className="ml-12 flex flex-wrap items-center gap-1.5">
                    <Lock size={11} className="text-slate-400 mr-0.5" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mr-1">Access:</span>
                    {locations.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No locations exist yet — create one above</span>
                    ) : (
                      locations.map(loc => {
                        const hasAccess = member.access_location_ids.includes(loc.id);
                        return (
                          <button
                            key={loc.id}
                            onClick={() => handleToggleLocationAccess(member.id, loc.id, hasAccess, member.role)}
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                              hasAccess
                                ? 'bg-cyan-500 text-white shadow-sm hover:bg-cyan-600'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {loc.name}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}

              {team.length === 0 && (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No team members yet.
                </div>
              )}
            </div>

            {/* Instructions for inviting new users */}
            <div className="px-6 py-4 bg-blue-50/50 border-t border-blue-100">
              <div className="flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 rounded-lg shrink-0">
                  <Shield size={14} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-blue-900">To Add a New Team Member</p>
                  <p className="text-xs text-blue-700 mt-0.5 leading-relaxed">
                    1. Ask them to sign up at <span className="font-mono bg-white px-1.5 py-0.5 rounded">chefcode.cc/app</span> with their work email.
                    <br />
                    2. After they sign up, refresh this page — their name will appear above.
                    <br />
                    3. Assign their role and location here.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Role legend */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { role: 'Owner', desc: 'Full access. Manages everything.', color: 'amber' },
              { role: 'Manager', desc: 'Cross-location access. No admin.', color: 'violet' },
              { role: 'Chef', desc: 'Locked to one location.', color: 'cyan' },
              { role: 'Viewer', desc: 'Read-only at one location.', color: 'slate' },
            ].map(r => (
              <div key={r.role} className={`bg-${r.color}-50/50 border border-${r.color}-100 rounded-xl p-3`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full bg-${r.color}-500`} />
                  <span className={`text-xs font-bold text-${r.color}-800`}>{r.role}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          PRODUCT DATABASE (existing)
          ═══════════════════════════════════════════════ */}
      {activeSection === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Master Product Database</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload Excel/CSV to bulk import products with GL codes
            </p>
          </div>

          <div className="p-6">
            <div className="flex items-center justify-center w-full">
              <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-52 border-2 border-slate-200 border-dashed rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                <div className="flex flex-col items-center justify-center py-6">
                  <Upload className="w-8 h-8 mb-3 text-slate-400" />
                  <p className="mb-1 text-sm text-slate-600"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                  <p className="text-xs text-slate-400">XLSX, XLS, or CSV — columns: Product Number, Description, Category, GL Code</p>
                </div>
                <input
                  id="dropzone-file"
                  type="file"
                  className="hidden"
                  accept=".xlsx, .xls, .csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </label>
            </div>

            {status === 'processing' && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-700 rounded-xl flex items-center text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
                {message}
              </div>
            )}
            {status === 'success' && (
              <div className="mt-4 p-3 bg-emerald-50 text-emerald-700 rounded-xl flex items-center text-sm">
                <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" /> {message}
              </div>
            )}
            {status === 'error' && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-xl flex items-center text-sm">
                <AlertCircle className="h-4 w-4 mr-2 shrink-0" /> {message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          SETTINGS (tenant + my account)
          ═══════════════════════════════════════════════ */}
      {activeSection === 'settings' && (
        <div className="space-y-6">

          {settingsMsg && (
            <div className={`p-3 rounded-xl flex items-center text-sm ${
              settingsMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
            }`}>
              {settingsMsg.type === 'success'
                ? <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" />
                : <AlertCircle className="h-4 w-4 mr-2 shrink-0" />}
              {settingsMsg.text}
            </div>
          )}

          {/* ── Tenant Card ── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Building2 size={15} className="text-cyan-600" /> Tenant
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Your Tenant ID — every team member must type this exact name when signing in
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between bg-cyan-50 border border-cyan-200/60 rounded-xl px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold text-cyan-700 uppercase tracking-wider">Current Tenant ID</p>
                  <p className="text-lg font-bold text-slate-900">{orgInfo?.name || '—'}</p>
                </div>
                {orgInfo?.plan && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-cyan-100 text-cyan-700">
                    {orgInfo.plan} plan
                  </span>
                )}
              </div>

              {myProfile?.role === 'owner' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Rename Tenant
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editTenantName}
                      onChange={(e) => setEditTenantName(e.target.value)}
                      className="flex-1 text-sm border-slate-300 rounded-lg py-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder="Tenant name"
                    />
                    <button
                      onClick={handleSaveTenantName}
                      disabled={settingsSaving || !editTenantName.trim() || editTenantName.trim() === orgInfo?.name}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save size={14} /> Save
                    </button>
                  </div>
                  <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle size={12} className="shrink-0" />
                    Renaming changes what everyone types at sign-in. Tell your team before saving.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Only the organization owner can rename the tenant.</p>
              )}
            </div>
          </div>

          {/* ── My Profile Card ── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <User size={15} className="text-cyan-600" /> My Profile
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Your account details</p>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="flex-1 text-sm border-slate-300 rounded-lg py-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Your name"
                  />
                  <button
                    onClick={handleSaveProfile}
                    disabled={settingsSaving || !editFullName.trim() || editFullName.trim() === myProfile?.full_name}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save size={14} />
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="text"
                  value={myProfile?.email || ''}
                  disabled
                  className="w-full text-sm border-slate-200 bg-slate-50 text-slate-500 rounded-lg py-2"
                />
                <p className="text-[11px] text-slate-400 mt-1">Role: <span className="font-semibold capitalize">{myProfile?.role || '—'}</span></p>
              </div>
            </div>
          </div>

          {/* ── Change Password Card ── */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <KeyRound size={15} className="text-cyan-600" /> Change Password
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Minimum 6 characters</p>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  New Password
                </label>
                <input
                  type="password"
                  value={pwForm.pw}
                  onChange={(e) => setPwForm(f => ({ ...f, pw: e.target.value }))}
                  className="w-full text-sm border-slate-300 rounded-lg py-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                  className="w-full text-sm border-slate-300 rounded-lg py-2 focus:ring-cyan-500 focus:border-cyan-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={settingsSaving || !pwForm.pw || !pwForm.confirm}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                <KeyRound size={14} /> Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
