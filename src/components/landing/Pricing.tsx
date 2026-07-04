import { useState } from 'react';
import { Check, Star } from 'lucide-react';
import { useReveal } from '../../hooks/useReveal';

const plans = [
  {
    name: 'Starter',
    price: { monthly: 99, yearly: 79 },
    desc: 'Perfect for a single restaurant or small hotel.',
    cta: 'Start Free Trial',
    href: '/app',
    featured: false,
    items: ['1 location', '3 team members', '200 invoices / month', 'AI extraction + GL coding', 'Price spike alerts', 'CSV export', 'Email support'],
  },
  {
    name: 'Professional',
    price: { monthly: 299, yearly: 249 },
    desc: 'For multi-location operations that need full control.',
    cta: 'Start Free Trial',
    href: '/app',
    featured: true,
    items: ['Up to 5 locations', '15 team members', '1,000 invoices / month', 'Everything in Starter', 'QuickBooks integration', 'Spend analytics dashboard', 'Approval workflows', 'Priority support'],
  },
  {
    name: 'Enterprise',
    price: { monthly: null, yearly: null },
    desc: 'For university systems and hotel chains.',
    cta: 'Book a Demo',
    href: 'mailto:sales@chefcode.ai?subject=Enterprise%20Demo%20Request',
    featured: false,
    items: ['Unlimited locations', 'Unlimited team members', 'Unlimited invoices', 'Everything in Professional', 'SSO / SAML integration', 'API access', 'Vendor EDI connections', 'Dedicated account manager', 'Custom onboarding'],
  },
];

export default function Pricing() {
  const [yearly, setYearly] = useState(false);
  const ref = useReveal();

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-cream-100">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Pricing</p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-brand-900 tracking-tight">Simple pricing. No surprises.</h2>
          <p className="mt-4 text-lg text-brand-800/60">Start free for 15 days. No credit card required.</p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-14">
          <span className={`text-sm font-medium ${!yearly ? 'text-brand-900' : 'text-brand-800/40'}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-brand-600' : 'bg-cream-300'}`}
            aria-label="Toggle billing period"
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${yearly ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-sm font-medium ${yearly ? 'text-brand-900' : 'text-brand-800/40'}`}>
            Yearly<span className="ml-1.5 text-xs font-semibold text-brand-600">Save 20%</span>
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((p, i) => (
            <div
              key={i}
              className={`reveal reveal-delay-${i + 1} relative rounded-2xl border transition-all duration-300 ${
                p.featured ? 'border-brand-300 bg-white shadow-xl shadow-brand-600/10 scale-[1.03] z-10' : 'border-cream-200 bg-white hover:shadow-lg'
              }`}
            >
              {p.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 bg-brand-600 text-cream text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-brand-600/30">
                    <Star className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}

              <div className="p-7">
                <h3 className="text-lg font-bold text-brand-900">{p.name}</h3>
                <p className="text-sm text-brand-800/60 mt-1">{p.desc}</p>

                <div className="mt-6 mb-7">
                  {p.price.monthly !== null ? (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-brand-900">${yearly ? p.price.yearly : p.price.monthly}</span>
                      <span className="text-sm text-brand-800/50">/month</span>
                    </div>
                  ) : (
                    <div className="flex items-baseline"><span className="text-4xl font-extrabold text-brand-900">Custom</span></div>
                  )}
                </div>

                <a
                  href={p.href}
                  className={`block w-full text-center py-3 rounded-xl text-sm font-semibold transition-all ${
                    p.featured ? 'bg-brand-600 text-cream hover:bg-brand-700 shadow-lg shadow-brand-600/25' : 'bg-brand-900 text-cream hover:bg-brand-800'
                  }`}
                >
                  {p.cta}
                </a>

                <ul className="mt-7 space-y-3">
                  {p.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 mt-0.5 shrink-0 text-brand-600" />
                      <span className="text-sm text-brand-800/70">{item}</span>
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
