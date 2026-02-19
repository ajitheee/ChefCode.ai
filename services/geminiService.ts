import { GoogleGenAI, Type } from "@google/genai";
import { GL_CODES, MASTER_PRODUCT_DB } from "../constants";
import { AnalysisResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-3-flash-preview";

export const analyzeInvoiceImage = async (base64Data: string, mimeType: string = "image/png"): Promise<AnalysisResult> => {
  try {
    // Convert DB to a compact CSV-like string for the prompt
    const dbContext = MASTER_PRODUCT_DB.map(p => 
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
      4. For each item:
         - **STEP 1 (EXACT MATCH)**: Does the Product Number or Description match an entry in the Master Product Database? 
           - IF YES: You MUST use the exact 'Code' and 'Cat' (Category) from the database. Set 'isDatabaseMatch' to true.
           - IF NO: Proceed to Step 2.
         - **STEP 2 (INFER)**: Use the General GL Code Rules to assign the code. Set 'isDatabaseMatch' to false.
      5. For inferred items:
         - If 'Ice Cream', 'Frozen', or 'Coffee', use 6318.
         - If ambiguous, use best culinary judgment.
      6. Return pure JSON.
    `;

    const response = await ai.models.generateContent({
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

    const data = JSON.parse(text);

    return {
      ...data,
      items: data.items.map((item: any, index: number) => ({
        ...item,
        id: `item-${Date.now()}-${index}`,
        quantity: item.quantity || 1,
        totalPrice: item.totalPrice || 0,
        unitPrice: item.unitPrice || 0,
        isDatabaseMatch: item.isDatabaseMatch || false
      }))
    };

  } catch (error) {
    console.error("Error analyzing invoice:", error);
    throw error;
  }
};
