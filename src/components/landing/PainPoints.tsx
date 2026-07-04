import { Clock, TrendingUp, FileWarning } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

const pains = [
  {
    icon: Clock,
    title: 'Manual entry is killing your team',
    desc: 'Your staff spends hours every week typing invoice line items into spreadsheets. That time could go to food quality, not data entry.',
  },
  {
    icon: TrendingUp,
    title: 'Vendors raise prices silently',
    desc: 'A 5% price spike across 200 invoices costs thousands per month. Most kitchens don\'t catch it until the quarterly budget review.',
  },
  {
    icon: FileWarning,
    title: 'Invoices don\'t match your GL',
    desc: 'Accounting rejects submissions. Back and forth for days. The kitchen blames accounting, accounting blames the kitchen.',
  },
];

export default function PainPoints() {
  const ref = useReveal();

  return (
    <section className="py-24 sm:py-32 bg-white">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">The problem</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-900 tracking-tight">
            Your invoices are costing you more than you think
          </h2>
          <p className="mt-4 text-lg text-brand-800/60 leading-relaxed">
            Food service teams lose thousands every month to invisible inefficiencies.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {pains.map((p, i) => (
            <div
              key={i}
              className={`reveal reveal-delay-${i + 1} group p-7 rounded-2xl border border-cream-200 bg-cream-50 hover:border-brand-200 transition-all duration-300 hover:shadow-lg hover:shadow-brand-600/5 hover:-translate-y-1`}
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-50 mb-5">
                <p.icon className="w-6 h-6 text-brand-600" />
              </div>
              <h3 className="text-lg font-bold text-brand-900 mb-2">{p.title}</h3>
              <p className="text-sm text-brand-800/60 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
