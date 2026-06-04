import { useReveal } from '../../hooks/useReveal';

const stats = [
  { value: '< 60s',  label: 'Invoice processing time',    accent: 'text-brand-500' },
  { value: '98%',    label: 'AI extraction accuracy',      accent: 'text-emerald-500' },
  { value: '10+ hrs',label: 'Saved per week, per team',    accent: 'text-indigo-500' },
  { value: '$0',     label: 'Setup fee',                   accent: 'text-violet-500' },
];

export default function Stats() {
  const ref = useReveal();

  return (
    <section className="py-20 bg-white">
      <div ref={ref} className="reveal max-w-7xl mx-auto px-5 sm:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((s, i) => (
            <div key={i} className={`reveal reveal-delay-${i + 1} text-center`}>
              <p className={`text-4xl sm:text-5xl font-extrabold tracking-tight ${s.accent}`}>
                {s.value}
              </p>
              <p className="mt-2 text-sm text-slate-500 font-medium">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
