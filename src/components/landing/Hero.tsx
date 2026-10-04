import { ArrowRight, Play, GraduationCap } from 'lucide-react';
import InvoiceDemo from './InvoiceDemo';

export default function Hero() {
  return (
    <section className="relative min-h-[100vh] flex items-center overflow-hidden bg-cream">
      {/* ── Soft background accents ── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-brand-500/10 blur-[130px]" />
        <div className="absolute -bottom-40 -left-32 w-[460px] h-[460px] rounded-full bg-brand-400/10 blur-[130px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full pt-28 pb-20 lg:pt-32 lg:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ── Left: Copy ── */}
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-full px-4 py-1.5 mb-7">
              <span className="w-2 h-2 rounded-full bg-brand-500" />
              <span className="text-xs font-semibold text-brand-700 tracking-wide uppercase">
                AI Invoice Coding
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold text-brand-900 leading-[1.08] tracking-tight">
              Code every invoice{' '}
              <span className="text-gradient">in seconds.</span>
            </h1>

            <p className="mt-6 text-lg text-brand-800/70 leading-relaxed max-w-lg">
              ChefCode reads your supplier invoices, assigns the right GL codes,
              and flags vendor overcharges — automatically. In under 60 seconds,
              not 24 hours.
            </p>

            {/* CTAs */}
            <div className="mt-9 flex flex-col sm:flex-row gap-4">
              <a
                href="/app"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-brand-600 text-cream font-semibold text-base hover:bg-brand-700 transition-all hover:-translate-y-0.5 shadow-lg shadow-brand-600/20"
              >
                Start Free Trial
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#how-it-works"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-white border border-cream-300 text-brand-800 font-medium text-base hover:border-brand-300 transition-all"
              >
                <Play className="w-4 h-4 text-brand-600" />
                See How It Works
              </a>
            </div>

            <p className="mt-5 text-sm text-brand-800/50">15-day free trial · no credit card</p>

            {/* Origin story, not invented logos.
                This replaced a stack of four fake monograms (UC/HG/DM/RK) over
                "Trusted by university dining & hotel teams" — proof that did
                not exist. A specific, checkable story about why the product was
                built does the same job and survives being asked about. */}
            <div className="mt-10 flex items-start gap-3 max-w-md">
              <GraduationCap className="w-5 h-5 text-brand-600 mt-0.5 shrink-0" />
              <p className="text-sm text-brand-800/75 leading-relaxed">
                Built at <span className="font-semibold text-brand-900">Cal Poly Pomona</span> campus
                dining &mdash; by the tech lead who was coding these invoices by hand.
              </p>
            </div>
          </div>

          {/* ── Right: Invoice demo ── */}
          <div className="hidden lg:block">
            <InvoiceDemo />
          </div>
        </div>
      </div>
    </section>
  );
}
