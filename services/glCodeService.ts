import { GLCode } from '../types';
import { GL_CODES } from '../constants';
import { supabase } from './supabaseClient';

// GL codes (the chart of accounts) now come from Supabase, scoped per tenant by
// RLS. GL_CODES from constants is kept only as a fallback if the DB read fails
// or the org has none yet, so the AI extractor always has a code list to work with.
export const getAllGlCodes = async (): Promise<GLCode[]> => {
  const { data, error } = await supabase
    .from('gl_codes')
    .select('code, category, description')
    .eq('is_active', true)
    .order('code');

  if (error || !data || data.length === 0) {
    if (error) console.warn('GL code fetch failed — falling back to built-in list.', error);
    return [...GL_CODES];
  }
  return data.map((r: any) => ({
    code: r.code,
    category: r.category,
    description: r.description || '',
  }));
};
