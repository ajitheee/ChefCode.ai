import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Building2, Users, MapPin, FileText, CheckCircle2, AlertCircle, Search, RefreshCw, ShieldCheck } from 'lucide-react';

// Platform-owner ("super-admin") dashboard — a cross-tenant view of every
// organization that has onboarded, their plan, and controls to change a plan
// manually. Only visible to users flagged is_platform_admin; the database RLS
// (see chefcode_platform_admin.sql) is what actually authorizes the data.

interface OrgRow {
  id: string;
  name: string;
  plan: string;
  is_trial: boolean | null;
  trial_ends_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
  ownerName: string;
  userCount: number;
  locationCount: number;
  invoiceCount: number;
}

const PLANS = ['starter', 'professional', 'enterprise'] as const;

const planBadge = (plan: string) => {
  switch (plan) {
    case 'professional': return 'bg-violet-100 text-violet-700';
    case 'enterprise': return 'bg-amber-100 text-amber-700';
    default: return 'bg-cyan-100 text-cyan-700';
  }
};

export const PlatformDashboard: React.FC = () => {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [orgRes, profRes, locRes, invRes] = await Promise.all([
        supabase.from('organizations').select('id, name, plan, is_trial, trial_ends_at, is_active, created_at').order('created_at', { ascending: false }),
        supabase.from('profiles').select('org_id, full_name, role'),
        supabase.from('locations').select('org_id'),
        supabase.from('invoices').select('org_id'),
      ]);

      if (orgRes.error) throw orgRes.error;

      const profiles = (profRes.data || []) as { org_id: string | null; full_name: string | null; role: string | null }[];
      const locs = (locRes.data || []) as { org_id: string | null }[];
      const invs = (invRes.data || []) as { org_id: string | null }[];

      const countBy = (rows: { org_id: string | null }[]) => {
        const m: Record<string, number> = {};
        rows.forEach(r => { if (r.org_id) m[r.org_id] = (m[r.org_id] || 0) + 1; });
        return m;
      };
      const userCounts = countBy(profiles);
      const locCounts = countBy(locs);
      const invCounts = countBy(invs);
      const ownerByOrg: Record<string, string> = {};
      profiles.forEach(p => { if (p.org_id && p.role === 'owner' && !ownerByOrg[p.org_id]) ownerByOrg[p.org_id] = p.full_name || '—'; });

      const rows: OrgRow[] = (orgRes.data || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        plan: o.plan,
        is_trial: o.is_trial,
        trial_ends_at: o.trial_ends_at,
        is_active: o.is_active,
        created_at: o.created_at,
        ownerName: ownerByOrg[o.id] || '—',
        userCount: userCounts[o.id] || 0,
        locationCount: locCounts[o.id] || 0,
        invoiceCount: invCounts[o.id] || 0,
      }));
      setOrgs(rows);
    } catch (err: any) {
      setError(err.message || 'Failed to load organizations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const changePlan = async (org: OrgRow, newPlan: string) => {
    if (newPlan === org.plan) return;
    setSavingId(org.id);
    setToast(null);
    // Manually setting a plan also converts the tenant off the free trial.
    const { error: updErr } = await supabase
      .from('organizations')
      .update({ plan: newPlan, is_trial: false })
      .eq('id', org.id);
    if (updErr) {
      setToast({ type: 'error', text: `Could not update ${org.name}: ${updErr.message}` });
    } else {
      setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, plan: newPlan, is_trial: false } : o));
      setToast({ type: 'success', text: `${org.name} moved to ${newPlan} (trial ended).` });
    }
    setSavingId(null);
  };

  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

  const trialLabel = (o: OrgRow) => {
    if (!o.is_trial) return { text: 'Paid', cls: 'bg-emerald-100 text-emerald-700' };
    if (!o.trial_ends_at) return { text: 'Trial', cls: 'bg-slate-100 text-slate-600' };
    const days = Math.ceil((new Date(o.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) return { text: 'Trial expired', cls: 'bg-red-100 text-red-700' };
    return { text: `Trial · ${days}d left`, cls: 'bg-amber-100 text-amber-700' };
  };

  const filtered = orgs.filter(o =>
    o.name.toLowerCase().includes(search.toLowerCase()) ||
    o.ownerName.toLowerCase().includes(search.toLowerCase())
  );

  const totals = {
    tenants: orgs.length,
    paid: orgs.filter(o => !o.is_trial).length,
    users: orgs.reduce((s, o) => s + o.userCount, 0),
  };

  return (
    <div className="max-w-6xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl">
            <ShieldCheck className="text-cyan-400" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Platform Admin</h2>
            <p className="text-xs text-slate-500">Every tenant that has onboarded — plans and usage</p>
          </div>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-[13px] font-medium rounded-xl text-slate-600 bg-white hover:bg-slate-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Tenants', value: totals.tenants, icon: Building2 },
          { label: 'Paid', value: totals.paid, icon: CheckCircle2 },
          { label: 'Total Users', value: totals.users, icon: Users },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200/60 shadow-sm p-4 flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg"><s.icon size={16} className="text-slate-500" /></div>
            <div>
              <p className="text-xl font-bold text-slate-900 leading-none">{s.value}</p>
              <p className="text-[11px] text-slate-500 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className={`mb-4 p-3 rounded-xl flex items-center text-sm ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-4 w-4 mr-2 shrink-0" /> : <AlertCircle className="h-4 w-4 mr-2 shrink-0" />}
          {toast.text}
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by tenant or owner name..."
          className="w-full pl-10 text-sm border-slate-300 rounded-xl py-2.5 focus:ring-cyan-500 focus:border-cyan-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
        {error ? (
          <div className="p-6 text-sm text-red-600 flex items-center gap-2"><AlertCircle size={16} /> {error}</div>
        ) : loading ? (
          <div className="p-10 text-center text-sm text-slate-400">Loading tenants…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-400">No tenants found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/60 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
                  <th className="text-left font-semibold px-4 py-3">Tenant</th>
                  <th className="text-left font-semibold px-4 py-3">Owner</th>
                  <th className="text-left font-semibold px-4 py-3">Status</th>
                  <th className="text-center font-semibold px-3 py-3"><Users size={13} className="inline" /></th>
                  <th className="text-center font-semibold px-3 py-3"><MapPin size={13} className="inline" /></th>
                  <th className="text-center font-semibold px-3 py-3"><FileText size={13} className="inline" /></th>
                  <th className="text-left font-semibold px-4 py-3">Joined</th>
                  <th className="text-left font-semibold px-4 py-3">Plan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(o => {
                  const t = trialLabel(o);
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">{o.name}</div>
                        <span className={`inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${planBadge(o.plan)}`}>{o.plan}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{o.ownerName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${t.cls}`}>{t.text}</span>
                      </td>
                      <td className="px-3 py-3 text-center text-slate-600">{o.userCount}</td>
                      <td className="px-3 py-3 text-center text-slate-600">{o.locationCount}</td>
                      <td className="px-3 py-3 text-center text-slate-600">{o.invoiceCount}</td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{fmtDate(o.created_at)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.plan}
                          disabled={savingId === o.id}
                          onChange={(e) => changePlan(o, e.target.value)}
                          className="text-xs border-slate-300 rounded-lg py-1.5 pr-7 focus:ring-cyan-500 focus:border-cyan-500 disabled:opacity-50 capitalize"
                        >
                          {PLANS.map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-[11px] text-slate-400 mt-3">
        Changing a plan here takes effect immediately and ends that tenant's free trial. Access is enforced by database security — only platform admins can load this data.
      </p>
    </div>
  );
};
