import { supabase } from './supabaseClient';
import { getAllProducts, buildProductIndex, matchProduct } from "./productService";
import { getAllGlCodes } from "./glCodeService";
import { AnalysisResult } from "../types";
import { prepareForUpload } from './imagePrep';
import { ExtractionError } from './aiErrors';

// Invoice reading runs on ChefCode's server (api/extract-invoice.ts), which is
// the only place the Gemini API key exists. It used to be called from here,
// with the key compiled into the website's JavaScript where anyone could copy
// it; Google suspended the project on 2026-10-04 after the key was misused.
// The model, its settings and the response schema now live on the server too,
// so a browser can't change them.

/** Sends the invoice to ChefCode's server and returns the model's JSON text. */
const requestExtraction = async (base64Data: string, mimeType: string, prompt: string): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new ExtractionError('UNAUTHENTICATED');

  const file = await prepareForUpload(base64Data, mimeType);

  let res: Response;
  try {
    res = await fetch('/api/extract-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ file, prompt }),
    });
  } catch {
    throw new ExtractionError('NETWORK');
  }

  if (!res.ok) {
    // Vercel answers these two itself, before our code runs, and not in JSON.
    if (res.status === 413) throw new ExtractionError('TOO_LARGE');
    if (res.status === 504) throw new ExtractionError('SERVER_TIMEOUT');
    const reason = await res.json().then((j) => j?.error?.reason).catch(() => undefined);
    throw new ExtractionError(reason || 'AI_ERROR');
  }

  const { text } = await res.json();
  return String(text || '');
};

// Org locations passed in so the AI can match the invoice's Ship To address
// against the tenant's own registered locations (multi-tenant safe — callers
// only pass the locations the current user can access).
export interface LocationContext {
  name: string;
  address?: string | null;
  keywords?: string[] | null;
}

export const analyzeInvoiceImage = async (
  base64Data: string,
  mimeType: string = "image/png",
  locations: LocationContext[] = []
): Promise<AnalysisResult> => {
  try {
    // Option C: products are matched IN CODE after extraction (see the item
    // mapping below), not sent in the prompt — so token cost stays flat no
    // matter how big the catalog grows, and product-number matches are exact.
    const currentProductDB = await getAllProducts();
    const productIndex = buildProductIndex(currentProductDB);

    const glCodes = await getAllGlCodes();
    const glCodeContext = glCodes.map(g => `${g.code}: ${g.category} (${g.description || ''})`).join('\n');

    const locationContext = locations
      .map(l => {
        const extras = [l.address, ...(l.keywords || [])].filter(Boolean).join(' | ');
        return `Name:${l.name}${extras ? ` | Address:${extras}` : ''}`;
      })
      .join('\n');

    const prompt = `
      You are an expert culinary accountant. Analyze this invoice (Image or PDF).

      CRITICAL INSTRUCTION: Check the "Ship To" or "Delivery Address".
      ${locationContext ? `
      REGISTERED LOCATIONS (Format: Name | Address):
      ${locationContext}

      Compare the invoice's Ship To / Delivery Address against the REGISTERED LOCATIONS above.
      Match on street number, street name, city, or ZIP code — tolerate abbreviations
      (e.g. "W Temple Ave" matches "West Temple Avenue"). If exactly one location matches,
      return its Name EXACTLY as written above in 'matchedLocation'. If none match or you
      are unsure, return an empty string for 'matchedLocation'. Never guess.
      ` : ''}
      GL CODE RULES (assign the best-fit code + category for every line item):
      ${glCodeContext}

      INSTRUCTIONS:
      1. Extract vendor, invoice number, invoice date, total amount.
      2. Extract the **Delivery Address** (Ship To) exactly as it appears.
      3. Extract every line item: description, product number (copy it EXACTLY as printed — digits/letters — whenever it is visible), quantity, unit price.
      4. CRITICAL: For each item's 'totalPrice', include the base item cost (quantity * unitPrice) PLUS any taxes, CRV, bottle deposits, or fees for that line. Do NOT leave taxes as a separate unmapped item — fold them into that product's totalPrice so it reflects the true landed cost.
      5. Assign each item the best 'glCode' and 'categoryName' from the GL CODE RULES above (best culinary judgment). If 'Ice Cream', 'Frozen', or 'Coffee', use 6318.
      6. Set 'isDatabaseMatch' to false for every item — catalog matching is applied automatically in code after extraction, so you do not need to match anything yourself.
      7. 'productNumber' is important: capture it precisely — it is the key used to match items to our catalog.
      8. CRITICAL: Always return 'invoiceDate' in YYYY-MM-DD format. If only month/year is found, assume current year or best guess.
      9. Return pure JSON.
    `;

    const text = await requestExtraction(base64Data, mimeType, prompt);
    if (!text) throw new ExtractionError('AI_ERROR');

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      throw new ExtractionError('AI_ERROR');
    }

    const items = Array.isArray(data.items) ? data.items : [];

    // Only accept a matchedLocation that exists in the provided list (the AI
    // could hallucinate a name); normalize to the canonical casing.
    const rawMatch = String(data.matchedLocation || "").trim().toLowerCase();
    const matchedLocation = rawMatch
      ? locations.find(l => l.name.toLowerCase() === rawMatch)?.name || ""
      : "";

    return {
      vendorName: String(data.vendorName || "Unknown Vendor"),
      invoiceNumber: String(data.invoiceNumber || ""),
      invoiceDate: String(data.invoiceDate || ""),
      deliveryAddress: String(data.deliveryAddress || ""),
      matchedLocation,
      totalAmount: Number(data.totalAmount) || 0,
      items: items.map((rawItem: any, index: number) => {
        const item = rawItem || {};
        const productNumber = item.productNumber ? String(item.productNumber) : undefined;
        const description = String(item.description || "Unknown Item");
        const aiCode = String(item.glCode || "");
        const aiCategory = String(item.categoryName || "");
        // Option C: match to the catalog in code. On a hit, use the catalog's
        // code/category and mark it a DB match; on a miss, keep the AI's
        // inferred code (so we never do worse than the AI's best guess).
        const match = matchProduct(productNumber, description, productIndex);
        return {
          id: `item-${Date.now()}-${index}`,
          productNumber,
          description,
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalPrice) || 0,
          glCode: match ? match.code : aiCode,
          categoryName: match ? (match.category || aiCategory) : aiCategory,
          confidence: Number(item.confidence) || 1,
          isDatabaseMatch: !!match
        };
      })
    };

  } catch (error: any) {
    console.error("Error analyzing invoice:", error);
    // Every failure reaches the person as a plain sentence. ExtractionError
    // already carries one; anything unexpected gets the general message, with
    // the detail kept in the console above for debugging.
    if (error instanceof ExtractionError) throw error;
    throw new ExtractionError('AI_ERROR');
  }
};
