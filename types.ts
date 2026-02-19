export interface GLCode {
  code: string;
  category: string;
  description?: string;
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
}

export interface AnalysisResult {
  vendorName: string;
  invoiceDate: string;
  invoiceNumber: string;
  deliveryAddress?: string; // New field for address verification
  items: InvoiceItem[];
  totalAmount: number;
}

export interface SavedInvoice {
  id: string;
  vendorName: string;
  invoiceNumber: string;
  invoiceDate: string;
  totalAmount: number;
  processedAt: string;
}

export type ProcessingStatus = 'idle' | 'uploading' | 'analyzing' | 'complete' | 'error';
