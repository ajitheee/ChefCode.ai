const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Security', href: '#security' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'University Dining', href: '#features' },
      { label: 'Hotels', href: '#features' },
      { label: 'Restaurants', href: '#features' },
      { label: 'Hospitals', href: '#features' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Careers', href: '#' },
      { label: 'Contact', href: '#' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Security Overview', href: '#' },
      { label: 'Data Processing', href: '#' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-cream-100 border-t border-cream-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 lg:gap-16">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <a href="#" className="flex items-center gap-2 mb-4">
              <img src="/logo-mark.svg" alt="ChefCode" className="w-6 h-6" />
              <span className="text-lg font-bold text-brand-900 tracking-tight">
                ChefCode<span className="text-brand-600">.ai</span>
              </span>
            </a>
            <p className="text-sm text-brand-800/60 leading-relaxed max-w-xs">
              AI-powered invoice intelligence for food service teams. Save time, catch overcharges, export clean data.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-brand-800/50 uppercase tracking-widest mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a href={link.href} className="text-sm text-brand-800/60 hover:text-brand-700 transition-colors">{link.label}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-brand-800/50">&copy; {new Date().getFullYear()} ChefCode.ai. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-brand-800/50 hover:text-brand-700 transition-colors">Privacy</a>
            <a href="#" className="text-xs text-brand-800/50 hover:text-brand-700 transition-colors">Terms</a>
            <a href="#" className="text-xs text-brand-800/50 hover:text-brand-700 transition-colors">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
