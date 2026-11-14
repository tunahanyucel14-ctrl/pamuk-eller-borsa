export function parseMoney(raw: string): number | null;
export function extractDate(text: string): string;
export function parseReceiptText(text: string, confidence?: number): {
  merchant: string;
  date: string;
  total: number;
  currency: "TRY";
  category: string;
  description: string;
  items: string[];
  confidence: number;
  needsReview: boolean;
  ocrText: string;
};
