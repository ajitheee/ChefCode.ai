import OpenAI from "openai";
import { getAllProducts, buildProductIndex, matchProduct } from "./productService";
import { getAllGlCodes } from "./glCodeService";
import { AnalysisResult } from "../types";

// OpenAI client, created lazily.
// NOTE: this runs in the BROWSER, so the key ships inside the public bundle.
// It must carry a domain/referrer restriction and a spend cap on the OpenAI
// side — exactly the same precaution the Gemini key needed.
let client: OpenAI | null = null;

const getAiClient = () => {
  if (!client) {
    let apiKey = '';

    // Vite environment variables first (how the browser build gets it)
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
        apiKey = (import.meta as any).env.VITE_OPENAI_API_KEY || (import.meta as any).env.VITE_API_KEY || '';
      }
    } catch (e) {
      // Ignore
    }

    // process.env fallback (Node / test environments)
    if (!apiKey) {
      try {
        apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY || '';
      } catch (e) {
        // Ignore ReferenceError if process is not defined
      }
    }

    if (!apiKey) {
      throw new Error("API Key is missing. Please add VITE_OPENAI_API_KEY to your environment variables in Vercel.");
    }
    client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
  }
  return client;
};

// gpt-4.1-mini: vision + strict structured output at a fraction of gpt-4o's
// price. Chosen deliberately over gpt-4o — invoice extraction is a read-and-
// transcribe task, not a reasoning task, so the expensive tier buys nothing
// here and would multiply the per-invoice cost many times over.
const MODEL_NAME = "gpt-4.1-mini";

// Retry transient server errors with exponential backoff so brief capacity
// spikes recover instead of failing the scan.
const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

// Quota / billing exhaustion (spend cap hit, credits depleted, billing off).
// Retrying does NOT help — the customer must wait or we must fix billing.
const isQuotaExhausted = (err: any): boolean => {
  const code = String(err?.code || err?.error?.code || '').toLowerCase();
  const msg = String(err?.message || err?.error?.message || '').toLowerCase();
  return code.includes('insufficient_quota') ||
    msg.includes('insufficient_quota') || msg.includes('exceeded your current quota') ||
    msg.includes('quota') || msg.includes('billing') ||
    msg.includes('credits') || msg.includes('depleted');
};

// Transient server-side blips that a short backoff can recover from.
// Quota exhaustion is explicitly NOT transient.
const isTransientError = (err: any): boolean => {
  if (isQuotaExhausted(err)) return false;
  const status = Number(err?.status || err?.error?.status || 0);
  const msg = String(err?.message || err?.error?.message || '').toLowerCase();
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504 ||
    msg.includes('rate limit') || msg.includes('overloaded') ||
    msg.includes('timeout') || msg.includes('temporarily unavailable');
};

const createWithRetry = async (aiClient: OpenAI, request: any, maxAttempts = 4) => {
  let lastErr: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await aiClient.chat.completions.create(request);
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

// Strict JSON Schema for the extraction. OpenAI's strict mode requires EVERY
// property to appear in `required` and additionalProperties:false on each
// object, so genuinely-optional fields are typed nullable rather than omitted.
const INVOICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    vendorName: { type: "string" },
    invoiceNumber: { type: "string" },
    invoiceDate: { type: "string", description: "YYYY-MM-DD" },
    deliveryAddress: { type: "string", description: "The Ship To or Delivery Address found on the invoice" },
    matchedLocation: { type: "string", description: "Exact name of the registered location the delivery address matches, or empty string if none" },
    totalAmount: { type: "number" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          productNumber: { type: ["string", "null"] },
          description: { type: "string" },
          quantity: { type: "number" },
          unitPrice: { type: "number" },
          totalPrice: { type: "number" },
          glCode: { type: "string" },
          categoryName: { type: "string" },
          confidence: { type: "number" },
          isDatabaseMatch: { type: "boolean" }
        },
        required: ["productNumber", "description", "quantity", "unitPrice", "totalPrice", "glCode", "categoryName", "confidence", "isDatabaseMatch"]
      }
    }
  },
  required: ["vendorName", "invoiceNumber", "invoiceDate", "deliveryAddress", "matchedLocation", "totalAmount", "items"]
};

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
      3. Extract every line item: description, product number (copy it EXACTLY as printed — digits/letters — whenever it is visible, otherwise null), quantity, unit price.
      4. CRITICAL: For each item's 'totalPrice', include the base item cost (quantity * unitPrice) PLUS any taxes, CRV, bottle deposits, or fees for that line. Do NOT leave taxes as a separate unmapped item — fold them into that product's totalPrice so it reflects the true landed cost.
      5. Assign each item the best 'glCode' and 'categoryName' from the GL CODE RULES above (best culinary judgment). If 'Ice Cream', 'Frozen', or 'Coffee', use 6318.
      6. Set 'isDatabaseMatch' to false for every item — catalog matching is applied automatically in code after extraction, so you do not need to match anything yourself.
      7. 'productNumber' is important: capture it precisely — it is the key used to match items to our catalog.
      8. Set 'confidence' between 0 and 1 for how sure you are of each line.
      9. CRITICAL: Always return 'invoiceDate' in YYYY-MM-DD format. If only month/year is found, assume current year or best guess.
    `;

    // PDFs and images take DIFFERENT content parts on the OpenAI API — an
    // image_url part rejects a PDF outright, which would silently break the
    // multi-page invoice uploads the app already supports.
    const isPdf = (mimeType || '').toLowerCase().includes('pdf');
    const documentPart = isPdf
      ? { type: "file", file: { filename: "invoice.pdf", file_data: `data:${mimeType};base64,${base64Data}` } }
      : { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Data}` } };

    const response: any = await createWithRetry(aiClient, {
      model: MODEL_NAME,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            documentPart
          ]
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "invoice_extraction",
          strict: true,
          schema: INVOICE_SCHEMA
        }
      }
    });

    const text = response?.choices?.[0]?.message?.content;
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
