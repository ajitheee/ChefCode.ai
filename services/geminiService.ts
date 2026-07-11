import { GoogleGenAI, Type } from "@google/genai";
import { getAllProducts, buildProductIndex, matchProduct } from "./productService";
import { getAllGlCodes } from "./glCodeService";
import { AnalysisResult } from "../types";

// Initialize Gemini Client lazily
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    let apiKey = '';
    
    // Try Vite environment variables first
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY || (import.meta as any).env.VITE_API_KEY || '';
      }
    } catch (e) {
      // Ignore
    }
    
    // Try process.env as fallback (for AI Studio/Node environments or Vite define replacements)
    if (!apiKey) {
      try {
        apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
      } catch (e) {
        // Ignore ReferenceError if process is not defined
      }
    }

    if (!apiKey) {
      throw new Error("API Key is missing. Please add it to your environment variables in Vercel.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

// `gemini-flash-lite-latest` is an alias that always resolves to Google's
// current Flash-Lite model — the cheapest tier that still handles vision +
// structured (JSON) invoice extraction. Using the alias means we don't get
// deprecated out again (gemini-2.0-flash was retired June 2026). Verified to
// match full Flash on product-code matching at a fraction of the token cost.
const MODEL_NAME = "gemini-flash-lite-latest";

// Retry transient server errors (503 UNAVAILABLE / 429 rate limit) with
// exponential backoff so brief capacity spikes recover instead of failing.
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// Quota / billing exhaustion (free-tier limit hit, credits depleted, billing
// off). Retrying does NOT help — the customer must wait or we must fix billing.
const isQuotaExhausted = (err: any): boolean => {
  const msg = String(err?.message || err?.error?.message || '').toLowerCase();
  return msg.includes('quota') || msg.includes('billing') || msg.includes('exhausted') ||
    msg.includes('free_tier') || msg.includes('credits') || msg.includes('depleted') ||
    msg.includes('limit: 0');
};

// Transient server-side blips (overload / brief rate limit) that a short
// backoff can recover from. Quota exhaustion is explicitly NOT transient.
const isTransientError = (err: any): boolean => {
  if (isQuotaExhausted(err)) return false;
  const status = err?.status || err?.code || err?.error?.code;
  const msg = String(err?.message || err?.error?.message || '').toLowerCase();
  return status === 503 || status === 429 ||
    msg.includes('unavailable') || msg.includes('high demand') ||
    msg.includes('overloaded') || msg.includes('rate limit');
};

const generateWithRetry = async (aiClient: GoogleGenAI, request: any, maxAttempts = 4) => {
  let lastErr: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await aiClient.models.generateContent(request);
    } catch (err: any) {
      lastErr = err;
      if (!isTransientError(err) || attempt === maxAttempts - 1) throw err;
      // 1s, 2s, 4s backoff
      await sleep(1000 * Math.pow(2, attempt));
    }
  }
  throw lastErr;
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
    const aiClient = getAiClient();
    
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

    const response = await generateWithRetry(aiClient, {
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType, 
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        // Invoice extraction is structured output, not a reasoning task —
        // disable "thinking" so we don't pay for reasoning tokens (billed at the
        // output rate). Verified: no change in extraction / product-match accuracy.
        thinkingConfig: { thinkingBudget: 0 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            vendorName: { type: Type.STRING },
            invoiceNumber: { type: Type.STRING },
            invoiceDate: { type: Type.STRING },
            deliveryAddress: { type: Type.STRING, description: "The Ship To or Delivery Address found on the invoice" },
            matchedLocation: { type: Type.STRING, description: "Exact name of the registered location the delivery address matches, or empty string if none" },
            totalAmount: { type: Type.NUMBER },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  productNumber: { type: Type.STRING },
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER },
                  glCode: { type: Type.STRING },
                  categoryName: { type: Type.STRING },
                  confidence: { type: Type.NUMBER },
                  isDatabaseMatch: { type: Type.BOOLEAN, description: "True if matched from Master DB, False if inferred" }
                },
                required: ["description", "quantity", "unitPrice", "totalPrice", "glCode", "categoryName"]
              }
            }
          },
          required: ["vendorName", "items", "totalAmount"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse AI response:", text);
      throw new Error("Invalid response format from AI");
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
    if (isQuotaExhausted(error)) {
      throw new Error("Invoice scanning is temporarily unavailable — the AI usage limit has been reached. Please try again later, or contact support if this continues.");
    }
    if (isTransientError(error)) {
      throw new Error("The AI service is busy right now. Please wait a few seconds and try again.");
    }
    throw error;
  }
};
