import React, { useState, useEffect, useMemo } from 'react';
import { getSavedInvoices, updateInvoiceSplits } from '../services/storageService';
import { SavedInvoice, TrackerSplits } from '../types';
import { Edit2, Save, X, Table as TableIcon, List, Plus, Calculator } from 'lucide-react';

const FOOD_COLS = [
  "SYSCO", "SunRise Produce", "Giulianos Bakery", "Performance", "Spadra", 
  "Pepsi", "Misc.", "US FOOD", "Bon Suisse", "Wismettac", "M cafe", 
  "Freshpoint", "Unistar Foods", "Southern Glazer's / Reliant Coffee", 
  "Karat By Lollicup", "Cali Dumpling / Raindrop Investments 2 Inc", 
  "Coney Island / New carbo company or Golden Waffles", "IFS FOOD Services", 
  "SOUTH SHORE / CORE MARK"
];

const NON_FOOD_COLS = [
  "7287 - Custodial: Calico", "7155 - Laundry: Prudential", 
  "7171 - Maintenance: All Sharpened Knives", "7170 - Building/Maint: GNA Brook Fire", 
  "7326 - Expendable: IFS", "7327 - NON Expendable: IFS", 
  "7326 - Expendable: Dallas Bros", "7327 - NON Expendable: Dallas Bros", 
  "7326 - Expendable: SYSCO", "7327 - NON Expendable: Sysco", 
  "Misc: CINTAS, Airgas, ECO LAB, DON", "Non Expendable: Whirley Drink Works"
];

const getFoodColumn = (vendorName: string) => {
  if (!vendorName) return 'Misc.';
  const normalized = vendorName.toLowerCase();
  if (normalized.includes('sysco')) return 'SYSCO';
  if (normalized.includes('sunrise')) return 'SunRise Produce';
  if (normalized.includes('giuliano')) return 'Giulianos Bakery';
  if (normalized.includes('performance')) return 'Performance';
  if (normalized.includes('spadra')) return 'Spadra';
  if (normalized.includes('pepsi')) return 'Pepsi';
  if (normalized.includes('us food') || normalized.includes('usfood')) return 'US FOOD';
  if (normalized.includes('bon suisse')) return 'Bon Suisse';
  if (normalized.includes('wismettac')) return 'Wismettac';
  if (normalized.includes('m cafe') || normalized.includes('mcafe')) return 'M cafe';
  if (normalized.includes('freshpoint')) return 'Freshpoint';
  if (normalized.includes('unistar')) return 'Unistar Foods';
  if (normalized.includes('southern glazer') || normalized.includes('reliant')) return "Southern Glazer's / Reliant Coffee";
  if (normalized.includes('karat') || normalized.includes('lollicup')) return 'Karat By Lollicup';
  if (normalized.includes('cali dumpling') || normalized.includes('raindrop')) return 'Cali Dumpling / Raindrop Investments 2 Inc';
  if (normalized.includes('coney island') || normalized.includes('golden waffle')) return 'Coney Island / New carbo company or Golden Waffles';
  if (normalized.includes('ifs')) return 'IFS FOOD Services';
  if (normalized.includes('south shore') || normalized.includes('core mark')) return 'SOUTH SHORE / CORE MARK';
  return 'Misc.';
};

const getNonFoodColumn = (vendorName: string, splitType: 'expendable' | 'nonExpendable' | 'other') => {
  if (!vendorName) return 'Misc: CINTAS, Airgas, ECO LAB, DON';
  const normalized = vendorName.toLowerCase();
  if (normalized.includes('calico')) return '7287 - Custodial: Calico';
  if (normalized.includes('prudential')) return '7155 - Laundry: Prudential';
  if (normalized.includes('sharpened')) return '7171 - Maintenance: All Sharpened Knives';
  if (normalized.includes('gna brook')) return '7170 - Building/Maint: GNA Brook Fire';
  
  if (normalized.includes('ifs')) {
      if (splitType === 'nonExpendable') return '7327 - NON Expendable: IFS';
      return '7326 - Expendable: IFS';
  }
  if (normalized.includes('dallas')) {
      if (splitType === 'nonExpendable') return '7327 - NON Expendable: Dallas Bros';
      return '7326 - Expendable: Dallas Bros';
  }
  if (normalized.includes('sysco')) {
      if (splitType === 'nonExpendable') return '7327 - NON Expendable: Sysco';
      return '7326 - Expendable: SYSCO';
  }
  if (normalized.includes('whirley')) return 'Non Expendable: Whirley Drink Works';
  
  return 'Misc: CINTAS, Airgas, ECO LAB, DON';
};

