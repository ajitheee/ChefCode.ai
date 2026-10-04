import { ShieldCheck, Lock, Eye, FileCheck, Server, KeyRound } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

const badges = [
  { icon: Lock, label: '256-bit encryption', desc: 'TLS 1.3 in transit, AES-256 at rest' },
  { icon: Eye, label: 'Row-level isolation', desc: 'Database enforced — not just application logic' },
  { icon: Server, label: 'SOC 2 infrastructure', desc: 'Runs on Supabase/AWS, SOC 2 Type II certified' },
  // Was "Complete audit trail — every action logged with user, timestamp,
  // old/new values". The audit_logs table exists but nothing writes to it, so
  // that claim would fail the first question of a security review. This states
  // what the schema actually guarantees today: processed_by plus created_at /
  // updated_at on every record.
  { icon: FileCheck, label: 'Traceable records', desc: 'Every invoice carries who processed it and when it changed' },
  { icon: KeyRound, label: 'Role-based access', desc: '4 permission levels — Owner, Manager, Chef, Viewer' },
  { icon: ShieldCheck, label: 'FERPA safe', desc: 'Zero student PII. Invoice data only.' },
];

export default function Security() {
  const ref = useReveal();

  return (
    <section id="security" className="py-24 sm:py-32 bg-brand-900 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-400/10 rounded-full blur-[120px]" />
      </div>

      <div ref={ref} className="reveal relative z-10 max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-brand-500/15 border border-brand-400/25 rounded-full px-4 py-1.5 mb-5">
            <ShieldCheck className="w-4 h-4 text-brand-300" />
            <span className="text-xs font-semibold text-brand-200 uppercase tracking-widest">Enterprise-grade security</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-cream tracking-tight">
            Your data is safer here than in a filing cabinet
          </h2>
          <p className="mt-4 text-lg text-cream/60 leading-relaxed">
            Built from day one for multi-tenant food service organizations that answer to auditors, controllers, and compliance teams.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {badges.map((b, i) => (
            <div
              key={i}
              className={`reveal reveal-delay-${(i % 3) + 1} flex items-start gap-4 p-5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.07] transition-all duration-300`}
            >
              <div className="w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center shrink-0">
                <b.icon className="w-5 h-5 text-brand-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-cream mb-0.5">{b.label}</h3>
                <p className="text-xs text-cream/55 leading-relaxed">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          {/* Was href="#" promising a PDF that did not exist. It now opens the
              real Security Overview, which carries a "Save as PDF" button for
              reviewers who need a file to attach. */}
          <a
            href="/security"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-300 hover:text-brand-200 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
          >
            <FileCheck className="w-4 h-4" />
            Read our Security Overview
          </a>
        </div>
      </div>
    </section>
  );
}
