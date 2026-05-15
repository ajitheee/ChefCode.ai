import { GoogleGenAI, Type } from "@google/genai";
import { GL_CODES } from "../constants";
import { getAllProducts } from "./productService";
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

const MODEL_NAME = "gemini-3-flash-preview";

export const analyzeInvoiceImage = async (base64Data: string, mimeType: string = "image/png"): Promise<AnalysisResult> => {
  try {
    const aiClient = getAiClient();
    
    // Fetch the latest product list (including user-saved ones)
    const currentProductDB = getAllProducts();

    // Convert DB to a compact CSV-like string for the prompt
    const dbContext = currentProductDB.map(p => 
      `Prod#:${p.productNo}|Desc:${p.description}|Cat:${p.category}|Code:${p.code}`
    ).join('\n');

    const glCodeContext = GL_CODES.map(g => `${g.code}: ${g.category} (${g.description || ''})`).join('\n');

    const prompt = `
      You are an expert culinary accountant. Analyze this invoice (Image or PDF).
      
      CRITICAL INSTRUCTION: Check the "Ship To" or "Delivery Address".
      
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

    const response = await aiClient.models.generateContent({
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

    return {
      vendorName: String(data.vendorName || "Unknown Vendor"),
      invoiceNumber: String(data.invoiceNumber || ""),
      invoiceDate: String(data.invoiceDate || ""),
      deliveryAddress: String(data.deliveryAddress || ""),
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

  } catch (error) {
    console.error("Error analyzing invoice:", error);
    throw error;
  }
};
