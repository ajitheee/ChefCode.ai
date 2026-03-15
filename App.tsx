import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import InvoiceTable from './components/InvoiceTable';
import AddProductModal from './components/AddProductModal';
import TrackerSheets from './components/TrackerSheets';
import { AnalysisResult, InvoiceItem, ProcessingStatus, SavedInvoice, Product } from './types';
import { analyzeInvoiceImage } from './services/geminiService';
import { saveInvoiceToHistory, checkForDuplicate } from './services/storageService';
import { saveNewProduct } from './services/productService';
import { ChefHat, Download, RotateCcw, Save, CheckCircle2, AlertTriangle, FileText, ExternalLink, LayoutDashboard, TableProperties } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'processor' | 'trackers'>('processor');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<SavedInvoice | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // State for Add Product Modal
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState<InvoiceItem | null>(null);

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
    setDuplicateWarning(null);
    setIsSaved(false);

    try {
      const { base64, mimeType } = await processFile(file);
      setPreviewImage(`data:${mimeType};base64,${base64}`);
      setStatus('analyzing');
      const data = await analyzeInvoiceImage(base64, mimeType);
      
      // Check for duplicates
      const duplicate = checkForDuplicate(data);
      if (duplicate) {
        setDuplicateWarning(duplicate);
      }

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
    const updatedItems = result.items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        // Recalculate totalPrice if quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = parseFloat(updatedItem.quantity as any) || 0;
          const price = parseFloat(updatedItem.unitPrice as any) || 0;
          updatedItem.totalPrice = qty * price;
        }
        return updatedItem;
      }
      return item;
    });
    
    setResult({ ...result, items: updatedItems });
  };

  const handleDeleteItem = (id: string) => {
    if (!result) return;
    const updatedItems = result.items.filter(item => item.id !== id);
    setResult({ ...result, items: updatedItems });
  };

  const handleOpenAddProduct = (item: InvoiceItem) => {
    setProductToAdd(item);
    setIsAddProductOpen(true);
  };

  const handleSaveProduct = (newProduct: Product) => {
    saveNewProduct(newProduct);
    
    // Update the item in the current view to show it's now matched
    if (result && productToAdd) {
        const updatedItems = result.items.map(item => 
            item.id === productToAdd.id 
                ? { 
                    ...item, 
                    glCode: newProduct.code, 
                    categoryName: newProduct.category, 
                    isDatabaseMatch: true 
                  }
                : item
        );
        setResult({...result, items: updatedItems});
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setErrorMsg(null);
    setDuplicateWarning(null);
    setIsSaved(false);
    setPreviewImage(null);
  };

  const handleSaveAndFinish = () => {
    if (result) {
      saveInvoiceToHistory(result);
      setIsSaved(true);
      // Removed auto-reset so user can download the updated invoice
    }
  };

  const getCleanVendorName = (vendorName: string) => {
    if (!vendorName) return "UnknownVendor";
    const normalized = vendorName.toLowerCase();
    if (normalized.includes('sysco')) return 'Sysco';
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
    if (normalized.includes('southern glazer') || normalized.includes('reliant')) return "Southern Glazer's";
    if (normalized.includes('karat') || normalized.includes('lollicup')) return 'Karat By Lollicup';
    if (normalized.includes('cali dumpling') || normalized.includes('raindrop')) return 'Cali Dumpling';
    if (normalized.includes('coney island') || normalized.includes('golden waffle')) return 'Coney Island';
    if (normalized.includes('ifs')) return 'IFS';
    if (normalized.includes('south shore') || normalized.includes('core mark')) return 'SOUTH SHORE';
    if (normalized.includes('calico')) return 'Calico';
    if (normalized.includes('prudential')) return 'Prudential';
    if (normalized.includes('sharpened')) return 'All Sharpened Knives';
    if (normalized.includes('gna brook')) return 'GNA Brook Fire';
    if (normalized.includes('dallas')) return 'Dallas Bros';
    if (normalized.includes('whirley')) return 'Whirley Drink Works';
    if (normalized.includes('cintas')) return 'CINTAS';
    if (normalized.includes('airgas')) return 'Airgas';
    if (normalized.includes('eco lab') || normalized.includes('ecolab')) return 'ECO LAB';
    if (normalized.includes('don')) return 'DON';
    
    // Fallback: return the original but split by common delimiters to remove location
    return vendorName.split(',')[0].split('-')[0].trim();
  };

  const handleDownloadUpdatedInvoice = async () => {
    if (!result || !previewImage) return;

    const cleanVendor = getCleanVendorName(result.vendorName);
    const safeVendor = cleanVendor.replace(/[/\\?%*:|"<>]/g, '-');
    const safeInvNum = (result.invoiceNumber || "UnknownInvoice").replace(/[/\\?%*:|"<>]/g, '-');
    const totalAmt = parseFloat(result.totalAmount as any) || 0;
    const fileName = `F02124 ${safeVendor} ${safeInvNum} $${totalAmt.toFixed(2)}.pdf`;

    const doc = new jsPDF();
    
    // Page 1: Cover Page
    doc.setFontSize(22);
    doc.text("Invoice Summary", 20, 30);
    
    doc.setFontSize(12);
    doc.text(`Vendor Name: ${result.vendorName}`, 20, 50);
    doc.text(`Invoice Date: ${result.invoiceDate || 'N/A'}`, 20, 60);
    doc.text(`Invoice Number: ${result.invoiceNumber || 'N/A'}`, 20, 70);
    doc.text(`Total Amount: $${totalAmt.toFixed(2)}`, 20, 80);
    
    doc.setFontSize(16);
    doc.text("GL Code Breakdown", 20, 100);
    
    // Calculate category breakdown by GL Code
    const codeTotals: Record<string, number> = {};
    result.items.forEach(item => {
      const code = item.glCode || 'Uncategorized';
      codeTotals[code] = (codeTotals[code] || 0) + (parseFloat(item.totalPrice as any) || 0);
    });
    
    let yPos = 115;
    doc.setFontSize(12);
    Object.entries(codeTotals).forEach(([code, total]) => {
      doc.text(`${code}: $${total.toFixed(2)}`, 20, yPos);
      yPos += 10;
    });

    if (previewImage.startsWith('data:image/')) {
      // Page 2: Original Invoice Image
      doc.addPage();
      
      try {
        // Calculate aspect ratio to fit image on page
        const imgProps = doc.getImageProperties(previewImage);
        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = doc.internal.pageSize.getHeight();
        
        const imgRatio = imgProps.width / imgProps.height;
        const pdfRatio = pdfWidth / pdfHeight;
        
        let finalWidth = pdfWidth;
        let finalHeight = pdfHeight;
        
        if (imgRatio > pdfRatio) {
          // Image is wider than page
          finalWidth = pdfWidth;
          finalHeight = pdfWidth / imgRatio;
        } else {
          // Image is taller than page
          finalHeight = pdfHeight;
          finalWidth = pdfHeight * imgRatio;
        }
        
        // Center the image
        const xOffset = (pdfWidth - finalWidth) / 2;
        const yOffset = (pdfHeight - finalHeight) / 2;
        
        let format = previewImage.substring(previewImage.indexOf('/') + 1, previewImage.indexOf(';')).toUpperCase();
        if (format === 'JPEG') format = 'JPEG';
        else if (format === 'JPG') format = 'JPEG';
        
        doc.addImage(previewImage, format, xOffset, yOffset, finalWidth, finalHeight);
      } catch (e) {
        console.error("Error adding image to PDF:", e);
        doc.setFontSize(12);
        doc.text("Error: Could not attach the original invoice image.", 20, 30);
      }
      doc.save(fileName);
    } else if (previewImage.startsWith('data:application/pdf')) {
      try {
        // Merge the jsPDF output with the original PDF using pdf-lib
        const coverPdfBytes = doc.output('arraybuffer');
        const mergedPdf = await PDFDocument.load(coverPdfBytes);
        
        const originalPdfBytes = await fetch(previewImage).then(res => res.arrayBuffer());
        const originalPdf = await PDFDocument.load(originalPdfBytes);
        
        const copiedPages = await mergedPdf.copyPages(originalPdf, originalPdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
        
        const mergedPdfBytes = await mergedPdf.save();
        
        // Create a blob and download
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error("Error merging PDF:", e);
        doc.addPage();
        doc.setFontSize(12);
        doc.text("Error: Could not attach the original invoice PDF.", 20, 30);
        doc.save(fileName);
      }
    } else {
      doc.addPage();
      doc.setFontSize(12);
      doc.text("Original invoice was an unsupported format and cannot be attached.", 20, 30);
      doc.save(fileName);
    }
  };

  const handleOpenPreview = () => {
    if (previewImage) {
      const newTab = window.open();
      if (newTab) {
        if (previewImage.startsWith('data:application/pdf')) {
          newTab.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Invoice Preview</title>
                <style>
                  body { margin: 0; background-color: #0f172a; height: 100vh; overflow: hidden; }
                  iframe { width: 100%; height: 100%; border: none; }
                </style>
              </head>
              <body>
                <iframe src="${previewImage}"></iframe>
              </body>
            </html>
          `);
        } else {
          newTab.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Invoice Preview</title>
                <style>
                  body { margin: 0; display: flex; justify-content: center; align-items: center; background-color: #0f172a; height: 100vh; }
                  img { max-width: 100%; max-height: 100%; object-fit: contain; }
                </style>
              </head>
              <body>
                <img src="${previewImage}" alt="Invoice Preview" />
              </body>
            </html>
          `);
        }
        newTab.document.close();
      } else {
        alert("Please allow popups to view the invoice preview.");
      }
    }
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
              <div className="ml-3 mr-8">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">ChefCode<span className="text-indigo-600">.ai</span></h1>
                <p className="text-xs text-slate-500">Automated Culinary Ledger</p>
              </div>
              
              <div className="hidden sm:flex space-x-2">
                <button
                  onClick={() => setActiveTab('processor')}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    activeTab === 'processor' 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <LayoutDashboard size={16} className="mr-2" />
                  Invoice Processor
                </button>
                <button
                  onClick={() => setActiveTab('trackers')}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center ${
                    activeTab === 'trackers' 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <TableProperties size={16} className="mr-2" />
                  Tracker Sheets
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
               {activeTab === 'processor' && status === 'complete' && (
                 <>
                   <button 
                    onClick={handleReset}
                    className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                   >
                     <RotateCcw size={16} className="mr-2" />
                     New Scan
                   </button>
                   <button 
                    onClick={handleDownloadUpdatedInvoice}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                   >
                     <Download size={16} className="mr-2" />
                     Download Updated Invoice
                   </button>
                 </>
               )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'trackers' ? (
          <TrackerSheets />
        ) : isSaved ? (
           <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
              <div className="bg-green-100 p-4 rounded-full text-green-600 mb-4">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Invoice Saved!</h2>
              <p className="text-slate-500 mt-2 mb-8">Your invoice has been successfully processed and saved.</p>
              <div className="flex gap-4">
                <button 
                  onClick={handleDownloadUpdatedInvoice}
                  className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Download size={20} className="mr-2" />
                  Download Updated Invoice
                </button>
                <button 
                  onClick={handleReset}
                  className="inline-flex items-center px-6 py-3 border border-slate-300 shadow-sm text-base font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <RotateCcw size={20} className="mr-2" />
                  New Scan
                </button>
              </div>
           </div>
        ) : status === 'idle' || status === 'uploading' || status === 'analyzing' ? (
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
          <div className="space-y-8 pb-20">
            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4 animate-fade-in">
                 <AlertTriangle className="text-amber-600 flex-shrink-0 mt-1" size={24} />
                 <div className="flex-1">
                    <h4 className="font-bold text-amber-900">Possible Duplicate Invoice Detected</h4>
                    <p className="text-amber-800 text-sm mt-1">
                       An invoice with number <strong>{duplicateWarning.invoiceNumber}</strong> from <strong>{duplicateWarning.vendorName}</strong> was already processed on {new Date(duplicateWarning.processedAt).toLocaleDateString()}.
                    </p>
                 </div>
                 <button 
                   onClick={() => setDuplicateWarning(null)}
                   className="text-amber-900 underline text-sm font-medium"
                 >
                   Dismiss
                 </button>
              </div>
            )}

            {result && (
              <>
                 {/* Explicit Review Header */}
                 <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
                   <div className="flex items-center space-x-2">
                     <FileText className="text-indigo-600" size={28} />
                     <h2 className="text-2xl font-bold text-slate-900">Invoice Review</h2>
                   </div>
                   {previewImage && (
                     <button
                       onClick={handleOpenPreview}
                       className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                     >
                       <ExternalLink size={16} className="mr-2" />
                       View Original Invoice
                     </button>
                   )}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                   <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                     <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
                     <input 
                       type="text" 
                       value={result.invoiceDate || ''} 
                       onChange={(e) => setResult({...result, invoiceDate: e.target.value})}
                       className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                       placeholder="YYYY-MM-DD"
                     />
                   </div>
                   <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                     <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                     <input 
                       type="text" 
                       value={result.invoiceNumber || ''} 
                       onChange={(e) => setResult({...result, invoiceNumber: e.target.value})}
                       className="w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                       placeholder="Invoice #"
                     />
                   </div>
                   <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                     <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount</label>
                     <div className="relative">
                       <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                         <span className="text-slate-500 sm:text-sm">$</span>
                       </div>
                       <input 
                         type="number" 
                         step="0.01"
                         value={result.totalAmount === 0 ? '' : result.totalAmount} 
                         onChange={(e) => setResult({...result, totalAmount: e.target.value as any})}
                         className="w-full rounded-md border-slate-300 pl-7 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                         placeholder="0.00"
                       />
                     </div>
                   </div>
                 </div>

                <Dashboard data={result} />
                
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Line Items Review</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Verify codes below. Click <span className="text-indigo-600 font-medium">Add to DB</span> to save new products for future scans.
                        </p>
                    </div>
                  </div>
                  <InvoiceTable 
                    items={result.items} 
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    onAddToDb={handleOpenAddProduct}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <AddProductModal 
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        initialItem={productToAdd}
        onSave={handleSaveProduct}
      />
      
      {/* Floating Action Bar for Completion */}
      {status === 'complete' && !isSaved && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg z-40">
           <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
              <p className="text-sm text-slate-500 hidden sm:block">
                 Found {result?.items.length} items totaling ${result?.totalAmount.toFixed(2)}
              </p>
              <div className="flex gap-4 ml-auto">
                 <button 
                  onClick={handleReset}
                  className="px-6 py-2 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
                 >
                   Cancel
                 </button>
                 <button 
                  onClick={handleSaveAndFinish}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 flex items-center shadow-md transform hover:-translate-y-0.5 transition-all"
                 >
                   <CheckCircle2 size={20} className="mr-2" />
                   Finalize & Save
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
