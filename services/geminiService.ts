import { GoogleGenAI, Type } from "@google/genai";
import { getAllProducts } from "./productService";
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

// Stable (GA) model — preview models throw frequent 503 "high demand"
// (UNAVAILABLE) errors because they aren't provisioned for production load.
const MODEL_NAME = "gemini-2.0-flash";

// Retry transient server errors (503 UNAVAILABLE / 429 rate limit) with
// exponential backoff so brief capacity spikes recover instead of failing.
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

const isTransientError = (err: any): boolean => {
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
    
    // Fetch the latest product list (including user-saved ones)
    const currentProductDB = await getAllProducts();

    // Convert DB to a compact CSV-like string for the prompt
    const dbContext = currentProductDB.map(p => 
      `Prod#:${p.productNo}|Desc:${p.description}|Cat:${p.category}|Code:${p.code}`
    ).join('\n');

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
      We have a MASTER PRODUCT DATABASE. You MUST check this database first for every line item.
      
      MASTER PRODUCT DATABASE (Format: Prod#|Desc|Cat|Code):
      ${dbContext}
      
      GENERAL GL CODE RULES (Use only if item is NOT in Master Database):
      ${glCodeContext}
      
      INSTRUCTIONS:
      1. Extract vendor, invoice number, invoice date, total amount.
      2. Extract the **Delivery Address** (Ship To) exactly as it appears.
      3. Extract all line items (description, product number if visible, qty, price).
      4. CRITICAL: For each item's 'totalPrice', you MUST include the base item cost (quantity * unitPrice) PLUS any taxes, CRV, bottle deposits, or fees directly associated with that line item. Do NOT leave taxes as a separate unmapped item. Fold the tax into the product's totalPrice so it reflects the true true landed cost.
      5. For each item:
         - **STEP 1 (EXACT MATCH)**: Does the Product Number or Description match an entry in the Master Product Database? 
           - IF YES: You MUST use the exact 'Code' and 'Cat' (Category) from the database. Set 'isDatabaseMatch' to true.
           - IF NO: Proceed to Step 2.
         - **STEP 2 (INFER)**: Use the General GL Code Rules to assign the code. Set 'isDatabaseMatch' to false.
      6. For inferred items:
         - If 'Ice Cream', 'Frozen', or 'Coffee', use 6318.
         - If ambiguous, use best culinary judgment.
      7. CRITICAL: Always return 'invoiceDate' in YYYY-MM-DD format. If only month/year is found, assume current year or best guess.
      8. Return pure JSON.
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
        return {
          id: `item-${Date.now()}-${index}`,
          productNumber: item.productNumber ? String(item.productNumber) : undefined,
          description: String(item.description || "Unknown Item"),
          quantity: Number(item.quantity) || 1,
          unitPrice: Number(item.unitPrice) || 0,
          totalPrice: Number(item.totalPrice) || 0,
          glCode: String(item.glCode || ""),
          categoryName: String(item.categoryName || ""),
          confidence: Number(item.confidence) || 1,
          isDatabaseMatch: Boolean(item.isDatabaseMatch)
        };
      })
    };

  } catch (error: any) {
    console.error("Error analyzing invoice:", error);
    if (isTransientError(error)) {
      throw new Error("The AI service is busy right now (high demand). Please wait a few seconds and try again.");
    }
    throw error;
  }
};
