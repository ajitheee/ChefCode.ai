import React from 'react';
import { InvoiceItem, GLCode } from '../types';
import { GL_CODES } from '../constants';
import { Trash2, AlertCircle, CheckCircle, Database, Plus, TrendingUp, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

interface InvoiceTableProps {
  items: InvoiceItem[];
  onUpdateItem: (id: string, field: keyof InvoiceItem, value: any) => void;
  onDeleteItem: (id: string) => void;
  onAddToDb: (item: InvoiceItem) => void;
  glCodes?: GLCode[]; // the org's DB chart of accounts (falls back to the built-in list)
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ items, onUpdateItem, onDeleteItem, onAddToDb, glCodes }) => {
  const codes = glCodes && glCodes.length > 0 ? glCodes : GL_CODES;

  // Keyed by the GL code itself (not a fragile array index), so a valid code is
  // never shown as blank even if it isn't in the org's list.
  const handleGlChange = (id: string, code: string) => {
    const gl = codes.find(g => g.code === code);
    onUpdateItem(id, 'glCode', code);
    onUpdateItem(id, 'categoryName', gl?.category || '');
    onUpdateItem(id, 'isDatabaseMatch', false);
  };

  // Ensure the item's current code is always selectable, even if the AI assigned
  // one that isn't in the org's chart of accounts.
  const optionsFor = (item: InvoiceItem): GLCode[] =>
    !item.glCode || codes.some(g => g.code === item.glCode)
      ? codes
      : [{ code: item.glCode, category: item.categoryName || 'AI-assigned' }, ...codes];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        {/* min-w keeps columns readable on phones — the wrapper scrolls
            horizontally instead of squishing the inputs to nothing. */}
        <table className="w-full min-w-[760px] text-sm text-left">
          {/* ── Sticky Header ── */}
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200/60">
              <th scope="col" className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-[35%]">Item Description</th>
              <th scope="col" className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-20">Qty</th>
              <th scope="col" className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-28">Unit Price</th>
              <th scope="col" className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right w-28">Total</th>
              <th scope="col" className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest w-56">GL Code</th>
              <th scope="col" className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-16"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100/80">
            {items.map((item, index) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group hover:bg-slate-50/50 transition-colors"
              >
                {/* ── Description + Badges ── */}
                <td className="px-5 py-3.5">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => onUpdateItem(item.id, 'description', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-slate-900 placeholder-slate-400"
                        />
                        {item.productNumber && (
                          <span className="shrink-0 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                            #{item.productNumber}
                          </span>
                        )}
                      </div>

                      {/* Status badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {item.isDatabaseMatch ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            <Database size={9} /> Matched
                          </span>
                        ) : (
                          <button
                            onClick={() => onAddToDb(item)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-100 hover:bg-cyan-100 transition-colors"
                          >
                            <Plus size={9} /> Add to DB
                          </button>
                        )}

                        {!item.isDatabaseMatch && item.confidence < 0.7 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                            <AlertCircle size={9} /> Low Confidence
                          </span>
                        )}

                        {item.isDatabaseMatch && item.confidence >= 0.9 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50/50 px-2 py-0.5 rounded-md">
                            <CheckCircle size={9} /> {Math.round(item.confidence * 100)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>

                {/* ── Quantity ── */}
                <td className="px-4 py-3.5 text-right">
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(item.id, 'quantity', e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-right font-mono text-slate-700"
                  />
                </td>

                {/* ── Unit Price + Spike ── */}
                <td className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <span className="text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => onUpdateItem(item.id, 'unitPrice', e.target.value)}
                      className="w-20 bg-transparent border-none focus:ring-0 p-0 text-sm text-right font-mono text-slate-700"
                      step="0.01"
                    />
                  </div>
                  {item.priceSpike && item.historicalPrice && (
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-red-600 font-semibold" title={`Was $${item.historicalPrice.toFixed(2)}${item.historicalDate ? ` on ${item.historicalDate}` : ''}`}>
                      <TrendingUp size={10} />
                      <span>was ${item.historicalPrice.toFixed(2)}</span>
                    </div>
                  )}
                </td>

                {/* ── Total ── */}
                <td className="px-4 py-3.5 text-right">
                  <span className="text-sm font-bold text-slate-900 font-mono">
                    ${(parseFloat(item.totalPrice as any) || 0).toFixed(2)}
                  </span>
                </td>

                {/* ── GL Code Dropdown ── */}
                <td className="px-4 py-3.5">
                  <div className="relative">
                    <select
                      value={item.glCode || ''}
                      onChange={(e) => handleGlChange(item.id, e.target.value)}
                      className={`
                        w-full rounded-lg text-xs font-medium py-2 pl-3 pr-8 border appearance-none cursor-pointer transition-all
                        focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400
                        ${item.isDatabaseMatch
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:border-emerald-300'
                          : !item.glCode
                            ? 'bg-red-50 text-red-800 border-red-200 hover:border-red-300'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
                        }
                      `}
                    >
                      <option value="">Select Code...</option>
                      {optionsFor(item).map((gl) => (
                        <option key={`${gl.code}-${gl.category}`} value={gl.code}>
                          {gl.code} - {gl.category}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </td>

                {/* ── Delete ── */}
                <td className="px-4 py-3.5 text-center">
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove Item"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}

            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                      <Database size={20} className="text-slate-400" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No items found</p>
                    <p className="text-xs text-slate-400 mt-0.5">Upload an invoice to get started.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoiceTable;
