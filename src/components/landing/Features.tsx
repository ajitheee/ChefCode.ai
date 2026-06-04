import {
  Scan, TrendingUp, BookOpen, Users, Bell, BarChart3,
  GraduationCap, Hotel, MapPin, ShieldCheck, FileOutput, Utensils,
} from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

/* ── Core feature grid ── */
const features = [
  { icon: Scan,       title: 'AI Invoice Extraction',    desc: 'Upload any format — PDF, photo, email attachment. Line items extracted in seconds with 98% accuracy.' },
  { icon: TrendingUp, title: 'Price Spike Detection',    desc: 'Automatic alerts when a vendor raises prices above your threshold. Catch overcharges before they hit your P&L.' },
  { icon: BookOpen,   title: 'Auto GL Coding',           desc: 'Every line item auto-categorized to your chart of accounts. No more back-and-forth with accounting.' },
  { icon: Users,      title: 'Role-Based Access',        desc: 'Owner, Manager, Chef, Viewer — each role sees exactly what they need. Nothing more, nothing less.' },
  { icon: Bell,       title: 'Approval Workflow',        desc: 'Invoices flow from upload to review to approval. Notifications keep the right people in the loop.' },
  { icon: BarChart3,  title: 'Spend Analytics',          desc: 'Monthly spend by category, vendor, and location. Spot trends. Make data-driven purchasing decisions.' },
];

/* ── Built-for cards ── */
const verticals = [
  {
    icon: GraduationCap,
    title: 'University Dining',
    color: 'from-indigo-500 to-blue-600',
    points: [
      'Multi-campus location support',
      'GL code mapping for institutional accounting',
      'Works alongside CBORD & Computrition',
      'FERPA-safe — zero student data touched',
      'Full audit trail for compliance reviews',
    ],
  },
  {
    icon: Hotel,
    title: 'Hotels & Hospitality',
    color: 'from-brand-500 to-amber-500',
    points: [
      'Multi-property invoice consolidation',
      'Role-based access (GM, Chef, Controller)',
      'Price spike alerts across all vendors',
      'Sysco, US Foods, Freshpoint pre-loaded',
      'Encrypted data with SOC 2 compliant hosting',
    ],
  },
];

export default function Features() {
  const ref1 = useReveal();
  const ref2 = useReveal();

  return (
    <section id="features" className="py-24 sm:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* ─── Feature Grid ─── */}
        <div ref={ref1} className="reveal">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-brand-500 uppercase tracking-widest mb-3">
              Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything your team needs. Nothing it doesn't.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className={`reveal reveal-delay-${(i % 3) + 1} group p-6 rounded-2xl border border-slate-200/60 hover:border-brand-200 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-0.5`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                  <f.icon className="w-5 h-5 text-brand-500" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Built For Section ─── */}
        <div ref={ref2} className="reveal mt-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold text-brand-500 uppercase tracking-widest mb-3">
              Built For Your World
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Purpose-built for food service operations
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {verticals.map((v, i) => (
              <div
                key={i}
                className={`reveal reveal-delay-${i + 1} relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white hover:shadow-xl transition-all duration-300`}
              >
                {/* Gradient header */}
                <div className={`bg-gradient-to-r ${v.color} px-7 py-6`}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                      <v.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{v.title}</h3>
                  </div>
                </div>
                {/* Points */}
                <div className="px-7 py-6">
                  <ul className="space-y-3">
                    {v.points.map((pt, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <MapPin className="w-4 h-4 text-brand-500 mt-0.5 shrink-0" />
                        <span className="text-sm text-slate-600 leading-snug">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
