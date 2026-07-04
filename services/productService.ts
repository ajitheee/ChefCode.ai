import { Product } from '../types';
import { MASTER_PRODUCT_DB } from '../constants';
import { supabase } from './supabaseClient';

// Products (the product → GL-code "brain") now live in Supabase, scoped per
// tenant by RLS. The products table returns the org's own rows plus the global
// seed rows (org_id IS NULL). MASTER_PRODUCT_DB is kept only as an emergency
// fallback if the DB read fails, so AI accuracy never collapses to zero.

const rowToProduct = (r: any): Product => ({
  productNo: r.product_number || '',
  description: r.description || '',
  category: r.category || '',
  code: r.gl_code || '',
});

// Look up the signed-in user's org_id (required by the products RLS insert policy).
const getMyOrgId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from('profiles').select('org_id').eq('id', user.id).single();
  return (data as any)?.org_id ?? null;
};

export const getAllProducts = async (): Promise<Product[]> => {
  const { data, error } = await supabase
    .from('products')
    .select('product_number, description, category, gl_code')
    .eq('is_active', true);

  if (error || !data) {
    console.warn('Product DB fetch failed — falling back to built-in master list.', error);
    return [...MASTER_PRODUCT_DB];
  }
  return data.map(rowToProduct);
};

// Add a single product (from the "Add Product" modal). Skips if an equivalent
// product already exists for this org.
export const saveNewProduct = async (product: Product): Promise<void> => {
  const orgId = await getMyOrgId();
  if (!orgId) {
    console.warn('No organization for current user — product not saved.');
    return;
  }

  // Duplicate check: by product number when present, otherwise by description.
  let dupeQuery = supabase.from('products').select('id').eq('org_id', orgId).limit(1);
  dupeQuery = product.productNo
    ? dupeQuery.eq('product_number', product.productNo)
    : dupeQuery.eq('description', product.description);
  const { data: existing } = await dupeQuery;
  if (existing && existing.length > 0) return;

  const { error } = await supabase.from('products').insert({
    org_id: orgId,
    product_number: product.productNo || null,
    description: product.description,
    category: product.category || null,
    gl_code: product.code || null,
  });
  if (error) console.error('Failed to save product:', error);
};

// Bulk import from Excel/CSV. Inserts only products not already present for the
// org; returns how many were newly added.
export const importProductsFromExcel = async (products: Product[]): Promise<number> => {
  const orgId = await getMyOrgId();
  if (!orgId) throw new Error('No organization found for the current user.');

  const { data: existing } = await supabase
    .from('products')
    .select('product_number, description')
    .eq('org_id', orgId);

  const seen = new Set(
    (existing || []).map((r: any) => (r.product_number || r.description || '').toLowerCase())
  );

  const toInsert = products
    .filter(p => {
      const key = (p.productNo || p.description || '').toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(p => ({
      org_id: orgId,
      product_number: p.productNo || null,
      description: p.description,
      category: p.category || null,
      gl_code: p.code || null,
    }));

  if (toInsert.length === 0) return 0;

  const { error } = await supabase.from('products').insert(toInsert);
  if (error) {
    console.error('Product import failed:', error);
    throw new Error(error.message);
  }
  return toInsert.length;
};