const getNonFoodSplitType = (col: string): keyof TrackerSplits => {
  if (col.includes('7326') || col.includes('Expendable: IFS') || col.includes('Expendable: Dallas') || col.includes('Expendable: SYSCO')) return 'nonFoodExpendable';
  if (col.includes('7327') || col.includes('NON Expendable') || col.includes('Non Expendable')) return 'nonFoodNonExpendable';
  return 'nonFoodOther';
};

const getDay = (dateStr: string) => {
  if (!dateStr) return 1;
  
  // Try parsing YYYY-MM-DD or MM/DD/YYYY or DD-MM-YYYY
  const parts = dateStr.split(/[-/.]/);
  if (parts.length >= 3) {
    const p1 = parseInt(parts[0], 10);
    const p2 = parseInt(parts[1], 10);
    const p3 = parseInt(parts[2], 10);
    
    if (p1 > 1000) {
      // YYYY-MM-DD
      return p3;
    } else if (p1 > 12) {
      // DD-MM-YYYY
      return p1;
    } else if (p2 > 12) {
      // MM-DD-YYYY
      return p2;
    } else {
      // Ambiguous, assume MM/DD/YYYY which is US standard
      return p2;
    }
  }
  
  // Try standard parsing first, but replace hyphens with slashes to avoid UTC parsing issues
  let date = new Date(dateStr.replace(/-/g, '\/'));
  if (!isNaN(date.getTime())) {
      return date.getDate();
  }
  
  // Extract any number as a fallback
  const match = dateStr.match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    if (num >= 1 && num <= 31) return num;
  }
  
  return 1;
};

interface EditingCell {
  day: number;
  col: string;
  type: keyof TrackerSplits;
  currentValue: number;
  newValue: string;
}

