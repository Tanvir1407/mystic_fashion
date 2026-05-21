import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are an expert order parser for a Bangladeshi jersey/sportswear e-commerce store called "Mystic Fashion". 

Your job is to parse raw WhatsApp order messages and extract structured order data.

RULES:
1. Each order is typically separated by "Order Confirmed" markers or clear customer info boundaries
2. Extract ALL orders from the text, even if formatting varies
3. Handle both English and Bangla (বাংলা) text
4. Phone numbers are Bangladeshi format (01XXXXXXXXX)
5. Prices are in BDT (Taka - ৳/tk/taka)
6. Common jersey sizes: S, M, L, XL, XXL, 2XL, 3XL, or numeric (38, 40, 42, etc.)
7. DTF/Print customization = name and number printed on jersey
8. "Badge" = additional patch/badge on jersey (usually costs extra)
9. "Fan edition/Fan edison" = cheaper fan version of jersey
10. If delivery method mentioned (pathao, non-pathao, self-pickup), extract it
11. Parse bill breakdowns carefully - identify product cost, delivery cost, print cost, badge cost
12. "Advance" / "Advanced" = advance payment already made
13. "Payable" / "Total Payable" = amount customer needs to pay on delivery (COD)
14. If a customer orders multiple pieces of the same item, capture quantity correctly
15. If multiple different teams/jerseys are in one order, create separate items for each
16. Keep the customer's quoted/chat price as the final sell price in unitPrice, even if it differs from the catalog or system price
17. Normalize teamName to a clean canonical product name for matching, but do not inflate the price above the chat value
18. If the message includes a higher catalog/system price and a lower final chat price, preserve the lower final price in unitPrice and mention the difference in remarks when useful
19. If the jersey edition is not explicitly mentioned, do not default to fan edition; use the quoted/chat price to infer the most likely edition
20. When a base team name is generic (for example, "Argentina away kit") and the quoted price is closer to player edition pricing than fan edition pricing, normalize teamName as the player edition variant for matching
21. If the quoted price is much closer to fan pricing, only then use fan edition; otherwise prefer player edition when the message is ambiguous

For each order, extract:
- customerName: Full name of the customer
- phone: Phone number (normalize to 01XXXXXXXXX format)
- address: Full delivery address
- items: Array of items, each with:
  - teamName: Team/jersey name (e.g., "Brazil Home Kit", "Argentina Away")
  - size: Size (e.g., "XL", "M", "42")
  - quantity: Number of pieces (default 1)
  - unitPrice: Price per piece in BDT (number only)
  - hasPrint: Whether DTF/name printing is needed (boolean)
  - printName: Name to print (if applicable)
  - printNumber: Number to print (if applicable)
  - hasBadge: Whether badge is needed (boolean)
- deliveryCharge: Delivery charge in BDT (number, 0 if not specified or self-pickup)
- printCost: Total printing/DTF cost (number, 0 if none)
- badgeCost: Total badge cost (number, 0 if none)  
- totalBill: Total bill amount before advance (number)
- advance: Advance amount paid (number, 0 if none)
- totalPayable: Amount to collect on delivery (number)
- deliveryType: "pathao" | "non-pathao" | "self-pickup" | "unknown"
- remarks: Any additional notes or special instructions

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, no explanation. Just the raw JSON array.
If you cannot parse any orders, return an empty array [].
Ensure all numeric values are numbers (not strings).
If a value is unclear or missing, use reasonable defaults (0 for numbers, "" for strings, false for booleans).`;

export async function POST(request: NextRequest) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_api_key_here") {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Please add it to your .env file." },
      { status: 500 }
    );
  }

  try {
    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No text provided to parse." },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${SYSTEM_PROMPT}\n\n--- RAW ORDER MESSAGES ---\n${text}\n--- END ---\n\nParse ALL orders from the above text and return a JSON array.`,
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        maxOutputTokens: 16384,
      },
    });

    const responseText = response?.text || "";

    // Clean the response - remove markdown code blocks if present
    let cleanedText = responseText.trim();
    if (cleanedText.startsWith("```json")) {
      cleanedText = cleanedText.slice(7);
    } else if (cleanedText.startsWith("```")) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith("```")) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    let parsedOrders;
    try {
      parsedOrders = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse Gemini response as JSON:", cleanedText);
      return NextResponse.json(
        { error: "AI returned invalid JSON. Please try again.", raw: cleanedText },
        { status: 422 }
      );
    }

    if (!Array.isArray(parsedOrders)) {
      parsedOrders = [parsedOrders];
    }

    // Validate and normalize each order
    const normalizedOrders = parsedOrders.map((order: any, index: number) => ({
      id: `ai-order-${Date.now()}-${index}`,
      customerName: String(order.customerName || "").trim(),
      phone: String(order.phone || "").trim().replace(/[\s-]/g, ""),
      address: String(order.address || "").trim(),
      items: Array.isArray(order.items)
        ? order.items.map((item: any, itemIdx: number) => ({
          id: `ai-item-${Date.now()}-${index}-${itemIdx}`,
          teamName: String(item.teamName || "").trim(),
          size: String(item.size || "M").trim().toUpperCase(),
          quantity: Math.max(1, parseInt(item.quantity) || 1),
          unitPrice: Math.max(0, parseFloat(item.unitPrice) || 0),
          hasPrint: Boolean(item.hasPrint),
          printName: String(item.printName || "").trim(),
          printNumber: String(item.printNumber || "").trim(),
          hasBadge: Boolean(item.hasBadge),
          selectedProductId: "",
          selectedVariantSize: "",
        }))
        : [],
      deliveryCharge: Math.max(0, parseFloat(order.deliveryCharge) || 0),
      printCost: Math.max(0, parseFloat(order.printCost) || 0),
      badgeCost: Math.max(0, parseFloat(order.badgeCost) || 0),
      totalBill: Math.max(0, parseFloat(order.totalBill) || 0),
      advance: Math.max(0, parseFloat(order.advance) || 0),
      totalPayable: Math.max(0, parseFloat(order.totalPayable) || 0),
      deliveryType: ["pathao", "non-pathao", "self-pickup", "unknown"].includes(order.deliveryType)
        ? order.deliveryType
        : "unknown",
      remarks: String(order.remarks || "").trim(),
      status: "parsed" as const, // parsed | ready | creating | created | error
    }));

    return NextResponse.json({ orders: normalizedOrders });
  } catch (error: any) {
    console.error("AI Parse Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to parse orders with AI." },
      { status: 500 }
    );
  }
}
