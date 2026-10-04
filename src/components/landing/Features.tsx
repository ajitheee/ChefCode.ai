import {
  Scan, TrendingUp, BookOpen, Users, CopyCheck, BarChart3,
  GraduationCap, Hotel, Check,
} from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

const features = [
  { icon: Scan, title: 'AI invoice extraction', desc: 'Upload a PDF or snap a photo on your phone. Every line item is read and structured in seconds, ready for you to review.' },
  { icon: TrendingUp, title: 'Price change detection', desc: 'Every line is checked against what you last paid for that item. Anything more than 10% higher is flagged while you review.' },
  { icon: BookOpen, title: 'Auto GL coding', desc: 'Every line item auto-categorized to your chart of accounts. No more back-and-forth with accounting.' },
  { icon: Users, title: 'Role-based access', desc: 'Owner, Manager, Chef, Viewer — each role sees exactly what they need. Nothing more, nothing less.' },
  { icon: CopyCheck, title: 'Duplicate detection', desc: 'Upload the same invoice twice and ChefCode catches it, so nothing gets coded — or paid — twice.' },
  { icon: BarChart3, title: 'Spend analytics', desc: 'Monthly spend broken down by GL category, with every flagged price change on one screen.' },
];

const verticals = [
  {
    icon: GraduationCap,
    title: 'University Dining',
    color: 'from-brand-700 to-brand-500',
    points: [
      'Multi-campus location support',
      'GL code mapping for institutional accounting',
      'Works alongside CBORD & Computrition',
      'FERPA-safe — zero student data touched',
      'Every invoice traceable to who processed it',
    ],
  },
  {
    icon: Hotel,
    title: 'Hotels & Hospitality',
    color: 'from-brand-600 to-brand-400',
    points: [
      'Invoices tracked per property',
      'Role-based access for GMs, chefs and controllers',
      'Price change flags across every vendor',
      'Sysco, US Foods, Freshpoint pre-loaded',
      'Encrypted data with SOC 2 compliant hosting',
    ],
  },
];

export default function Features() {
  const ref1 = useReveal();
  const ref2 = useReveal();

  return (
    <section id="features" className="py-24 sm:py-32 bg-cream-50">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        {/* Feature grid */}
        <div ref={ref1} className="reveal">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-900 tracking-tight">
              Everything your team needs. Nothing it doesn't.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((f, i) => (
              <div
                key={i}
                className={`reveal reveal-delay-${(i % 3) + 1} group p-6 rounded-2xl border border-cream-200 hover:border-brand-200 bg-white transition-all duration-300 hover:shadow-lg hover:shadow-brand-600/5 hover:-translate-y-0.5`}
              >
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                  <f.icon className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="text-base font-bold text-brand-900 mb-1.5">{f.title}</h3>
                <p className="text-sm text-brand-800/75 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Built for */}
        <div ref={ref2} className="reveal mt-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Built for your world</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-900 tracking-tight">
              Purpose-built for food service operations
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {verticals.map((v, i) => (
              <div
                key={i}
                className={`reveal reveal-delay-${i + 1} overflow-hidden rounded-2xl border border-cream-200 bg-white hover:shadow-xl transition-all duration-300`}
              >
                <div className={`bg-gradient-to-r ${v.color} px-7 py-6`}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                      <v.icon className="w-6 h-6 text-cream" />
                    </div>
                    <h3 className="text-xl font-bold text-cream">{v.title}</h3>
                  </div>
                </div>
                <div className="px-7 py-6">
                  <ul className="space-y-3">
                    {v.points.map((pt, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <Check className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
                        <span className="text-sm text-brand-800/75 leading-snug">{pt}</span>
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
