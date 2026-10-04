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

  // While the sheet is open the page behind it must not scroll — otherwise
  // the content slides around under a menu that looks fixed. Escape closes it,
  // because a panel you can open from the keyboard you must be able to leave.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-cream/85 backdrop-blur-lg border-b border-cream-200' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-5 sm:px-8 h-[72px]">
        {/* ── Logo ── */}
        <a href="/" aria-label="ChefCode.ai home" className="flex items-center gap-2.5 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
          <img src="/logo-mark.svg" alt="ChefCode" className="w-7 h-7" />
          <span className="text-xl font-bold tracking-tight text-brand-900">
            ChefCode<span className="text-brand-600">.ai</span>
          </span>
        </a>

        {/* ── Desktop links ── */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm font-medium text-brand-800/75 hover:text-brand-600 transition-colors">
              {l.label}
            </a>
          ))}
        </div>

        {/* ── CTA buttons ── */}
        <div className="hidden md:flex items-center gap-3">
          <a href="/app" className="press text-sm font-medium px-4 py-2 text-brand-800 hover:text-brand-600">
            Sign In
          </a>
          <a
            href="/app"
            className="press text-sm font-semibold px-5 py-2.5 rounded-xl bg-brand-600 text-cream hover:bg-brand-700"
          >
            Start Free Trial
          </a>
        </div>

        {/* ── Mobile toggle ── */}
        <button
          className="press md:hidden p-2 text-brand-800"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-menu"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* ── Mobile menu ──
          Kept mounted and toggled with classes rather than conditionally
          rendered, so it animates on the way out as well as in — a panel that
          slides open and then vanishes reads as broken. The scrim dims the page
          behind it and closes on tap. */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`md:hidden fixed inset-0 top-[72px] bg-brand-900/20 transition-opacity duration-200 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        id="mobile-menu"
        className={`md:hidden relative bg-cream border-t border-cream-200 shadow-xl origin-top transition-all duration-200 ease-out ${
          mobileOpen
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2 pointer-events-none invisible'
        }`}
      >
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
    </nav>
  );
}
