import { AnalysisResult, SavedInvoice } from '../types';

const STORAGE_KEY = 'chefcode_processed_invoices';

export const getSavedInvoices = (): SavedInvoice[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveInvoiceToHistory = (data: AnalysisResult) => {
  const invoices = getSavedInvoices();
  
  // Sanity check to avoid exact duplicates in storage
  const alreadyExists = invoices.some(inv => 
    inv.invoiceNumber === data.invoiceNumber && 
    inv.vendorName === data.vendorName
  );

  if (!alreadyExists) {
    const newInvoice: SavedInvoice = {
      id: `${Date.now()}`,
      vendorName: data.vendorName,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      totalAmount: data.totalAmount,
      processedAt: new Date().toISOString(),
    };
    invoices.push(newInvoice);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  }
};

export const checkForDuplicate = (data: AnalysisResult): SavedInvoice | undefined => {
  const invoices = getSavedInvoices();
  
  // We normalize strings for comparison (remove spaces, lowercase)
  const normalize = (str: string) => str ? str.toLowerCase().trim() : '';
  
  return invoices.find(inv => {
    // Check if invoice number matches strongly
    const numMatch = normalize(inv.invoiceNumber) === normalize(data.invoiceNumber);
    
    // Check if vendor matches loosely (e.g. "Sysco" vs "Sysco Inc")
    const vendorMatch = normalize(inv.vendorName).includes(normalize(data.vendorName)) || 
                        normalize(data.vendorName).includes(normalize(inv.vendorName));
                        
    return numMatch && vendorMatch;
  });
};
