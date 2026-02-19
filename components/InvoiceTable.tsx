import React from 'react';
import { InvoiceItem, GLCode } from '../types';
import { GL_CODES } from '../constants';
import { Trash2, AlertCircle, CheckCircle, Database } from 'lucide-react';

interface InvoiceTableProps {
  items: InvoiceItem[];
  onUpdateItem: (id: string, field: keyof InvoiceItem, value: any) => void;
  onDeleteItem: (id: string) => void;
}

const InvoiceTable: React.FC<InvoiceTableProps> = ({ items, onUpdateItem, onDeleteItem }) => {

  const handleGlChange = (id: string, codeValue: string) => {
    // Value of option is index in GL_CODES
    const index = parseInt(codeValue);
    if (!isNaN(index) && GL_CODES[index]) {
        onUpdateItem(id, 'glCode', GL_CODES[index].code);
        onUpdateItem(id, 'categoryName', GL_CODES[index].category);
        // If user manually changes it, it's no longer a DB match
        onUpdateItem(id, 'isDatabaseMatch', false); 
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-500">
          <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
            <tr>
              <th scope="col" className="px-6 py-3 w-1/3">Item Description</th>
              <th scope="col" className="px-6 py-3 w-24 text-right">Qty</th>
              <th scope="col" className="px-6 py-3 w-32 text-right">Price</th>
              <th scope="col" className="px-6 py-3 w-32 text-right">Total</th>
              <th scope="col" className="px-6 py-3 w-64">GL Code & Category</th>
              <th scope="col" className="px-6 py-3 w-16 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-6 py-4 font-medium text-slate-900">
                  <div className="flex items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                             <input 
                                type="text" 
                                value={item.description}
                                onChange={(e) => onUpdateItem(item.id, 'description', e.target.value)}
                                className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-medium"
                              />
                             {item.productNumber && (
                                <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                    #{item.productNumber}
                                </span>
                             )}
                        </div>
                      
                      <div className="flex items-center gap-3">
                         {item.isDatabaseMatch ? (
                            <span className="flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100" title="Matched from Master Product List">
                              <Database size={10} className="mr-1" /> Auto-Matched
                            </span>
                          ) : item.confidence < 0.7 && (
                            <span className="flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                              <AlertCircle size={10} className="mr-1" /> Check this
                            </span>
                          )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <input 
                    type="number" 
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(item.id, 'quantity', parseFloat(e.target.value))}
                    className="w-full bg-transparent border-none focus:ring-0 p-0 text-sm text-right"
                  />
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex items-center justify-end">
                    <span className="text-slate-400 mr-1">$</span>
                    <input 
                      type="number" 
                      value={item.unitPrice}
                      onChange={(e) => onUpdateItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                      className="w-20 bg-transparent border-none focus:ring-0 p-0 text-sm text-right"
                      step="0.01"
                    />
                   </div>
                </td>
                <td className="px-6 py-4 text-right font-semibold text-slate-900">
                  ${(item.quantity * item.unitPrice).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  <select
                    value={GL_CODES.findIndex(g => g.code === item.glCode && g.category === item.categoryName)}
                    onChange={(e) => handleGlChange(item.id, e.target.value)}
                    className={`
                      w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-slate-900 ring-1 ring-inset ring-slate-300 
                      focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6
                      ${item.isDatabaseMatch ? 'bg-emerald-50 text-emerald-900 ring-emerald-200' : ''}
                      ${!item.glCode ? 'bg-red-50 text-red-900 ring-red-300' : ''}
                    `}
                  >
                    <option value="-1">Select Code...</option>
                    {GL_CODES.map((gl, idx) => (
                      <option key={`${gl.code}-${gl.category}`} value={idx}>
                        {gl.code} - {gl.category}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-6 py-4 text-center">
                  <button 
                    onClick={() => onDeleteItem(item.id)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                        No items found. Upload an invoice to get started.
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
