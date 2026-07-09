// services/storageService.ts
// DROP-IN REPLACEMENT: localStorage → Supabase PostgreSQL
// All business logic (splits, vendor matching) preserved from original

import { supabase } from './supabaseClient';
import { AnalysisResult, SavedInvoice, TrackerSplits, CustomVendor } from '../types';

// ─── Helper: compute splits from items (preserved from original) ────
function computeSplits(data: AnalysisResult): TrackerSplits {
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
      const price = parseFloat(item.totalPrice as any) || 0;
      if (code.startsWith('6')) {
        food += price;
      } else if (code === '7326') {
        expendable += price;
      } else if (code === '7327') {
        nonExpendable += price;
      } else {
        if (isFoodVendor(data.vendorName)) {
          food += price;
        } else if (isNonFoodVendor(data.vendorName)) {
          other += price;
        } else {
          other += price;
        }
      }
    });
  }

  const currentSum = food + expendable + nonExpendable + other;
  let parsedTotal = typeof data.totalAmount === 'string'
    ? parseFloat((data.totalAmount as string).replace(/[^0-9.-]+/g, ""))
    : Number(data.totalAmount);
  if (isNaN(parsedTotal) || parsedTotal === 0) parsedTotal = currentSum;

  const diff = parsedTotal - currentSum;
  if (Math.abs(diff) > 0.01) {
    if (isFoodVendor(data.vendorName)) {
      food += diff;
    } else if (isNonFoodVendor(data.vendorName)) {
      other += diff;
    } else {
      const v = (data.vendorName || '').toLowerCase();
      if (v.includes('sysco') || v.includes('ifs')) {
        food += diff;
      } else {
        other += diff;
      }
    }
  }

  return { food, nonFoodExpendable: expendable, nonFoodNonExpendable: nonExpendable, nonFoodOther: other };
}

// ─── Get user's org_id ──────────────────────────────────────────────
async function getMyOrgId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single();

  return profile?.org_id || null;
}

// ─── Save invoice + items to Supabase ───────────────────────────────
// locationId (optional): the active location's UUID — required for RLS
// to allow inserts under the new per-user-per-location access model
export const saveInvoiceToHistory = async (data: AnalysisResult, locationId?: string | null) => {
  const orgId = await getMyOrgId();
  if (!orgId) throw new Error('No organization found. Please log in again.');

  const splits = computeSplits(data);

  // Check for existing invoice (update if duplicate) — scoped to THIS location,
  // so the same invoice number at a different location doesn't overwrite.
  const existing = await checkForDuplicate(data, locationId);

  if (existing) {
    // Update existing invoice
    const { error } = await supabase
      .from('invoices')
      .update({
        invoice_date: data.invoiceDate || null,
        total_amount: data.totalAmount,
        location: data.location || 'Centerpointe',
        location_id: locationId || null,
        splits,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);
    if (error) throw error;

    // Delete old items and re-insert
    await supabase.from('invoice_items').delete().eq('invoice_id', existing.id);
    if (data.items.length > 0) {
      const items = data.items.map(item => ({
        invoice_id: existing.id,
        org_id: orgId,
        description: item.description,
        product_number: item.productNumber || '',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        gl_code: item.glCode,
        category_name: item.categoryName,
        ai_confidence: item.confidence,
        is_database_match: item.isDatabaseMatch || false,
        price_spike: item.priceSpike || false,
        historical_price: item.historicalPrice || null,
      }));
      const { error: itemsErr } = await supabase.from('invoice_items').insert(items);
      if (itemsErr) throw itemsErr;
    }
  } else {
    // Insert new invoice
    const { data: invoice, error: invError } = await supabase
      .from('invoices')
      .insert({
        org_id: orgId,
        location_id: locationId || null,
        vendor_name: data.vendorName,
        invoice_number: data.invoiceNumber,
        invoice_date: data.invoiceDate || null,
        total_amount: data.totalAmount,
        delivery_address: data.deliveryAddress || null,
        location: data.location || 'Centerpointe',
        splits,
        status: 'review',
      })
      .select()
      .single();
    if (invError) throw invError;

    // Insert line items
    if (data.items.length > 0) {
      const items = data.items.map(item => ({
        invoice_id: invoice.id,
        org_id: orgId,
        description: item.description,
        product_number: item.productNumber || '',
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        gl_code: item.glCode,
        category_name: item.categoryName,
        ai_confidence: item.confidence,
        is_database_match: item.isDatabaseMatch || false,
        price_spike: item.priceSpike || false,
        historical_price: item.historicalPrice || null,
      }));
      const { error: itemsErr } = await supabase.from('invoice_items').insert(items);
      if (itemsErr) throw itemsErr;
    }
  }
};

// ─── Get all saved invoices ─────────────────────────────────────────
export const getSavedInvoices = async (): Promise<SavedInvoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invoices:', error.message);
    return [];
  }

  return (data || []).map(inv => ({
    id: inv.id,
    vendorName: inv.vendor_name || '',
    invoiceNumber: inv.invoice_number || '',
    invoiceDate: inv.invoice_date || '',
    totalAmount: inv.total_amount || 0,
    processedAt: inv.created_at,
    splits: inv.splits || undefined,
    location: inv.location || 'Centerpointe',
    locationId: inv.location_id || null,
    items: (inv.invoice_items || []).map((item: any) => ({
      id: item.id,
      productNumber: item.product_number,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      totalPrice: item.total_price,
      glCode: item.gl_code,
      categoryName: item.category_name,
      confidence: item.ai_confidence || 0,
      isDatabaseMatch: item.is_database_match || false,
      priceSpike: item.price_spike || false,
      historicalPrice: item.historical_price || null,
    })),
  }));
};

