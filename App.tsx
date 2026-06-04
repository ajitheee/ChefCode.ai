import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import InvoiceTable from './components/InvoiceTable';
import AddProductModal from './components/AddProductModal';
import TrackerSheets from './components/TrackerSheets';
import { AdminPanel } from './components/AdminPanel';
import { Login } from './components/Login';
import { AnalysisResult, InvoiceItem, ProcessingStatus, SavedInvoice, Product, UserRole } from './types';
import { analyzeInvoiceImage } from './services/geminiService';
import { saveInvoiceToHistory, checkForDuplicate, getSavedInvoices } from './services/storageService';
import { saveNewProduct } from './services/productService';
import { signOut, getSession, getUserRole, onAuthStateChange } from './services/authService';
import { exportInvoiceToCSV } from './utils/csvExport';
import { ChefHat, Download, RotateCcw, Save, CheckCircle2, AlertTriangle, FileText, ExternalLink, LayoutDashboard, TableProperties, MapPin, LogOut, Database, Building2, Calendar, Hash, DollarSign, Tag, CheckCircle, Menu, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { motion, AnimatePresence } from 'motion/react';

const LOCATIONS = ['Centerpointe', '3801 W Temple', 'Location C'];

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserRole>(null);
  const [currentLocation, setCurrentLocation] = useState<string>('Centerpointe');
  
  const [activeTab, setActiveTab] = useState<'processor' | 'trackers' | 'admin'>('processor');
  const [status, setStatus] = useState<ProcessingStatus>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<SavedInvoice | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // State for Add Product Modal
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [productToAdd, setProductToAdd] = useState<InvoiceItem | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<SavedInvoice[]>([]);

  useEffect(() => {
    // Check for existing Supabase session on load
    getSession().then((session) => {
      if (session?.user) {
        setCurrentUser(getUserRole(session.user));
      }
    });

    // Listen for auth changes (login/logout from other tabs)
    const subscription = onAuthStateChange((user) => {
      if (user) {
        setCurrentUser(getUserRole(user));
      } else {
        setCurrentUser(null);
      }
    });

    const savedLoc = localStorage.getItem('chefcode_location');
    if (savedLoc) setCurrentLocation(savedLoc);

    const loadRecent = async () => {
      const invoices = await getSavedInvoices();
      setRecentInvoices(invoices.slice(0, 5));
    };
    loadRecent();

    return () => { subscription.unsubscribe(); };
  }, []);

  const handleLogin = (role: UserRole) => {
    setCurrentUser(role);
  };

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const loc = e.target.value;
    setCurrentLocation(loc);
    localStorage.setItem('chefcode_location', loc);
  };

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
      
      data.location = currentLocation;

      // Check for price spikes
      const history = await getSavedInvoices();
      const enrichedItems = data.items.map(item => {
        let lastPrice: number | null = null;
        let lastDate: string | null = null;
        // Search history (assuming newest is last, so we search backwards)
        for (let i = history.length - 1; i >= 0; i--) {
          const inv = history[i];
          if (inv.items) {
            const matched = inv.items.find(historyItem => 
              historyItem.description === item.description || 
              (historyItem.productNumber && historyItem.productNumber === item.productNumber)
            );
            if (matched && matched.unitPrice) {
              lastPrice = matched.unitPrice;
              lastDate = inv.invoiceDate;
              break;
            }
          }
        }
        
        const isSpike = lastPrice !== null && item.unitPrice > lastPrice * 1.10; // 10% spike
        return { 
          ...item, 
          historicalPrice: lastPrice || undefined, 
          historicalDate: lastDate || undefined,
          priceSpike: isSpike 
        };
      });
      data.items = enrichedItems;

      // Check for duplicates
      const duplicate = await checkForDuplicate(data);
      if (duplicate) {
        setDuplicateWarning(duplicate);
      }

      setResult(data);
      setStatus('complete');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to analyze invoice. Please try again or check your API key.");
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

  const handleSaveAndFinish = async () => {
    if (result) {
      try {
        await saveInvoiceToHistory(result);
        setIsSaved(true);
      } catch (err: any) {
        console.error('Failed to save invoice:', err);
        setErrorMsg('Failed to save invoice. Please try again.');
      }
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

  const isValidAddress = result?.deliveryAddress ? (
    result.deliveryAddress.toUpperCase().includes("CENTERPOINTE") || 
    result.deliveryAddress.toUpperCase().includes("3801 W TEMPLE") || 
    result.deliveryAddress.toUpperCase().includes("3801 WEST TEMPLE")
  ) : false;

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#1a202c] text-white flex flex-col hidden md:flex flex-shrink-0">
        <div className="h-16 flex items-center px-6 bg-[#141923] border-b border-slate-700/50">
          <div className="flex items-center w-full py-2">
            <div className="bg-white p-1.5 rounded-xl border border-slate-200 mr-3 flex flex-shrink-0 items-center justify-center shadow-sm relative">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="h-[36px] w-auto object-contain" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  document.getElementById('fallback-icon-sidebar')!.style.display = 'block';
                }} 
              />
              <ChefHat id="fallback-icon-sidebar" size={28} className="text-slate-800" style={{ display: 'none' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">ChefCode<span className="text-cyan-400">.ai</span></h1>
            </div>
          </div>
        </div>
        
        <div className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
          <p className="px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Menu</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setActiveTab('processor')}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
              activeTab === 'processor' 
                ? 'bg-cyan-500/10 text-cyan-400' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            {activeTab === 'processor' && (
              <motion.div layoutId="active-nav" className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-r-full" />
            )}
            <LayoutDashboard size={18} className="mr-3" />
            Invoice Processor
          </motion.button>
          {currentUser === 'admin' && (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('trackers')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'trackers' 
                    ? 'bg-cyan-500/10 text-cyan-400' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {activeTab === 'trackers' && (
                  <motion.div layoutId="active-nav" className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-r-full" />
                )}
                <TableProperties size={18} className="mr-3" />
                Tracker Sheets
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab('admin')}
                className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                  activeTab === 'admin' 
                    ? 'bg-cyan-500/10 text-cyan-400' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                {activeTab === 'admin' && (
                  <motion.div layoutId="active-nav" className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500 rounded-r-full" />
                )}
                <Database size={18} className="mr-3" />
                Admin Panel
              </motion.button>
            </>
          )}
        </div>

        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4">
          <div className="flex items-center bg-slate-900 rounded-lg px-3 py-2 border border-slate-700">
            <MapPin size={16} className="text-slate-400 mr-2" />
            <select 
              value={currentLocation} 
              onChange={handleLocationChange}
              className="bg-transparent border-none text-sm font-medium text-slate-300 focus:ring-0 p-0 cursor-pointer w-full"
            >
              {LOCATIONS.map(loc => (
                <option key={loc} value={loc} className="bg-slate-900">{loc}</option>
              ))}
            </select>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <LogOut size={18} className="mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header (Mobile Nav & Actions) */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 flex-shrink-0">
          <div className="flex items-center">
            {/* Mobile Menu Toggle (Placeholder) */}
            <button className="md:hidden p-2 mr-3 text-slate-500 hover:bg-slate-100 rounded-md">
              <Menu size={20} />
            </button>
            <h2 className="text-xl font-semibold text-slate-800">
              {activeTab === 'processor' ? 'Invoice Processor' : activeTab === 'trackers' ? 'Tracker Sheets' : 'Admin Panel'}
            </h2>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
             {activeTab === 'processor' && status === 'complete' && (
               <>
                 <button 
                  onClick={handleReset}
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
                 >
                   <RotateCcw size={16} className="mr-2" />
                   New Scan
                 </button>
                 <button 
                  onClick={() => result && exportInvoiceToCSV(result as SavedInvoice)}
                  className="inline-flex items-center px-3 py-1.5 border border-slate-300 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
                 >
                   <Download size={16} className="mr-2" />
                   CSV
                 </button>
                 <button 
                  onClick={handleDownloadUpdatedInvoice}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
                 >
                   <Download size={16} className="mr-2" />
                   PDF
                 </button>
               </>
             )}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeTab}-${status}-${isSaved}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'admin' ? (
                  <AdminPanel />
                ) : activeTab === 'trackers' ? (
                  <TrackerSheets location={currentLocation} />
                ) : isSaved ? (
               <div className="flex flex-col items-center justify-center py-20">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", bounce: 0.5 }}
                    className="bg-green-100 p-4 rounded-full text-green-600 mb-4"
                  >
                    <CheckCircle2 size={48} />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-slate-900">Invoice Saved!</h2>
                  <p className="text-slate-500 mt-2 mb-8">Your invoice has been successfully processed and saved.</p>
                  <div className="flex gap-4">
                    <button 
                      onClick={handleDownloadUpdatedInvoice}
                      className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all hover:shadow-md"
                    >
                      <Download size={20} className="mr-2" />
                      Download Updated Invoice
                    </button>
                    <button 
                      onClick={handleReset}
                      className="inline-flex items-center px-6 py-3 border border-slate-300 shadow-sm text-base font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-all hover:shadow-md"
                    >
                      <RotateCcw size={20} className="mr-2" />
                      New Scan
                    </button>
                  </div>
               </div>
            ) : status === 'idle' || status === 'uploading' || status === 'analyzing' || status === 'error' ? (
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
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-cyan-500 text-white mx-auto">
                   <span className="text-xl font-bold">1</span>
                </div>
                <h3 className="mt-4 text-lg font-medium text-slate-900">Upload Invoice</h3>
                <p className="mt-2 text-base text-slate-500">
                  Drag & drop an image of your invoice.
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-cyan-500 text-white mx-auto">
                   <span className="text-xl font-bold">2</span>
                </div>
                <h3 className="mt-4 text-lg font-medium text-slate-900">AI Analysis</h3>
                <p className="mt-2 text-base text-slate-500">
                  We read line items and map them to your 63xx/7xxx codes.
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-cyan-500 text-white mx-auto">
                   <span className="text-xl font-bold">3</span>
                </div>
                <h3 className="mt-4 text-lg font-medium text-slate-900">Review & Export</h3>
                <p className="mt-2 text-base text-slate-500">
                  Verify the data and export to your accounting system.
                </p>
              </div>
            </div>
            
            <div className="mt-16 border-t border-slate-200 pt-12">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-slate-900 flex items-center">
                  <Calendar className="mr-2 text-cyan-500" size={24} />
                  Recent Activity
                </h3>
                <button 
                  onClick={() => setActiveTab('trackers')}
                  className="text-sm font-medium text-cyan-600 hover:text-cyan-700 flex items-center"
                >
                  View All <ExternalLink size={14} className="ml-1" />
                </button>
              </div>

              {recentInvoices.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentInvoices.map((invoice, idx) => (
                    <motion.div 
                      key={invoice.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex items-center justify-between group cursor-pointer"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="h-10 w-10 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:bg-cyan-100 transition-colors">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{invoice.vendorName || 'Unknown Vendor'}</p>
                          <p className="text-xs text-slate-500 flex items-center mt-0.5">
                            <Hash size={12} className="mr-1" /> {invoice.invoiceNumber || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">${parseFloat(invoice.totalAmount as any || 0).toFixed(2)}</p>
                        <p className="text-xs text-slate-500">{new Date(invoice.processedAt).toLocaleDateString()}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                  <FileText className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                  <h4 className="text-sm font-medium text-slate-900">No recent invoices</h4>
                  <p className="text-sm text-slate-500 mt-1">Upload your first invoice to see it here.</p>
                </div>
              )}
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
                 <div className="flex items-center justify-between mb-6">
                   <div className="flex items-center space-x-3">
                     <div className="p-2 bg-cyan-100 text-cyan-600 rounded-lg">
                       <FileText size={24} />
                     </div>
                     <div>
                       <h2 className="text-2xl font-bold text-slate-900">Invoice Review</h2>
                       <p className="text-sm text-slate-500">Verify extracted details before saving</p>
                     </div>
                   </div>
                   {previewImage && (
                     <button
                       onClick={handleOpenPreview}
                       className="inline-flex items-center px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 transition-colors"
                     >
                       <ExternalLink size={16} className="mr-2" />
                       View Original Invoice
                     </button>
                   )}
                 </div>

                 {/* Unified Invoice Details Card */}
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8">
                   {/* Address Verification Banner */}
                   <div className={`px-6 py-4 border-b flex items-start space-x-3 ${isValidAddress ? 'bg-emerald-50/50 border-emerald-100' : 'bg-rose-50/50 border-rose-100'}`}>
                      {isValidAddress ? (
                         <CheckCircle className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                      ) : (
                         <AlertTriangle className="text-rose-600 flex-shrink-0 mt-0.5" size={20} />
                      )}
                      <div>
                         <h4 className={`text-sm font-semibold ${isValidAddress ? 'text-emerald-900' : 'text-rose-900'}`}>
                             {isValidAddress ? 'Delivery Address Verified' : 'Warning: Delivery Address Mismatch'}
                         </h4>
                         <p className={`text-xs mt-0.5 ${isValidAddress ? 'text-emerald-700' : 'text-rose-700'}`}>
                             Detected: {result.deliveryAddress || "Not found"}
                         </p>
                         {!isValidAddress && (
                             <p className="text-xs text-rose-600 mt-1 font-medium">
                                 Please verify this invoice is for the correct location (Centerpointe or 3801 W Temple).
                             </p>
                         )}
                      </div>
                   </div>

                   {/* Editable Details Grid */}
                   <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                     {/* Vendor */}
                     <div className="lg:col-span-1">
                       <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                         <Building2 size={14} className="mr-1.5" /> Vendor
                       </label>
                       <p className="text-base font-bold text-slate-900 truncate" title={result.vendorName}>
                         {result.vendorName || "Unknown"}
                       </p>
                     </div>

                     {/* Invoice Date */}
                     <div className="lg:col-span-1">
                       <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                         <Calendar size={14} className="mr-1.5" /> Date
                       </label>
                       <input 
                         type="text" 
                         value={result.invoiceDate || ''} 
                         onChange={(e) => setResult({...result, invoiceDate: e.target.value})}
                         className="w-full rounded-lg border-slate-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm py-2 px-3 transition-colors"
                         placeholder="YYYY-MM-DD"
                       />
                     </div>

                     {/* Invoice Number */}
                     <div className="lg:col-span-1">
                       <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                         <Hash size={14} className="mr-1.5" /> Invoice #
                       </label>
                       <input 
                         type="text" 
                         value={result.invoiceNumber || ''} 
                         onChange={(e) => setResult({...result, invoiceNumber: e.target.value})}
                         className="w-full rounded-lg border-slate-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm py-2 px-3 transition-colors"
                         placeholder="Invoice #"
                       />
                     </div>

                     {/* Total Amount */}
                     <div className="lg:col-span-1">
                       <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                         <DollarSign size={14} className="mr-1.5" /> Total Amount
                       </label>
                       <div className="relative">
                         <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                           <span className="text-slate-500 sm:text-sm font-medium">$</span>
                         </div>
                         <input 
                           type="number" 
                           step="0.01"
                           value={result.totalAmount === 0 ? '' : result.totalAmount} 
                           onChange={(e) => setResult({...result, totalAmount: e.target.value as any})}
                           className="w-full rounded-lg border-slate-300 pl-7 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 sm:text-sm py-2 transition-colors font-medium"
                           placeholder="0.00"
                         />
                       </div>
                     </div>

                     {/* Items Count */}
                     <div className="lg:col-span-1">
                       <label className="flex items-center text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                         <Tag size={14} className="mr-1.5" /> Items
                       </label>
                       <div className="flex items-center h-[38px]">
                         <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-800">
                           {result.items.length} line items
                         </span>
                       </div>
                     </div>
                   </div>
                 </div>

                <Dashboard data={result} />
                
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Line Items Review</h2>
                        <p className="text-sm text-slate-500 mt-1">
                            Verify codes below. Click <span className="text-cyan-600 font-medium">Add to DB</span> to save new products for future scans.
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
        </motion.div>
        </AnimatePresence>
        </div>
      </main>
      </div>

      <AddProductModal 
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        initialItem={productToAdd}
        onSave={handleSaveProduct}
      />
      
      {/* Floating Action Bar for Completion */}
      {status === 'complete' && !isSaved && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
           <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
              <p className="text-sm text-slate-500 hidden sm:block">
                 Found {result?.items.length} items totaling ${(parseFloat(result?.totalAmount as any) || 0).toFixed(2)}
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
