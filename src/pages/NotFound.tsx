import { useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/landing/Navbar';
import Footer from '../components/landing/Footer';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

// Shown for any path that is not a real page. Vercel serves this with an HTTP
// 404 status (see vercel.json and the emit-404 plugin in vite.config.ts); the
// noindex tag below is a second line of defence for anything that reaches it
// with a 200. Previously every unknown URL rendered the full landing page,
// which told a mistyped visitor nothing and gave search engines an unbounded
// number of duplicate homepages.

const destinations = [
  { label: 'Home', href: '/', note: 'What ChefCode does' },
  { label: 'Pricing', href: '/#pricing', note: 'Plans and the free trial' },
  { label: 'Setup guide', href: '/setup', note: 'From sign-up to first invoice' },
  { label: 'Security Overview', href: '/security', note: 'For your IT or compliance review' },
];

export default function NotFound() {
  useDocumentTitle('Page not found');

  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex';
    document.head.appendChild(meta);
    return () => meta.remove();
  }, []);

  return (
    <>
      <Navbar />
      <main className="bg-cream min-h-screen">
        <section className="max-w-2xl mx-auto px-5 sm:px-8 pt-36 pb-24">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">404</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-900 tracking-tight leading-[1.05]">
            This page doesn&rsquo;t exist.
          </h1>
          <p className="mt-5 text-lg text-brand-800/75 leading-relaxed">
            The address <code className="px-1.5 py-0.5 rounded bg-cream-100 text-brand-900 text-base break-all">{window.location.pathname}</code>{' '}
            isn&rsquo;t a page on this site. It may have been mistyped, or the link that sent you here is out of date.
          </p>

          <ul className="mt-10 grid sm:grid-cols-2 gap-3">
            {destinations.map((d) => (
              <li key={d.href}>
                <a
                  href={d.href}
                  className="press block rounded-xl border border-cream-300 bg-white px-5 py-4 hover:border-brand-300"
                >
                  <span className="block text-base font-semibold text-brand-900">{d.label}</span>
                  <span className="block text-sm text-brand-800/75 mt-0.5">{d.note}</span>
                </a>
              </li>
            ))}
          </ul>

          <a
            href="/"
            className="press mt-10 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to the homepage
          </a>
        </section>
      </main>
      <Footer />
    </>
  );
}
