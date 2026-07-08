import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { MapPin, ListOrdered, Building2, Database, Download, ArrowRight } from 'lucide-react';

const gather = [
  { icon: MapPin, label: 'Locations', note: 'name, code, address of each kitchen', href: null },
  { icon: ListOrdered, label: 'GL codes', note: 'your chart of accounts', href: '/templates/gl_codes_template.csv' },
  { icon: Building2, label: 'Vendors', note: 'vendor name + account code', href: '/templates/vendors_template.csv' },
  { icon: Database, label: 'Products', note: 'product → GL code mapping', href: '/templates/products_template.csv' },
];

const steps = [
  { n: '1', title: 'Create your account', body: 'Open the app and choose Create account. Your 15-day free trial starts — you become the owner.' },
  { n: '2', title: 'Add your locations', body: 'Admin Panel → Locations & Codes. Enter each kitchen\'s name, location code, and address.' },
  { n: '3', title: 'Add your GL codes', body: 'Admin Panel → GL Codes. Do this before products — products point at these codes.' },
  { n: '4', title: 'Add your vendors', body: 'Admin Panel → Vendor Accounts → Upload CSV/Excel. Use the vendor template above.' },
  { n: '5', title: 'Upload your products', body: 'Admin Panel → Product Database → Upload. This is the AI\'s brain — you can add more anytime.' },
  { n: '6', title: 'Invite your team', body: 'Admin Panel → Team Members. Invite by email and set each person\'s role and locations.' },
  { n: '7', title: 'Scan your first invoice', body: 'Invoice Processor. Upload an invoice → the AI codes every line → review → export the PDF or CSV.' },
];

const faqs = [
  { q: 'Can\'t log in?', a: 'Sign in with your email and password only. Forgot it? Use "Forgot password?" on the login screen.' },
  { q: 'Address not verifying?', a: 'Make sure the location\'s address is filled in (Step 2). The AI matches the invoice\'s Ship-To against it.' },
  { q: 'Wrong GL codes?', a: 'Your product list is missing items — add them (Step 5, or use "Add Product" while reviewing an invoice).' },
  { q: 'Trial ended?', a: 'The account becomes read-only until you move to a paid plan.' },
];

export default function SetupGuide() {
  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen">
        <section className="max-w-3xl mx-auto px-5 sm:px-8 pt-32 pb-24">
          {/* Header */}
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">Getting started</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-900 tracking-tight">Setup guide</h1>
          <p className="mt-4 text-lg text-brand-800/70 leading-relaxed">
            From sign-up to your first coded invoice in about 20 minutes. Do the steps in order —
            each one builds on the last.
          </p>

          {/* Gather first */}
          <div className="mt-10 rounded-2xl border border-cream-200 bg-white p-6 sm:p-7">
            <p className="text-xs font-semibold text-brand-800/50 uppercase tracking-widest mb-5">Gather these first</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {gather.map((g) => (
                <div key={g.label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <g.icon className="w-4.5 h-4.5 text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-brand-900">{g.label}</p>
                    <p className="text-xs text-brand-800/60">{g.note}</p>
                    {g.href && (
                      <a
                        href={g.href}
                        download
                        className="inline-flex items-center gap-1 mt-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        <Download className="w-3.5 h-3.5" /> Download template
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 pt-4 border-t border-cream-100 text-sm text-brand-800/60">
              The product list matters most — it teaches the AI. The fuller it is, the better it codes on day one.
            </p>
          </div>

          {/* Steps */}
          <div className="mt-12 space-y-3">
            {steps.map((s) => (
              <div key={s.n} className="flex gap-4 p-5 rounded-xl border border-cream-200 bg-white">
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 text-sm font-bold flex items-center justify-center shrink-0">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-brand-900">{s.title}</h3>
                  <p className="text-sm text-brand-800/60 mt-0.5 leading-relaxed">{s.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 rounded-2xl bg-gradient-to-br from-brand-800 to-brand-900 text-center px-8 py-10">
            <h2 className="text-2xl font-bold text-cream">Ready to start?</h2>
            <p className="mt-2 text-cream/70">Create your account and process your first invoice today.</p>
            <a
              href="/app"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cream text-brand-900 font-semibold hover:bg-white transition-colors"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </a>
          </div>

          {/* FAQ */}
          <div className="mt-14">
            <h2 className="text-xl font-bold text-brand-900 mb-5">Common questions</h2>
            <div className="space-y-3">
              {faqs.map((f) => (
                <div key={f.q} className="p-5 rounded-xl border border-cream-200 bg-white">
                  <p className="text-sm font-bold text-brand-900">{f.q}</p>
                  <p className="text-sm text-brand-800/60 mt-1 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
