import { Upload, Cpu, CheckCircle, ArrowRight } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

const steps = [
  { num: '01', icon: Upload, title: 'Upload', desc: 'Snap a photo with your phone or drop a PDF. We accept any invoice format from any vendor.' },
  { num: '02', icon: Cpu, title: 'AI extracts', desc: 'Line items, GL codes, vendor match, product identification — all extracted in under 60 seconds.' },
  { num: '03', icon: CheckCircle, title: 'Review & export', desc: 'Approve invoices, catch price spikes, and export to QuickBooks or CSV in one click.' },
];

export default function HowItWorks() {
  const ref = useReveal();

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-cream-100">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-900 tracking-tight">
            Three steps. Under a minute.
          </h2>
          <p className="mt-4 text-lg text-brand-800/60 leading-relaxed">
            No training required. If your team can take a photo, they can use ChefCode.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-brand-300/50" />

          {steps.map((s, i) => (
            <div key={i} className={`reveal reveal-delay-${i + 1} relative text-center`}>
              <div className="relative inline-flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/20 mb-6">
                  <s.icon className="w-7 h-7 text-cream" />
                </div>
                <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-cream border-2 border-cream-300 flex items-center justify-center text-[11px] font-bold text-brand-700">
                  {s.num}
                </span>
              </div>

              <h3 className="text-xl font-bold text-brand-900 mb-2">{s.title}</h3>
              <p className="text-sm text-brand-800/60 leading-relaxed max-w-xs mx-auto">{s.desc}</p>

              {i < steps.length - 1 && (
                <ArrowRight className="hidden md:block absolute top-16 -right-6 w-5 h-5 text-brand-300" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
