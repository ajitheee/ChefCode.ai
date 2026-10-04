import { useReveal } from '../../hooks/useReveal';

// Each of these is a fact a buyer can check, not a figure they have to trust.
// This row used to claim "98% AI extraction accuracy" and "10+ hrs saved per
// week, per team" — neither was measured, and an unsourced number is the first
// thing a careful buyer asks about and the last thing you want to defend.
const stats = [
  { value: '< 60s', label: 'To code a typical invoice' },
  { value: '0', label: 'Invoice images stored' },
  { value: '15 days', label: 'Free trial, no card' },
  { value: '$0', label: 'Setup fee' },
];

export default function Stats() {
  const ref = useReveal();

  return (
    <section className="py-20 bg-white border-y border-cream-200">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((s, i) => (
            <div key={i} className={`reveal reveal-delay-${i + 1} text-center`}>
              <p className="text-4xl sm:text-5xl font-extrabold tracking-tight text-brand-600">{s.value}</p>
              <p className="mt-2 text-sm text-brand-800/75 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
