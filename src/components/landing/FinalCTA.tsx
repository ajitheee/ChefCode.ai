import { ArrowRight, Zap } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

export default function FinalCTA() {
  const ref = useReveal();

  return (
    <section className="py-24 sm:py-32 bg-cream">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 to-brand-900 px-8 py-16 sm:px-16 sm:py-20 text-center">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-500/15 rounded-full blur-[100px]" />
            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-brand-400/15 rounded-full blur-[100px]" />
          </div>

          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-500/15 border border-brand-400/25 rounded-full px-4 py-1.5 mb-6">
              <Zap className="w-4 h-4 text-brand-300" />
              <span className="text-xs font-semibold text-brand-200 uppercase tracking-widest">Stop leaving money on the table</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-cream tracking-tight leading-tight">
              Your vendors raised prices last month.{' '}
              <span className="text-brand-300">Did you catch it?</span>
            </h2>

            <p className="mt-5 text-lg text-cream/60 leading-relaxed">
              Start your free trial — upload your first invoice in 60 seconds. No credit card. No setup fee. No commitment.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="/app"
                className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-cream text-brand-900 font-semibold text-base hover:bg-white transition-all hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="mailto:sales@chefcode.ai?subject=Book%20a%20Demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/[0.08] border border-cream/20 text-cream font-medium text-base hover:bg-white/[0.14] transition-all"
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
