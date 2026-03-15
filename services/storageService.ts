import { AnalysisResult, SavedInvoice, TrackerSplits } from '../types';

const STORAGE_KEY = 'chefcode_processed_invoices';

export const getSavedInvoices = (): SavedInvoice[] => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveInvoiceToHistory = (data: AnalysisResult) => {
  const invoices = getSavedInvoices();
  
  let food = 0;
  let expendable = 0;
  let nonExpendable = 0;
  let other = 0;

  const isFoodVendor = (vendor: string) => {
    if (!vendor) return false;
    const v = vendor.toLowerCase();
    return v.includes('sunrise') || v.includes('giuliano') || v.includes('performance') || 
           v.includes('spadra') || v.includes('pepsi') || v.includes('us food') || v.includes('usfood') ||
           v.includes('bon suisse') || v.includes('wismettac') || v.includes('m cafe') || v.includes('mcafe') ||
           v.includes('freshpoint') || v.includes('unistar') || v.includes('southern glazer') || v.includes('reliant') ||
           v.includes('karat') || v.includes('lollicup') || v.includes('cali dumpling') || v.includes('raindrop') ||
           v.includes('coney island') || v.includes('golden waffle') || v.includes('south shore') || v.includes('core mark');
  };

  const isNonFoodVendor = (vendor: string) => {
    if (!vendor) return false;
    const v = vendor.toLowerCase();
    return v.includes('calico') || v.includes('prudential') || v.includes('sharpened') || 
           v.includes('gna brook') || v.includes('whirley') || v.includes('cintas') || 
           v.includes('airgas') || v.includes('eco lab') || v.includes('ecolab') || v.includes('don');
  };

  if (data.items && data.items.length > 0) {
    data.items.forEach(item => {
      const code = item.glCode || '';
      if (code.startsWith('6')) {
        food += item.totalPrice;
      } else if (code === '7326') {
        expendable += item.totalPrice;
      } else if (code === '7327') {
        nonExpendable += item.totalPrice;
      } else {
        // Fallback for unknown GL codes
        if (isFoodVendor(data.vendorName)) {
          food += item.totalPrice;
        } else if (isNonFoodVendor(data.vendorName)) {
          other += item.totalPrice;
        } else {
          other += item.totalPrice;
        }
      }
    });
  }

  // Ensure the splits add up to the totalAmount (covers tax, freight, or empty items)
  const currentSum = food + expendable + nonExpendable + other;
  
  // Parse totalAmount safely in case it comes back as a string or has formatting
  let parsedTotal = typeof data.totalAmount === 'string' 
    ? parseFloat((data.totalAmount as string).replace(/[^0-9.-]+/g, "")) 
    : data.totalAmount;
    
  if (isNaN(parsedTotal)) parsedTotal = 0;

  const diff = parsedTotal - currentSum;
  
  if (Math.abs(diff) > 0.01) {
    if (isFoodVendor(data.vendorName)) {
      food += diff;
    } else if (isNonFoodVendor(data.vendorName)) {
      other += diff;
    } else {
      // For mixed vendors like Sysco or IFS, default difference to food if it's positive, or other
      const v = (data.vendorName || '').toLowerCase();
      if (v.includes('sysco') || v.includes('ifs')) {
        food += diff; // Defaulting tax/freight to food for mixed vendors
      } else {
        other += diff;
      }
    }
  }

  const splits: TrackerSplits = {
    food,
    nonFoodExpendable: expendable,
    nonFoodNonExpendable: nonExpendable,
    nonFoodOther: other
  };

  const existingIndex = invoices.findIndex(inv => 
    inv.invoiceNumber === data.invoiceNumber && 
    inv.vendorName === data.vendorName
  );

  if (existingIndex >= 0) {
    // Overwrite existing invoice
    invoices[existingIndex] = {
      ...invoices[existingIndex],
      invoiceDate: data.invoiceDate,
      totalAmount: data.totalAmount,
      processedAt: new Date().toISOString(),
      splits
    };
  } else {
    // Create new invoice
    const newInvoice: SavedInvoice = {
      id: `${Date.now()}`,
      vendorName: data.vendorName,
      invoiceNumber: data.invoiceNumber,
      invoiceDate: data.invoiceDate,
      totalAmount: data.totalAmount,
      processedAt: new Date().toISOString(),
      splits
    };
    invoices.push(newInvoice);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
};

export const updateInvoiceSplits = (id: string, splits: TrackerSplits) => {
  const invoices = getSavedInvoices();
  const index = invoices.findIndex(inv => inv.id === id);
  if (index !== -1) {
    invoices[index].splits = splits;
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
