import { useState, useEffect } from 'react';
import { ChefHat, Menu, X } from 'lucide-react';

const links = [
  { label: 'Features',  href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Security',  href: '#security' },
  { label: 'Pricing',   href: '#pricing' },
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
        scrolled
          ? 'bg-white/90 backdrop-blur-lg shadow-sm border-b border-slate-200/60'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 h-[72px]">
        {/* ── Logo ── */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className={`p-2 rounded-xl transition-colors ${scrolled ? 'bg-brand-500' : 'bg-white/10'}`}>
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <span className={`text-xl font-bold tracking-tight transition-colors ${scrolled ? 'text-slate-900' : 'text-white'}`}>
            Chef<span className="text-brand-500">Code</span>
            <span className="text-[10px] font-medium align-super ml-0.5 opacity-70">.ai</span>
          </span>
        </a>

        {/* ── Desktop links ── */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors hover:text-brand-500 ${
                scrolled ? 'text-slate-600' : 'text-white/80'
              }`}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* ── CTA buttons ── */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="/app"
            className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
              scrolled ? 'text-slate-700 hover:text-brand-600' : 'text-white/80 hover:text-white'
            }`}
          >
            Sign In
          </a>
          <a
            href="/app"
            className="text-sm font-semibold px-5 py-2.5 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-all shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40"
          >
            Start Free Trial
          </a>
        </div>

        {/* ── Mobile toggle ── */}
        <button
          className="md:hidden p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className={`w-6 h-6 ${scrolled ? 'text-slate-700' : 'text-white'}`} />
          ) : (
            <Menu className={`w-6 h-6 ${scrolled ? 'text-slate-700' : 'text-white'}`} />
          )}
        </button>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-xl animate-fade-in-down">
          <div className="px-5 py-4 space-y-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block py-3 text-sm font-medium text-slate-700 hover:text-brand-500"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
              <a href="/app" className="text-center py-2.5 text-sm font-medium text-slate-700 rounded-lg hover:bg-slate-50">
                Sign In
              </a>
              <a href="/app" className="text-center py-2.5 text-sm font-semibold text-white bg-brand-500 rounded-xl hover:bg-brand-600">
                Start Free Trial
              </a>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
