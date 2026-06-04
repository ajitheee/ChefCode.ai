import { ArrowRight, Zap } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

export default function FinalCTA() {
  const ref = useReveal();

  return (
    <section className="py-24 sm:py-32 bg-white">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 px-8 py-16 sm:px-16 sm:py-20 text-center">
          {/* Decorations */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-500/15 rounded-full blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500/15 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-widest">
                Stop Leaving Money on the Table
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Your vendors raised prices last month.{' '}
              <span className="text-gradient">Did you catch it?</span>
            </h2>

            <p className="mt-5 text-lg text-slate-400 leading-relaxed">
              Start your free trial — upload your first invoice in 60 seconds.
              No credit card. No setup fee. No commitment.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#pricing"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand-500 text-white font-semibold text-base hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white font-medium text-base hover:bg-white/[0.12] transition-all"
              >
                Book a 15-Min Demo
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
