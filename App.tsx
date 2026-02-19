import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import InvoiceTable from './components/InvoiceTable';
import { AnalysisResult, InvoiceItem, ProcessingStatus } from './types';
import { analyzeInvoiceImage } from './services/geminiService';
import { ChefHat, Download, RotateCcw, Save } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Helper to convert file to base64 and extract mimeType
  const processFile = (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Data URL format: "data:image/jpeg;base64,/9j/4AAQ..."
        // Split at the comma to separate metadata from data
        const [metadata, base64Data] = result.split(',');
        
        // Extract mime type from metadata (e.g., "data:image/jpeg;base64")
        const mimeType = metadata.match(/:(.*?);/)?.[1] || file.type || 'image/png';
        
        resolve({ base64: base64Data, mimeType });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileSelect = async (file: File) => {
    setStatus('uploading');
    setErrorMsg(null);
    try {
      const { base64, mimeType } = await processFile(file);
      setStatus('analyzing');
      // Pass both base64 data and the detected mimeType
      const data = await analyzeInvoiceImage(base64, mimeType);
      setResult(data);
      setStatus('complete');
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to analyze invoice. Please try again or check your API key.");
      setStatus('error');
    }
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    if (!result) return;
    const updatedItems = result.items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    setResult({ ...result, items: updatedItems });
  };

  const handleDeleteItem = (id: string) => {
    if (!result) return;
    const updatedItems = result.items.filter(item => item.id !== id);
    setResult({ ...result, items: updatedItems });
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setErrorMsg(null);
  };

  const handleExport = () => {
    if (!result) return;
    const headers = ["Description", "Quantity", "Unit Price", "Total", "GL Code", "Category"];
    const rows = result.items.map(item => [
      `"${item.description.replace(/"/g, '""')}"`,
      item.quantity,
      item.unitPrice,
      item.totalPrice,
      item.glCode,
      `"${item.categoryName}"`
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoice_${result.invoiceNumber || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center text-indigo-600 bg-indigo-50 p-2 rounded-lg">
                <ChefHat size={24} />
              </div>
              <div className="ml-3">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">ChefCode<span className="text-indigo-600">.ai</span></h1>
                <p className="text-xs text-slate-500">Automated Culinary Ledger</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
               {status === 'complete' && (
                 <>
                   <button 
                    onClick={handleReset}
                    className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                   >
                     <RotateCcw size={16} className="mr-2" />
                     New Scan
                   </button>
                   <button 
                    onClick={handleExport}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                   >
                     <Download size={16} className="mr-2" />
                     Export CSV
                   </button>
                 </>
               )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {status === 'idle' || status === 'uploading' || status === 'analyzing' ? (
          <div className="max-w-3xl mx-auto mt-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
                Code Invoices in Seconds
              </h2>
              <p className="mt-4 text-lg text-slate-500">
                Upload your supplier invoices (Sysco, US Foods, etc.) and let our AI automatically assign GL codes to every line item.
              </p>
            </div>
            
            <FileUpload 
              onFileSelect={handleFileSelect} 
              isProcessing={status === 'analyzing' || status === 'uploading'} 
            />

            {status === 'error' && (
              <div className="mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center justify-center">
                 <p>{errorMsg}</p>
                 <button onClick={handleReset} className="ml-4 underline font-medium">Try again</button>
              </div>
            )}
            
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                   <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="mt-4 text-lg font-medium text-slate-900">Upload Invoice</h3>
                <p className="mt-2 text-base text-slate-500">
                  Drag & drop an image of your invoice.
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                   <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="mt-4 text-lg font-medium text-slate-900">AI Analysis</h3>
                <p className="mt-2 text-base text-slate-500">
                  We read line items and map them to your 63xx/7xxx codes.
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                   <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="mt-4 text-lg font-medium text-slate-900">Review & Export</h3>
                <p className="mt-2 text-base text-slate-500">
                  Verify the data and export to your accounting system.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {result && (
              <>
                <Dashboard data={result} />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-900">Line Items Review</h2>
                    <span className="text-sm text-slate-500">Review and correct any AI suggestions below</span>
                  </div>
                  <InvoiceTable 
                    items={result.items} 
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-400">
            &copy; {new Date().getFullYear()} ChefCode.ai. Culinary Intelligence.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;