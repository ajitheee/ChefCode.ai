import { ShieldCheck, Lock, Eye, FileCheck, Server, KeyRound } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

const badges = [
  { icon: Lock,       label: '256-bit Encryption',         desc: 'TLS 1.3 in transit, AES-256 at rest' },
  { icon: Eye,        label: 'Row-Level Isolation',         desc: 'Database enforced — not just application logic' },
  { icon: Server,     label: 'SOC 2 Infrastructure',        desc: 'Hosted on AWS via Supabase, SOC 2 Type II' },
  { icon: FileCheck,  label: 'Complete Audit Trail',        desc: 'Every action logged with user, timestamp, old/new values' },
  { icon: KeyRound,   label: 'Role-Based Access',           desc: '4 permission levels — Owner, Manager, Chef, Viewer' },
  { icon: ShieldCheck,label: 'FERPA Safe',                  desc: 'Zero student PII. Invoice data only.' },
];

export default function Security() {
  const ref = useReveal();

  return (
    <section id="security" className="py-24 sm:py-32 bg-slate-950 relative overflow-hidden">
      {/* BG decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[120px]" />
      </div>

      <div ref={ref} className="reveal relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-1.5 mb-5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
              Enterprise-Grade Security
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Your data is safer here than in a filing cabinet
          </h2>
          <p className="mt-4 text-lg text-slate-400 leading-relaxed">
            Built from day one for multi-tenant food service organizations that answer to auditors, controllers, and compliance teams.
          </p>
        </div>

        {/* Badge grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {badges.map((b, i) => (
            <div
              key={i}
              className={`reveal reveal-delay-${(i % 3) + 1} group flex items-start gap-4 p-5 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] transition-all duration-300`}
            >
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                <b.icon className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white mb-0.5">{b.label}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Download link */}
        <div className="mt-12 text-center">
          <a
            href="#"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            <FileCheck className="w-4 h-4" />
            Download our Security Overview (PDF)
          </a>
        </div>
      </div>
    </section>
  );
}
