import { Upload, Cpu, CheckCircle, ArrowRight } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

const steps = [
  {
    num: '01',
    icon: Upload,
    title: 'Upload',
    desc: 'Snap a photo with your phone or drop a PDF. We accept any invoice format from any vendor.',
    color: 'bg-brand-500',
  },
  {
    num: '02',
    icon: Cpu,
    title: 'AI Extracts',
    desc: 'Line items, GL codes, vendor match, product identification — all extracted in under 60 seconds.',
    color: 'bg-indigo-500',
  },
  {
    num: '03',
    icon: CheckCircle,
    title: 'Review & Export',
    desc: 'Approve invoices, catch price spikes, and export directly to QuickBooks or CSV in one click.',
    color: 'bg-emerald-500',
  },
];

export default function HowItWorks() {
  const ref = useReveal();

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-slate-50/80">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-brand-500 uppercase tracking-widest mb-3">
            How It Works
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Three steps. Under a minute.
          </h2>
          <p className="mt-4 text-lg text-slate-500 leading-relaxed">
            No training required. If your team can take a photo, they can use ChefCode.
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          {/* Connector line (desktop only) */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-brand-300 via-indigo-300 to-emerald-300 opacity-40" />

          {steps.map((s, i) => (
            <div key={i} className={`reveal reveal-delay-${i + 1} relative text-center`}>
              {/* Step number + icon */}
              <div className="relative inline-flex flex-col items-center">
                <div className={`w-16 h-16 rounded-2xl ${s.color} flex items-center justify-center shadow-lg mb-6`}>
                  <s.icon className="w-7 h-7 text-white" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600">
                  {s.num}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-2">{s.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">{s.desc}</p>

              {/* Arrow between steps (desktop) */}
              {i < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute top-16 -right-6 w-5 h-5 text-slate-300" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
