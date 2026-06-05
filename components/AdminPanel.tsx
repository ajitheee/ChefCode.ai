import React, { useRef, useState, useEffect } from 'react';
import { Upload, Database, CheckCircle2, AlertCircle, Plus, Save, X, MapPin, Building2, Hash, Trash2, Edit2, Users, Tag, Lock, Shield } from 'lucide-react';
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
  const [activeSection, setActiveSection] = useState<'products' | 'locations' | 'vendors' | 'team'>('locations');

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
    loadTeam();
  }, []);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('processing');
    setMessage('Reading file...');
    const reader = new FileReader();
    reader.onload = (evt) => {
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
        const addedCount = importProductsFromExcel(products);
        setStatus('success');
        setMessage(`Successfully imported ${addedCount} new products from ${products.length} rows.`);
      } catch (error) {
        setStatus('error');
        setMessage('Failed to parse Excel file.');
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
          { key: 'team' as const, label: 'Team Members', icon: Users },
          { key: 'products' as const, label: 'Product Database', icon: Database },
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
          TEAM MEMBERS
          ═══════════════════════════════════════════════ */}
      {activeSection === 'team' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Team Members</h3>
              <p className="text-xs text-slate-500 mt-0.5">Assign roles and locations. Chef/Viewer are locked to their location.</p>
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
    </div>
  );
};
