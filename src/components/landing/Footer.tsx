import { DEMO_BOOKING_URL, PRIVACY_CONTACT_EMAIL } from '../../siteConfig';

// Every link here goes somewhere real. The previous version had eleven
// href="#" stubs — including all four legal links — which is the worst place
// to disappoint an institutional buyer, since Privacy and Terms are the first
// things their procurement team clicks. Sections we genuinely do not have
// (blog, careers, status page) were removed rather than left as dead ends.
const columns = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How It Works', href: '/#how-it-works' },
      { label: 'Pricing', href: '/#pricing' },
      { label: 'Setup Guide', href: '/setup' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'University Dining', href: '/#features' },
      { label: 'Hotels', href: '/#features' },
      { label: 'Restaurants', href: '/#features' },
      { label: 'Hospitals', href: '/#features' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Start free trial', href: '/app' },
      { label: 'Book a demo', href: DEMO_BOOKING_URL },
      { label: 'Setup guide', href: '/setup' },
      { label: 'Contact us', href: `mailto:${PRIVACY_CONTACT_EMAIL}` },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Security Overview', href: '/security' },
      { label: 'Data Processing', href: '/dpa' },
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
            <a href="/" aria-label="ChefCode.ai home" className="flex items-center gap-2 mb-4 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600">
              <img src="/logo-mark.svg" alt="ChefCode" className="w-6 h-6" />
              <span className="text-lg font-bold text-brand-900 tracking-tight">
                ChefCode<span className="text-brand-600">.ai</span>
              </span>
            </a>
            <p className="text-sm text-brand-800/75 leading-relaxed max-w-xs">
              AI-powered invoice intelligence for food service teams. Save time, catch overcharges, export clean data.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col, i) => (
            <div key={i}>
              <h4 className="text-xs font-semibold text-brand-800/75 uppercase tracking-widest mb-4">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href={link.href}
                      {...(link.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="text-sm text-brand-800/75 hover:text-brand-700 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-cream-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-brand-800/75">&copy; {new Date().getFullYear()} ChefCode.ai. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {[
              { label: 'Privacy', href: '/privacy' },
              { label: 'Terms', href: '/terms' },
              { label: 'Security', href: '/security' },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-xs text-brand-800/75 hover:text-brand-700 transition-colors rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
              >
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
