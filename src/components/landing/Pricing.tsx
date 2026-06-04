import { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

const plans = [
  {
    name: 'Starter',
    price: { monthly: 99, yearly: 79 },
    desc: 'Perfect for a single restaurant or small hotel.',
    cta: 'Start Free Trial',
    featured: false,
    items: [
      '1 location',
      '3 team members',
      '200 invoices / month',
      'AI extraction + GL coding',
      'Price spike alerts',
      'CSV export',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: { monthly: 299, yearly: 249 },
    desc: 'For multi-location operations that need full control.',
    cta: 'Start Free Trial',
    featured: true,
    items: [
      'Up to 5 locations',
      '15 team members',
      '1,000 invoices / month',
      'Everything in Starter',
      'QuickBooks integration',
      'Spend analytics dashboard',
      'Approval workflows',
      'Priority support',
    ],
  },
  {
    name: 'Enterprise',
    price: { monthly: null, yearly: null },
    desc: 'For university systems and hotel chains.',
    cta: 'Book a Demo',
    featured: false,
    items: [
      'Unlimited locations',
      'Unlimited team members',
      'Unlimited invoices',
      'Everything in Professional',
      'SSO / SAML integration',
      'API access',
      'Vendor EDI connections',
      'Dedicated account manager',
      'Custom onboarding',
    ],
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const ref = useReveal();

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-slate-50/80">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm font-semibold text-brand-500 uppercase tracking-widest mb-3">
            Pricing
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Simple pricing. No surprises.
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Start free for 14 days. No credit card required.
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-14">
          <span className={`text-sm font-medium ${!yearly ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-brand-500' : 'bg-slate-300'}`}
            aria-label="Toggle billing period"
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                yearly ? 'translate-x-6' : ''
              }`}
            />
          </button>
          <span className={`text-sm font-medium ${yearly ? 'text-slate-900' : 'text-slate-400'}`}>
            Yearly
            <span className="ml-1.5 text-xs font-semibold text-emerald-500">Save 20%</span>
          </span>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((p, i) => (
            <div
              key={i}
              className={`reveal reveal-delay-${i + 1} relative rounded-2xl border transition-all duration-300 ${
                p.featured
                  ? 'border-brand-300 bg-white shadow-xl shadow-brand-500/10 scale-[1.03] z-10'
                  : 'border-slate-200/60 bg-white hover:shadow-lg'
              }`}
            >
              {/* Popular badge */}
              {p.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-brand-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-brand-500/30">
                    <Star className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}

              <div className="p-7">
                {/* Plan name */}
                <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                <p className="text-sm text-slate-500 mt-1">{p.desc}</p>

                {/* Price */}
                <div className="mt-6 mb-7">
                  {p.price.monthly !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">
                        ${yearly ? p.price.yearly : p.price.monthly}
                      </span>
                      <span className="text-sm text-slate-500">/month</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline">
                      <span className="text-4xl font-extrabold text-slate-900">Custom</span>
                    </div>
                  )}
                </div>

                {/* CTA */}
                <a
                  href="#"
                  className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                    p.featured
                      ? 'bg-brand-500 text-white hover:bg-brand-600 shadow-lg shadow-brand-500/25'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
                  }`}
                >
                  {p.cta}
                </a>

                {/* Feature list */}
                <ul className="mt-7 space-y-3">
                  {p.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${p.featured ? 'text-brand-500' : 'text-emerald-500'}`} />
                      <span className="text-sm text-slate-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
