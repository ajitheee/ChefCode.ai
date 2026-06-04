import React, { useRef, useState, useEffect } from 'react';
import { Upload, Database, CheckCircle2, AlertCircle, Plus, Save, X, MapPin, Building2, Hash, Trash2, Edit2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';
import { importProductsFromExcel } from '../services/productService';
import { supabase } from '../services/supabaseClient';

interface LocationRow {
  id: string;
  name: string;
  location_code: string;
  address?: string;
}

interface VendorRow {
  id: string;
  canonical_name: string;
  account_code: string;
  type: string;
}

export const AdminPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Location & vendor code management
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [activeSection, setActiveSection] = useState<'products' | 'locations' | 'vendors'>('locations');

  // Add/edit forms
  const [newLocation, setNewLocation] = useState({ name: '', location_code: '', address: '' });
  const [newVendor, setNewVendor] = useState({ name: '', account_code: '', type: 'food' });
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editLocCode, setEditLocCode] = useState('');
  const [editVendorCode, setEditVendorCode] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocations();
    loadVendors();
  }, []);

  const loadLocations = async () => {
    const { data } = await supabase
      .from('locations')
      .select('id, name, location_code, address')
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
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
    if (!profile?.org_id) { setSaving(false); return; }

    const { error } = await supabase.from('locations').insert({
      org_id: profile.org_id,
      name: newLocation.name,
      location_code: newLocation.location_code,
      address: newLocation.address || null,
    });

    if (!error) {
      setNewLocation({ name: '', location_code: '', address: '' });
      await loadLocations();
    }
    setSaving(false);
  };

  const handleUpdateLocationCode = async (id: string, code: string) => {
    await supabase.from('locations').update({ location_code: code }).eq('id', id);
    setEditingLocId(null);
    await loadLocations();
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
                <div key={loc.id} className="px-6 py-3.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
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
                    {editingLocId === loc.id ? (
                      <>
                        <input
                          type="text"
                          value={editLocCode}
                          onChange={(e) => setEditLocCode(e.target.value)}
                          className="w-28 text-sm font-mono border-slate-200 rounded-lg py-1.5 px-2.5 focus:ring-cyan-400 focus:border-cyan-400"
                          placeholder="170130"
                          autoFocus
                        />
                        <button onClick={() => handleUpdateLocationCode(loc.id, editLocCode)} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><Save size={14} /></button>
                        <button onClick={() => setEditingLocId(null)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <span className={`text-sm font-mono font-bold px-3 py-1 rounded-lg ${loc.location_code ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                          {loc.location_code || 'No code set'}
                        </span>
                        <button
                          onClick={() => { setEditingLocId(loc.id); setEditLocCode(loc.location_code || ''); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
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