const TrackerSheets: React.FC = () => {
  const [view, setView] = useState<'list' | 'excel'>('excel');
  const [invoices, setInvoices] = useState<SavedInvoice[]>([]);
  
  // List view editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TrackerSplits>({
    food: 0, nonFoodExpendable: 0, nonFoodNonExpendable: 0, nonFoodOther: 0
  });

  // Excel view editing state
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  useEffect(() => {
    const loadedInvoices = getSavedInvoices();
    
    // Migration: Calculate splits for any old invoices that don't have them
    let needsSave = false;
    const migratedInvoices = loadedInvoices.map(inv => {
      if (!inv.splits) {
        needsSave = true;
        // Basic fallback migration if we don't have items (we just put it in food or other based on vendor)
        const v = (inv.vendorName || '').toLowerCase();
        const isFood = v.includes('sunrise') || v.includes('giuliano') || v.includes('performance') || 
                       v.includes('spadra') || v.includes('pepsi') || v.includes('us food') || v.includes('usfood') ||
                       v.includes('bon suisse') || v.includes('wismettac') || v.includes('m cafe') || v.includes('mcafe') ||
                       v.includes('freshpoint') || v.includes('unistar') || v.includes('southern glazer') || v.includes('reliant') ||
                       v.includes('karat') || v.includes('lollicup') || v.includes('cali dumpling') || v.includes('raindrop') ||
                       v.includes('coney island') || v.includes('golden waffle') || v.includes('south shore') || v.includes('core mark');
        
        let parsedTotal = typeof inv.totalAmount === 'string' 
          ? parseFloat((inv.totalAmount as string).replace(/[^0-9.-]+/g, "")) 
          : inv.totalAmount;
        if (isNaN(parsedTotal)) parsedTotal = 0;

        return {
          ...inv,
          splits: {
            food: isFood ? parsedTotal : 0,
            nonFoodExpendable: 0,
            nonFoodNonExpendable: 0,
            nonFoodOther: isFood ? 0 : parsedTotal
          }
        };
      }
      return inv;
    });

    if (needsSave) {
      localStorage.setItem('chefcode_processed_invoices', JSON.stringify(migratedInvoices));
    }
    
    setInvoices(migratedInvoices);
  }, []);

  // --- List View Handlers ---
  const handleEdit = (inv: SavedInvoice) => {
    setEditingId(inv.id);
    setEditForm(inv.splits || { food: 0, nonFoodExpendable: 0, nonFoodNonExpendable: 0, nonFoodOther: 0 });
  };

  const handleSave = (id: string) => {
    updateInvoiceSplits(id, editForm);
    setInvoices(getSavedInvoices());
    setEditingId(null);
  };

  const handleChange = (field: keyof TrackerSplits, value: string) => {
    const num = parseFloat(value) || 0;
    setEditForm(prev => ({ ...prev, [field]: num }));
  };

  // --- Excel View Handlers ---
  const openCellEditor = (day: number, col: string, type: keyof TrackerSplits, currentValue: number) => {
    setEditingCell({ day, col, type, currentValue, newValue: currentValue > 0 ? currentValue.toString() : '' });
  };

  const handleCellSave = () => {
    if (!editingCell) return;
    
    const newTotal = parseFloat(editingCell.newValue) || 0;
    const diff = newTotal - editingCell.currentValue;
    
    if (diff !== 0) {
      const year = new Date().getFullYear();
      const month = new Date().getMonth() + 1;
      const dateStr = `${year}-${month.toString().padStart(2, '0')}-${editingCell.day.toString().padStart(2, '0')}`;
      
      const splits: TrackerSplits = { food: 0, nonFoodExpendable: 0, nonFoodNonExpendable: 0, nonFoodOther: 0 };
      splits[editingCell.type] = diff;

      const manualEntry: SavedInvoice = {
        id: `manual-${Date.now()}`,
        vendorName: editingCell.col,
        invoiceNumber: 'MANUAL ADJ',
        invoiceDate: dateStr,
        totalAmount: diff,
        processedAt: new Date().toISOString(),
        splits
      };

      const updatedInvoices = [...invoices, manualEntry];
      localStorage.setItem('chefcode_processed_invoices', JSON.stringify(updatedInvoices));
      setInvoices(updatedInvoices);
    }
    setEditingCell(null);
  };

  // Generate Excel-like data
  const { foodData, nonFoodData } = useMemo(() => {
    const fData: Record<number, Record<string, number>> = {};
    const nfData: Record<number, Record<string, number>> = {};
    
    for (let i = 1; i <= 31; i++) {
      fData[i] = {};
      nfData[i] = {};
      FOOD_COLS.forEach(c => fData[i][c] = 0);
      NON_FOOD_COLS.forEach(c => nfData[i][c] = 0);
    }

    invoices.forEach(inv => {
      const day = getDay(inv.invoiceDate);
      const splits = inv.splits || { food: 0, nonFoodExpendable: 0, nonFoodNonExpendable: 0, nonFoodOther: 0 };
      
      if (splits.food !== 0) {
        const col = getFoodColumn(inv.vendorName);
        fData[day][col] += splits.food;
      }
      if (splits.nonFoodExpendable !== 0) {
        const col = getNonFoodColumn(inv.vendorName, 'expendable');
        nfData[day][col] += splits.nonFoodExpendable;
      }
      if (splits.nonFoodNonExpendable !== 0) {
        const col = getNonFoodColumn(inv.vendorName, 'nonExpendable');
        nfData[day][col] += splits.nonFoodNonExpendable;
      }
      if (splits.nonFoodOther !== 0) {
        const col = getNonFoodColumn(inv.vendorName, 'other');
        nfData[day][col] += splits.nonFoodOther;
      }
    });

    return { foodData: fData, nonFoodData: nfData };
  }, [invoices]);

  return (
    <div className="animate-fade-in pb-12">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Tracker Sheets</h2>
          <p className="text-slate-500 mt-1">
            Click any cell in the Excel view to instantly edit or add a manual entry.
          </p>
        </div>
        
        <div className="flex bg-slate-200 p-1 rounded-lg self-start shadow-inner">
          <button
            onClick={() => setView('excel')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              view === 'excel' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <TableIcon size={16} className="mr-2" />
            Excel View
          </button>
          <button
            onClick={() => setView('list')}
            className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              view === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List size={16} className="mr-2" />
            Invoice List
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-indigo-600 uppercase tracking-wider">Food</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-emerald-600 uppercase tracking-wider">Expendable</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-emerald-600 uppercase tracking-wider">Non-Expendable</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-emerald-600 uppercase tracking-wider">Other Non-Food</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center">
                      <Calculator size={48} className="text-slate-300 mb-4" />
                      <p>No invoices processed yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const isEditing = editingId === inv.id;
                  const splits = inv.splits || { food: 0, nonFoodExpendable: 0, nonFoodNonExpendable: 0, nonFoodOther: 0 };
                  
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{inv.invoiceDate}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{inv.vendorName}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-900 text-right font-medium">
                        ${inv.totalAmount.toFixed(2)}
                      </td>
                      
                      {isEditing ? (
                        <>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <input type="number" step="0.01" className="w-24 text-right border-slate-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" value={editForm.food} onChange={(e) => handleChange('food', e.target.value)} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <input type="number" step="0.01" className="w-24 text-right border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" value={editForm.nonFoodExpendable} onChange={(e) => handleChange('nonFoodExpendable', e.target.value)} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <input type="number" step="0.01" className="w-24 text-right border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" value={editForm.nonFoodNonExpendable} onChange={(e) => handleChange('nonFoodNonExpendable', e.target.value)} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <input type="number" step="0.01" className="w-24 text-right border-slate-300 rounded-md shadow-sm focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm" value={editForm.nonFoodOther} onChange={(e) => handleChange('nonFoodOther', e.target.value)} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <div className="flex justify-center space-x-2">
                              <button onClick={() => handleSave(inv.id)} className="text-green-600 hover:text-green-900 bg-green-50 p-1.5 rounded-md transition-colors"><Save size={16} /></button>
                              <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-900 bg-red-50 p-1.5 rounded-md transition-colors"><X size={16} /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-indigo-700 text-right font-medium font-mono">{splits.food !== 0 ? `$${splits.food.toFixed(2)}` : '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-emerald-700 text-right font-medium font-mono">{splits.nonFoodExpendable !== 0 ? `$${splits.nonFoodExpendable.toFixed(2)}` : '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-emerald-700 text-right font-medium font-mono">{splits.nonFoodNonExpendable !== 0 ? `$${splits.nonFoodNonExpendable.toFixed(2)}` : '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-emerald-700 text-right font-medium font-mono">{splits.nonFoodOther !== 0 ? `$${splits.nonFoodOther.toFixed(2)}` : '-'}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-center">
                            <button onClick={() => handleEdit(inv)} className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-md transition-colors">
                              <Edit2 size={16} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-12">
          {/* FOOD TRACKER EXCEL VIEW */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-white tracking-wide">FOOD TRACKER</h3>
              <div className="text-indigo-100 text-sm font-medium bg-indigo-700/50 px-3 py-1 rounded-full">
                Click any cell to edit
              </div>
            </div>
            <div className="overflow-auto custom-scrollbar relative flex-1">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-3 py-3 text-center text-xs font-bold text-slate-700 w-16 shadow-[1px_1px_0_0_#e2e8f0]">Day</th>
                    {FOOD_COLS.map(col => (
                      <th key={col} className="sticky top-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-3 py-3 text-center text-xs font-semibold text-slate-600 min-w-[110px] shadow-[0_1px_0_0_#e2e8f0]">
                        {col}
                      </th>
                    ))}
                    <th className="sticky top-0 right-0 z-30 bg-indigo-50 border-b border-l border-slate-200 px-4 py-3 text-center text-xs font-bold text-indigo-900 shadow-[-1px_1px_0_0_#e2e8f0]">Daily Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const rowTotal = FOOD_COLS.reduce((sum, col) => sum + foodData[day][col], 0);
                    return (
                      <tr key={`food-day-${day}`} className="group">
                        <td className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-900 group-hover:bg-slate-100 shadow-[1px_0_0_0_#e2e8f0] transition-colors">{day}</td>
                        {FOOD_COLS.map(col => {
                          const val = foodData[day][col];
                          return (
                            <td 
                              key={`${day}-${col}`} 
                              onClick={() => openCellEditor(day, col, 'food', val)}
                              className="relative border-b border-r border-slate-100 px-3 py-2 text-right text-sm font-mono text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-inner cursor-pointer transition-all duration-150 group-hover:border-slate-200"
                            >
                              {val !== 0 ? val.toFixed(2) : <span className="text-slate-300">-</span>}
                            </td>
                          );
                        })}
                        <td className="sticky right-0 z-10 bg-indigo-50/50 border-b border-l border-slate-200 px-4 py-2 text-right text-sm font-bold font-mono text-indigo-900 group-hover:bg-indigo-50 shadow-[-1px_0_0_0_#e2e8f0] transition-colors">
                          {rowTotal !== 0 ? rowTotal.toFixed(2) : <span className="text-indigo-300">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 z-20 bg-slate-100 shadow-[0_-1px_0_0_#e2e8f0]">
                  <tr>
                    <td className="sticky left-0 z-30 bg-slate-100 border-t border-r border-slate-300 px-3 py-3 text-right text-sm font-bold text-slate-900 shadow-[1px_-1px_0_0_#cbd5e1]">TOTAL</td>
                    {FOOD_COLS.map(col => {
                      const colTotal = Array.from({ length: 31 }, (_, i) => i + 1).reduce((sum, day) => sum + foodData[day][col], 0);
                      return (
                        <td key={`total-${col}`} className="border-t border-r border-slate-300 px-3 py-3 text-right text-sm font-bold font-mono text-slate-900">
                          {colTotal !== 0 ? colTotal.toFixed(2) : <span className="text-slate-400">-</span>}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-30 bg-indigo-100 border-t border-l border-slate-300 px-4 py-3 text-right text-base font-black font-mono text-indigo-700 shadow-[-1px_-1px_0_0_#cbd5e1]">
                      ${Array.from({ length: 31 }, (_, i) => i + 1).reduce((sum, day) => sum + FOOD_COLS.reduce((s, c) => s + foodData[day][c], 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* NON-FOOD TRACKER EXCEL VIEW */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col" style={{ maxHeight: '80vh' }}>
            <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-white tracking-wide">NON-FOOD TRACKER</h3>
              <div className="text-emerald-100 text-sm font-medium bg-emerald-700/50 px-3 py-1 rounded-full">
                Click any cell to edit
              </div>
            </div>
            <div className="overflow-auto custom-scrollbar relative flex-1">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-30 bg-slate-100 border-b border-r border-slate-200 px-3 py-3 text-center text-xs font-bold text-slate-700 w-16 shadow-[1px_1px_0_0_#e2e8f0]">Day</th>
                    {NON_FOOD_COLS.map(col => {
                      const parts = col.split(':');
                      return (
                        <th key={col} className="sticky top-0 z-20 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-600 min-w-[130px] shadow-[0_1px_0_0_#e2e8f0]">
                          <div className="flex flex-col items-center justify-center h-full">
                            {parts.length > 1 ? (
                              <>
                                <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider mb-1">{parts[0]}</span>
                                <span>{parts[1].trim()}</span>
                              </>
                            ) : (
                              <span>{col}</span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                    <th className="sticky top-0 right-0 z-30 bg-emerald-50 border-b border-l border-slate-200 px-4 py-3 text-center text-xs font-bold text-emerald-900 shadow-[-1px_1px_0_0_#e2e8f0]">Daily Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                    const rowTotal = NON_FOOD_COLS.reduce((sum, col) => sum + nonFoodData[day][col], 0);
                    return (
                      <tr key={`nonfood-day-${day}`} className="group">
                        <td className="sticky left-0 z-10 bg-slate-50 border-b border-r border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-900 group-hover:bg-slate-100 shadow-[1px_0_0_0_#e2e8f0] transition-colors">{day}</td>
                        {NON_FOOD_COLS.map(col => {
                          const val = nonFoodData[day][col];
                          const splitType = getNonFoodSplitType(col);
                          return (
                            <td 
                              key={`${day}-${col}`} 
                              onClick={() => openCellEditor(day, col, splitType, val)}
                              className="relative border-b border-r border-slate-100 px-3 py-2 text-right text-sm font-mono text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-inner cursor-pointer transition-all duration-150 group-hover:border-slate-200"
                            >
                              {val !== 0 ? val.toFixed(2) : <span className="text-slate-300">-</span>}
                            </td>
                          );
                        })}
                        <td className="sticky right-0 z-10 bg-emerald-50/50 border-b border-l border-slate-200 px-4 py-2 text-right text-sm font-bold font-mono text-emerald-900 group-hover:bg-emerald-50 shadow-[-1px_0_0_0_#e2e8f0] transition-colors">
                          {rowTotal !== 0 ? rowTotal.toFixed(2) : <span className="text-emerald-300">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 z-20 bg-slate-100 shadow-[0_-1px_0_0_#e2e8f0]">
                  <tr>
                    <td className="sticky left-0 z-30 bg-slate-100 border-t border-r border-slate-300 px-3 py-3 text-right text-sm font-bold text-slate-900 shadow-[1px_-1px_0_0_#cbd5e1]">TOTAL</td>
                    {NON_FOOD_COLS.map(col => {
                      const colTotal = Array.from({ length: 31 }, (_, i) => i + 1).reduce((sum, day) => sum + nonFoodData[day][col], 0);
                      return (
                        <td key={`total-${col}`} className="border-t border-r border-slate-300 px-3 py-3 text-right text-sm font-bold font-mono text-slate-900">
                          {colTotal !== 0 ? colTotal.toFixed(2) : <span className="text-slate-400">-</span>}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 z-30 bg-emerald-100 border-t border-l border-slate-300 px-4 py-3 text-right text-base font-black font-mono text-emerald-700 shadow-[-1px_-1px_0_0_#cbd5e1]">
                      ${Array.from({ length: 31 }, (_, i) => i + 1).reduce((sum, day) => sum + NON_FOOD_COLS.reduce((s, c) => s + nonFoodData[day][c], 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CELL EDITOR MODAL */}
      {editingCell && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-900 flex items-center">
                <Edit2 size={18} className="mr-2 text-indigo-600" />
                Edit Cell Value
              </h3>
              <button onClick={() => setEditingCell(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-md hover:bg-slate-200">
                <X size={20}/>
              </button>
            </div>
            <div className="p-6">
              <div className="mb-6 bg-slate-50 rounded-lg p-4 border border-slate-100">
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-slate-500">Day:</span>
                  <span className="text-sm font-bold text-slate-900">{editingCell.day}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Vendor/Category:</span>
                  <span className="text-sm font-bold text-slate-900 text-right">{editingCell.col}</span>
                </div>
              </div>
              
              <label className="block text-sm font-medium text-slate-700 mb-2">New Total Amount ($)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500 sm:text-lg">$</span>
                </div>
                <input 
                  type="number" 
                  step="0.01"
                  autoFocus
                  className="block w-full pl-8 pr-4 py-3 border-slate-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-lg font-mono transition-shadow"
                  value={editingCell.newValue}
                  onChange={(e) => setEditingCell({...editingCell, newValue: e.target.value})}
                  onKeyDown={(e) => e.key === 'Enter' && handleCellSave()}
                />
              </div>
              <p className="mt-4 text-xs text-slate-500 flex items-start">
                <Calculator size={14} className="mr-1.5 shrink-0 mt-0.5" />
                This will automatically calculate the difference and create a manual adjustment entry to match your new total.
              </p>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end space-x-3">
              <button 
                onClick={() => setEditingCell(null)} 
                className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCellSave} 
                className="px-6 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center"
              >
                <Save size={16} className="mr-2" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackerSheets;
