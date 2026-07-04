import { CheckCircle2, AlertTriangle, FileText, TrendingUp } from 'lucide-react';

const ITEMS = [
  { name: 'Chicken Breast, boneless', qty: '40 lb', price: '$3.42', gl: '6328', status: 'ok' as const },
  { name: 'Salmon Fillet 6oz', qty: '25 lb', price: '$14.89', gl: '6327', status: 'spike' as const, spike: '+18%' },
  { name: 'Roma Tomatoes, fresh', qty: '50 lb', price: '$1.24', gl: '6323', status: 'ok' as const },
  { name: 'Basmati Rice 25lb', qty: '8 bag', price: '$22.50', gl: '6322', status: 'ok' as const },
  { name: 'Heavy Cream 1qt', qty: '12 ct', price: '$4.15', gl: '6325', status: 'ok' as const },
];

/** Static invoice-result mockup — clean cream/green theme. */
export default function InvoiceDemo() {
  return (
    <div className="relative">
      {/* Soft glow behind card */}
      <div className="absolute -inset-4 bg-brand-500/10 rounded-3xl blur-2xl" />

      <div className="relative w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-cream-200 bg-white shadow-xl shadow-brand-900/5">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-cream-100 bg-cream-50">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-semibold text-brand-900">Invoice #INV-2847</span>
          </div>
          <span className="text-xs font-medium text-brand-800/50">Sysco Foods</span>
        </div>

        {/* ── Body ── */}
        <div className="p-5">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 text-[10px] font-semibold uppercase tracking-wider text-brand-800/40 mb-3 px-1">
            <span>Item</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Price</span>
            <span className="text-right">GL</span>
          </div>

          <div className="space-y-2">
            {ITEMS.map((item, i) => (
              <div
                key={i}
                className={`grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-3 py-2.5 rounded-lg ${
                  item.status === 'spike' ? 'bg-amber-50 border border-amber-200' : 'bg-cream-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.status === 'ok' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-brand-500 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="text-xs text-brand-900 truncate">{item.name}</span>
                </div>
                <span className="text-xs text-brand-800/50 text-right">{item.qty}</span>
                <div className="text-right">
                  <span className="text-xs text-brand-900">{item.price}</span>
                  {item.spike && <span className="ml-1.5 text-[10px] font-bold text-amber-600">{item.spike}</span>}
                </div>
                <span className="text-[10px] text-brand-600 text-right font-mono font-semibold">{item.gl}</span>
              </div>
            ))}
          </div>

          {/* Summary bar */}
          <div className="mt-4 pt-4 border-t border-cream-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-brand-50 text-brand-700 px-2 py-1 rounded-md">
                <CheckCircle2 className="w-3 h-3" /> GL auto-coded
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-amber-50 text-amber-700 px-2 py-1 rounded-md">
                <TrendingUp className="w-3 h-3" /> 1 price spike
              </span>
            </div>
            <span className="text-sm font-bold text-brand-900">$2,847.50</span>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-5 py-3 border-t border-cream-100 bg-cream-50 flex items-center justify-between">
          <span className="text-[10px] text-brand-800/50">Processed in 47 seconds</span>
          <span className="text-[10px] font-medium text-brand-600">98% confidence</span>
        </div>
      </div>
    </div>
  );
}
