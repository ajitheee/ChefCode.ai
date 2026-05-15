import React, { useRef, useState } from 'react';
import { Upload, Database, CheckCircle2, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Product } from '../types';
import { importProductsFromExcel } from '../services/productService';

export const AdminPanel: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('processing');
    setMessage('Reading file...');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        // Map data to Product interface
        const products: Product[] = data.map((row: any) => ({
          productNo: String(row['Product Number'] || row['productNo'] || row['Item'] || ''),
          description: String(row['Description'] || row['description'] || ''),
          category: String(row['Category'] || row['category'] || 'Uncategorized'),
          code: String(row['GL Code'] || row['code'] || '')
        })).filter(p => p.description && p.code); // Basic validation

        const addedCount = importProductsFromExcel(products);
        
        setStatus('success');
        setMessage(`Successfully imported ${addedCount} new products from ${products.length} rows.`);
      } catch (error) {
        console.error(error);
        setStatus('error');
        setMessage('Failed to parse Excel file. Please ensure it has columns like "Product Number", "Description", "Category", and "GL Code".');
      }
    };
    reader.onerror = () => {
      setStatus('error');
      setMessage('Failed to read file.');
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-6">
          <Database className="h-6 w-6 text-cyan-600 mr-2" />
          <h2 className="text-xl font-bold text-slate-900">Admin Settings</h2>
        </div>

        <div className="border-t border-slate-200 pt-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Master Product Database</h3>
          <p className="text-sm text-slate-500 mb-6">
            Upload an Excel (.xlsx) or CSV file to bulk import products and GL codes. 
            The file should contain columns for <strong>Product Number</strong>, <strong>Description</strong>, <strong>Category</strong>, and <strong>GL Code</strong>.
          </p>

          <div className="flex items-center justify-center w-full">
            <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-slate-300 border-dashed rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-slate-400" />
                <p className="mb-2 text-sm text-slate-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                <p className="text-xs text-slate-500">XLSX, XLS, or CSV</p>
              </div>
              <input 
                id="dropzone-file" 
                type="file" 
                className="hidden" 
                accept=".xlsx, .xls, .csv"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
            </label>
          </div>

          {status === 'processing' && (
            <div className="mt-4 p-4 bg-blue-50 text-blue-700 rounded-md flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
              {message}
            </div>
          )}

          {status === 'success' && (
            <div className="mt-4 p-4 bg-emerald-50 text-emerald-700 rounded-md flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {message}
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
