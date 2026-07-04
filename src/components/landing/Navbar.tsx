import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'Pricing', href: '#pricing' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-cream/85 backdrop-blur-lg border-b border-cream-200' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 h-[72px]">
        {/* ── Logo ── */}
        <a href="#" className="flex items-center gap-2.5">
          <img src="/logo-mark.svg" alt="ChefCode" className="w-7 h-7" />
          <span className="text-xl font-bold tracking-tight text-brand-900">
            ChefCode<span className="text-brand-600">.ai</span>
          </span>
        </a>

        {/* ── Desktop links ── */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-brand-800/70 hover:text-brand-600 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* ── CTA buttons ── */}
        <div className="hidden md:flex items-center gap-3">
          <a href="/app" className="text-sm font-medium px-4 py-2 text-brand-800 hover:text-brand-600 transition-colors">
            Sign In
          </a>
          <a
            href="/app"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-brand-600 text-cream hover:bg-brand-700 transition-colors"
          >
            Start Free Trial
          </a>
        </div>

        {/* ── Mobile toggle ── */}
        <button className="md:hidden p-2 text-brand-800" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden bg-cream border-t border-cream-200 shadow-xl animate-fade-in-down">
          <div className="px-5 py-4 space-y-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm font-medium text-brand-800 hover:text-brand-600"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 border-t border-cream-200 flex flex-col gap-2">
              <a href="/app" className="text-center py-2.5 text-sm font-medium text-brand-800 rounded-lg hover:bg-cream-100">
                Sign In
              </a>
              <a href="/app" className="text-center py-2.5 text-sm font-semibold text-cream bg-brand-600 rounded-xl hover:bg-brand-700">
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
