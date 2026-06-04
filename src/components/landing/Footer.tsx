import { ChefHat } from 'lucide-react';

const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features',     href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Pricing',      href: '#pricing' },
      { label: 'Security',     href: '#security' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'University Dining', href: '#features' },
      { label: 'Hotels',            href: '#features' },
      { label: 'Restaurants',       href: '#features' },
      { label: 'Hospitals',         href: '#features' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About',    href: '#' },
      { label: 'Blog',     href: '#' },
      { label: 'Careers',  href: '#' },
      { label: 'Contact',  href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy',    href: '#' },
      { label: 'Terms of Service',  href: '#' },
      { label: 'Security Overview', href: '#' },
      { label: 'Data Processing',   href: '#' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-16">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="p-1.5 rounded-lg bg-brand-500">
                <ChefHat className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Chef<span className="text-brand-400">Code</span>
                <span className="text-[9px] font-medium align-super ml-0.5 opacity-60">.ai</span>
              </span>
            </a>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs">
              AI-powered invoice intelligence for food service teams. Save time, catch overcharges, export clean data.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-500 hover:text-white transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-14 pt-8 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} ChefCode.ai. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Privacy</a>
            <a href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Terms</a>
            <a href="#" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