// ─── Check for duplicate invoice ────────────────────────────────────
export const checkForDuplicate = async (data: AnalysisResult, locationId?: string | null): Promise<SavedInvoice | undefined> => {
  if (!data.invoiceNumber || !data.vendorName) return undefined;

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('invoice_number', data.invoiceNumber)
    .ilike('vendor_name', `%${data.vendorName.replace(/[%_]/g, '')}%`);

  // A vendor can legitimately reuse an invoice number at a different location
  // (or per year), so only treat it as the SAME invoice within the same
  // location. Match null-to-null for legacy rows with no location.
  query = locationId ? query.eq('location_id', locationId) : query.is('location_id', null);

  const { data: matches } = await query.limit(1);
  if (!matches || matches.length === 0) return undefined;

  const inv = matches[0];
  return {
    id: inv.id,
    vendorName: inv.vendor_name || '',
    invoiceNumber: inv.invoice_number || '',
    invoiceDate: inv.invoice_date || '',
    totalAmount: inv.total_amount || 0,
    processedAt: inv.created_at,
    splits: inv.splits || undefined,
    location: inv.location || 'Centerpointe',
    locationId: inv.location_id || null,
  };
};

// ─── Update invoice splits ──────────────────────────────────────────
export const updateInvoiceSplits = async (id: string, splits: TrackerSplits) => {
  const { error } = await supabase
    .from('invoices')
    .update({ splits })
    .eq('id', id);
  if (error) throw error;
};

// ─── Get custom vendors ─────────────────────────────────────────────
export const getCustomVendors = async (): Promise<CustomVendor[]> => {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('is_active', true)
    .order('canonical_name');

  if (error) {
    console.error('Error fetching vendors:', error.message);
    return [];
  }

  return (data || []).map(v => ({
    id: v.id,
    name: v.canonical_name,
    type: v.type === 'non_food' ? 'nonFood' as const : 'food' as const,
  }));
};

// ─── Add custom vendor ──────────────────────────────────────────────
export const addCustomVendor = async (vendor: Omit<CustomVendor, 'id'>): Promise<CustomVendor> => {
  const orgId = await getMyOrgId();
  if (!orgId) throw new Error('No organization found.');

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      org_id: orgId,
      canonical_name: vendor.name,
      type: vendor.type === 'nonFood' ? 'non_food' : 'food',
      aliases: [vendor.name.toLowerCase()],
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.canonical_name,
    type: vendor.type,
  };
};
