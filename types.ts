export interface GLCode {
  code: string;
  category: string;
  description?: string;
}

export interface Product {
  productNo: string;
  description: string;
  category: string;
  code: string;
}

export interface TrackerSplits {
  food: number;
  nonFoodExpendable: number;
  nonFoodNonExpendable: number;
  nonFoodOther: number;
}

export interface InvoiceItem {
  id: string;
  productNumber?: string; // Added to track product #
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  glCode: string;
  categoryName: string;
  confidence: number; // 0-1 score from AI
  isDatabaseMatch?: boolean; // New flag for UI
  historicalPrice?: number; // For price spike alerts
  historicalDate?: string; // For price spike alerts
  priceSpike?: boolean; // For price spike alerts
}

export interface AnalysisResult {
  vendorName: string;
  invoiceDate: string;
  invoiceNumber: string;
  deliveryAddress?: string; // New field for address verification
  items: InvoiceItem[];
  totalAmount: number;
  location?: string; // Multi-location support
}

export interface SavedInvoice {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  processedAt: string;
  splits?: TrackerSplits;
  items?: InvoiceItem[]; // Save items for historical price tracking
  location?: string; // Multi-location support
}

export interface CustomVendor {
  id: string;
  name: string;
  type: 'food' | 'nonFood';
}

export type ProcessingStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';

export type UserRole = 'admin' | 'chef' | null;