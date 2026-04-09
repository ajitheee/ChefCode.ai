import { SavedInvoice, InvoiceItem } from './types';

export const exportInvoiceToCSV = (invoice: SavedInvoice) => {
  if (!invoice.items || invoice.items.length === 0) {
    alert("No items to export.");
    return;
  }

  const headers = ['Invoice Number', 'Vendor', 'Date', 'Location', 'Product #', 'Description', 'Quantity', 'Unit Price', 'Total Price', 'GL Code', 'Category'];
  
  const rows = invoice.items.map(item => [
    invoice.invoiceNumber,
    invoice.vendorName,
    invoice.invoiceDate,
    invoice.location || 'Centerpointe',
    item.productNumber || '',
    `"${item.description.replace(/"/g, '""')}"`, // Escape quotes
    item.quantity,
    item.unitPrice,
    item.totalPrice,
    item.glCode,
    item.categoryName
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadCSV(csvContent, `Invoice_${invoice.vendorName}_${invoice.invoiceNumber}.csv`);
};

export const exportAllToCSV = (invoices: SavedInvoice[]) => {
  if (invoices.length === 0) {
    alert("No data to export.");
    return;
  }

  const headers = ['Invoice Number', 'Vendor', 'Date', 'Location', 'Total Amount', 'Food', 'Non-Food Expendable', 'Non-Food Non-Expendable', 'Other'];
  
  const rows = invoices.map(inv => [
    inv.invoiceNumber,
    inv.vendorName,
    inv.invoiceDate,
    inv.location || 'Centerpointe',
    inv.totalAmount,
    inv.splits?.food || 0,
    inv.splits?.nonFoodExpendable || 0,
    inv.splits?.nonFoodNonExpendable || 0,
    inv.splits?.nonFoodOther || 0
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadCSV(csvContent, `All_Invoices_Summary.csv`);
};

const downloadCSV = (csvContent: string, fileName: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
