import React, { useMemo } from 'react';
import { AnalysisResult, InvoiceItem } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign, FileText, Calendar, Tag, MapPin, AlertTriangle, CheckCircle } from 'lucide-react';

interface DashboardProps {
  data: AnalysisResult;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

const Dashboard: React.FC<DashboardProps> = ({ data }) => {
  
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    data.items.forEach(item => {
      const key = `${item.glCode} - ${item.categoryName}`;
      totals[key] = (totals[key] || 0) + item.totalPrice;
    });
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data.items]);

  const totalSpend = data.totalAmount || data.items.reduce((acc, item) => acc + item.totalPrice, 0);

  // Address Validation Logic
  const isValidAddress = useMemo(() => {
    if (!data.deliveryAddress) return false;
    const addr = data.deliveryAddress.toUpperCase();
    return addr.includes("CENTERPOINTE") || addr.includes("3801 W TEMPLE") || addr.includes("3801 WEST TEMPLE");
  }, [data.deliveryAddress]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Address Verification Banner */}
      <div className={`p-4 rounded-xl border flex items-start space-x-3 ${isValidAddress ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
         {isValidAddress ? (
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={24} />
         ) : (
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={24} />
         )}
         <div>
            <h4 className={`font-semibold ${isValidAddress ? 'text-green-900' : 'text-red-900'}`}>
                {isValidAddress ? 'Delivery Address Verified' : 'Warning: Delivery Address Mismatch'}
            </h4>
            <p className={`text-sm ${isValidAddress ? 'text-green-700' : 'text-red-700'}`}>
                Detected: {data.deliveryAddress || "Not found"}
            </p>
            {!isValidAddress && (
                <p className="text-xs text-red-600 mt-1 font-medium">
                    Please verify this invoice is for the correct location (Centerpointe or 3801 W Temple).
                </p>
            )}
         </div>
      </div>

      {/* Header Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Total Amount</p>
            <p className="text-2xl font-bold text-slate-900">${totalSpend.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Vendor</p>
            <p className="text-lg font-bold text-slate-900 truncate max-w-[150px]" title={data.vendorName}>
              {data.vendorName || "Unknown"}
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Date</p>
            <p className="text-lg font-bold text-slate-900">{data.invoiceDate || "N/A"}</p>
          </div>
        </div>
        
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-lg">
            <Tag size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Items</p>
            <p className="text-2xl font-bold text-slate-900">{data.items.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Category Breakdown</h3>
            <div className="overflow-hidden rounded-lg border border-slate-100">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-100">
                        {categoryTotals.map((cat, idx) => (
                            <tr key={cat.name}>
                                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-slate-700 flex items-center">
                                    <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                    {cat.name}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900 text-right">
                                    ${cat.value.toFixed(2)}
                                </td>
                            </tr>
                        ))}
                         <tr className="bg-slate-50 font-bold">
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-800">Total</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-slate-900 text-right">${totalSpend.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        {/* Charts */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-2 flex flex-col">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Cost Distribution</h3>
          
          <div className="flex-1 min-h-[300px] flex flex-col md:flex-row gap-8">
             {/* Pie Chart - Fixed overlapping by moving legend to bottom */}
             <div className="flex-1 h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                      <Pie
                        data={categoryTotals}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                      {categoryTotals.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Legend 
                        layout="horizontal" 
                        verticalAlign="bottom" 
                        align="center" 
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} 
                      />
                  </PieChart>
                </ResponsiveContainer>
             </div>
             
             {/* Bar Chart - Good for side-by-side comparison */}
             <div className="flex-1 h-[300px] hidden md:block">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={categoryTotals}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="name" width={120} tick={{fontSize: 10}} />
                        <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} cursor={{fill: 'transparent'}} />
                        <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]}>
                        {categoryTotals.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
