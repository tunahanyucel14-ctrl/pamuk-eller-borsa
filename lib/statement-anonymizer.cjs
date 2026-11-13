"use strict";

// Builds privacy-preserving regression fixtures from user-corrected rows.
// Never returns names, merchants, account identifiers, exact dates, exact amounts,
// free-text descriptions, or user-defined category labels.
function amountBand(value) {
  const n = Math.abs(Number(value));
  if (!Number.isFinite(n)) return "unknown";
  if (n < 100) return "0-99";
  if (n < 500) return "100-499";
  if (n < 1000) return "500-999";
  if (n < 5000) return "1000-4999";
  if (n < 10000) return "5000-9999";
  if (n < 50000) return "10000-49999";
  return "50000+";
}

function monthBucket(value) {
  const match = typeof value === "string" && value.match(/^(\d{4})-(\d{2})-\d{2}$/);
  return match && Number(match[2]) >= 1 && Number(match[2]) <= 12
    ? match[2] : "unknown";
}

function descriptionShape(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "empty";
  if (text.length <= 12) return "1-12";
  if (text.length <= 32) return "13-32";
  if (text.length <= 64) return "33-64";
  return "65+";
}

function anonymizeCorrectedRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, 1000).map((row) => ({
    month: monthBucket(row && row.tx_date),
    kind: row && (row.kind === "gelir" || row.kind === "gider") ? row.kind : "unknown",
    amount_band: amountBand(row && row.amount),
    description_length: descriptionShape(row && row.description),
  }));
}

module.exports = { anonymizeCorrectedRows, amountBand, monthBucket, descriptionShape };
