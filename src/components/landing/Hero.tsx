import { ArrowRight, Play } from 'lucide-react';
import InvoiceDemo from './InvoiceDemo';

export default function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      {/* ── Background decoration ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-brand-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full bg-brand-500/5 blur-[160px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full pt-28 pb-20 lg:pt-32 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ── Left: Copy ── */}
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/[0.07] border border-white/[0.1] rounded-full px-4 py-1.5 mb-8">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium text-white/70 tracking-wide uppercase">
                AI-Powered Invoice Intelligence
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-white leading-[1.1] tracking-tight">
              Stop Overpaying{' '}
              <br className="hidden sm:block" />
              Your{' '}
              <span className="text-gradient">Food Vendors</span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-slate-400 leading-relaxed max-w-lg">
              Upload an invoice. Get line-item extraction, GL coding, and price
              spike alerts in under 60 seconds. Not 24 hours.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a
                href="/app"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-500 text-white font-semibold text-base hover:bg-brand-600 transition-all shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:-translate-y-0.5"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#how-it-works"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white font-medium text-base hover:bg-white/[0.12] transition-all"
              >
                <Play className="w-4 h-4 text-brand-400" />
                See How It Works
              </a>
            </div>

            {/* Social proof */}
            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-2">
                {['bg-brand-400', 'bg-emerald-400', 'bg-blue-400', 'bg-violet-400'].map((bg, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full ${bg} border-2 border-slate-900 flex items-center justify-center text-[10px] font-bold text-white`}>
                    {['UC', 'HG', 'DM', 'RK'][i]}
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-500">
                Trusted by university dining &amp; hotel teams
              </p>
            </div>
          </div>

          {/* ── Right: Live invoice demo ── */}
          <div className="hidden lg:block">
            <InvoiceDemo />
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />
    </section>
  );
}
