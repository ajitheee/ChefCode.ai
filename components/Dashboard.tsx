import React, { useMemo } from 'react';
import { AnalysisResult, InvoiceItem } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { motion } from 'motion/react';

interface DashboardProps {
  data: AnalysisResult;
}

const COLORS = [
  '#0ea5e9', '#8b5cf6', '#f97316', '#10b981', '#ec4899',
  '#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#84cc16',
];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.items.forEach(item => {
      const key = `${item.glCode} - ${item.categoryName}`;
      totals[key] = (totals[key] || 0) + (parseFloat(item.totalPrice as any) || 0);
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.items]);

  const parsedTotal = parseFloat(data.totalAmount as any);
  const totalSpend = !isNaN(parsedTotal) && parsedTotal !== 0
    ? parsedTotal
    : data.items.reduce((acc, item) => acc + (parseFloat(item.totalPrice as any) || 0), 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0];
      const pct = totalSpend > 0 ? ((d.value / totalSpend) * 100).toFixed(1) : '0';
      return (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-sm border border-slate-700">
          <p className="font-semibold">{d.name || d.payload?.name}</p>
          <p className="text-slate-300 mt-0.5">${d.value.toFixed(2)} <span className="text-slate-500">({pct}%)</span></p>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── Category Breakdown Table ── */}
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden lg:col-span-1 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Category Breakdown</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {categoryTotals.map((cat, idx) => {
              const pct = totalSpend > 0 ? (cat.value / totalSpend) * 100 : 0;
              return (
                <div key={cat.name} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/50 transition-colors">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800 truncate">{cat.name}</span>
                      <span className="text-sm font-bold text-slate-900 ml-2 shrink-0">${cat.value.toFixed(2)}</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.08 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Total row */}
            <div className="px-5 py-3 flex items-center justify-between bg-slate-50">
              <span className="text-sm font-bold text-slate-800">Total</span>
              <span className="text-base font-black text-slate-900">${totalSpend.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* ── Charts ── */}
        <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden lg:col-span-2 shadow-sm flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Cost Distribution</h3>
          </div>

          <div className="flex-1 p-5 flex flex-col md:flex-row gap-6 min-h-[320px]">
            {/* Donut Chart */}
            <div className="flex-1 h-[300px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTotals}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryTotals.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Center label */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-2xl font-black text-slate-900">${totalSpend.toFixed(0)}</p>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total</p>
                </div>
              </div>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="flex-1 h-[300px] hidden md:block">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryTotals}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {categoryTotals.map((_, index) => (
                      <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
