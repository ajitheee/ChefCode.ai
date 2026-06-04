import { Clock, TrendingUp, FileWarning } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

const pains = [
  {
    icon: Clock,
    title: 'Manual Entry Is Killing Your Team',
    desc: 'Your staff spends hours every week typing invoice line items into spreadsheets. That time could be spent on food quality, not data entry.',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
  },
  {
    icon: TrendingUp,
    title: 'Vendors Raise Prices Silently',
    desc: 'A 5% price spike across 200 invoices costs thousands per month. Most kitchens don\'t catch it until the quarterly budget review.',
    color: 'text-red-500',
    bg: 'bg-red-50',
  },
  {
    icon: FileWarning,
    title: 'Invoices Don\'t Match Your GL',
    desc: 'Accounting rejects submissions. Back and forth for days. The kitchen blames accounting, accounting blames the kitchen.',
    color: 'text-amber-500',
    bg: 'bg-amber-50',
  },
];

export default function PainPoints() {
  const ref = useReveal();

  return (
    <section className="py-24 sm:py-32 bg-white">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-brand-500 uppercase tracking-widest mb-3">
            The Problem
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Your invoices are costing you more than you think
          </h2>
          <p className="mt-4 text-lg text-slate-500 leading-relaxed">
            Food service teams lose thousands every month to invisible inefficiencies.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {pains.map((p, i) => (
            <div
              key={i}
              className={`reveal reveal-delay-${i + 1} group relative p-7 rounded-2xl border border-slate-200/60 bg-white hover:border-brand-200 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5 hover:-translate-y-1`}
            >
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${p.bg} mb-5`}>
                <p.icon className={`w-6 h-6 ${p.color}`} />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">{p.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
