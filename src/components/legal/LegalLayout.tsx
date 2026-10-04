import { ReactNode } from 'react';
import { Printer } from 'lucide-react';
import Navbar from '../landing/Navbar';
import Footer from '../landing/Footer';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

// Shared chrome for the policy pages (/privacy, /terms, /security, /dpa).
// One place for the measure, the type scale and the "last updated" stamp, so
// the four documents stay visually identical and nobody has to remember the
// classes. Prose styling is hand-rolled — @tailwindcss/typography isn't a
// dependency here and these pages aren't worth adding one for.

interface Props {
  eyebrow: string;
  title: string;
  updated: string;
  summary: string;
  children: ReactNode;
}

export default function LegalLayout({ eyebrow, title, updated, summary, children }: Props) {
  useDocumentTitle(title);

  return (
    <>
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="bg-cream min-h-screen">
        <article className="max-w-3xl mx-auto px-5 sm:px-8 pt-32 pb-24 print:pt-8">
          <p className="text-sm font-semibold text-brand-600 uppercase tracking-widest mb-3">
            {eyebrow}
          </p>

          {/* Tracking tightens as the type grows — see the display rule in the
              type scale; body copy below stays at normal tracking. */}
          <h1 className="text-4xl sm:text-5xl font-extrabold text-brand-900 tracking-tight leading-[1.05]">
            {title}
          </h1>

          <p className="mt-5 text-lg text-brand-800/75 leading-relaxed">{summary}</p>

          <div className="mt-6 flex flex-wrap items-center gap-4 pb-8 border-b border-cream-300">
            <p className="text-sm text-brand-800/60">
              Last updated <time dateTime={updated}>{formatDate(updated)}</time>
            </p>
            <button
              onClick={() => window.print()}
              className="print:hidden inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 active:scale-[0.97] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 rounded"
            >
              <Printer className="w-4 h-4" />
              Save as PDF
            </button>
          </div>

          <div className="legal-prose mt-10">{children}</div>
        </article>
      </main>

      <div className="print:hidden">
        <Footer />
      </div>
    </>
  );
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Section heading — gives each clause a stable anchor to link people to. */
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-28 text-xl sm:text-2xl font-bold text-brand-900 tracking-tight mt-12 mb-3 first:mt-0"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-bold text-brand-900 mt-7 mb-2">{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] text-brand-800/80 leading-[1.75] mb-4">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="mb-5 space-y-2">{children}</ul>;
}

export function LI({ children }: { children: ReactNode }) {
  return (
    <li className="relative pl-5 text-[15px] text-brand-800/80 leading-[1.75] before:absolute before:left-0 before:top-[0.7em] before:w-1.5 before:h-1.5 before:rounded-full before:bg-brand-400">
      {children}
    </li>
  );
}

/** Pulled-out statement for the things a reviewer is actually scanning for. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="my-6 rounded-xl border border-brand-200 bg-brand-50 px-5 py-4">
      <p className="text-[15px] text-brand-900 leading-[1.7]">{children}</p>
    </div>
  );
}

export function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="my-6 overflow-x-auto rounded-xl border border-cream-300">
      <table className="w-full text-left border-collapse min-w-[520px]">
        <thead>
          <tr className="bg-cream-100">
            {head.map((h) => (
              <th
                key={h}
                className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-brand-800/70 border-b border-cream-300"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white even:bg-cream-50">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className="px-4 py-3 text-sm text-brand-800/80 align-top border-b border-cream-200 last:border-r-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The contact block every policy page ends with. Shows the address in full
 * rather than hiding it behind a button — a reviewer copying it into a vendor
 * record needs to see it, and a mailto: that opens an empty tab helps nobody.
 */
export function ContactBlock({ email, subject }: { email: string; subject?: string }) {
  const href = `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ''}`;
  return (
    <div className="mt-4 rounded-xl border border-cream-300 bg-white px-5 py-4">
      <a
        href={href}
        className="text-base font-semibold text-brand-700 hover:text-brand-800 underline underline-offset-2 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        {email}
      </a>
      <p className="mt-1 text-sm text-brand-800/70">
        A person reads this, not a ticket queue. We aim to reply within two business days.
      </p>
    </div>
  );
}
