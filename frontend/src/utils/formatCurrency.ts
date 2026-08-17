/**
 * Display-only currency formatting. Does not change stored values.
 */
export const formatCurrencyINR = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: Number.isInteger(numeric) ? 0 : 2,
  }).format(numeric);
};

/** Compact INR for KPI cards (e.g. ₹11.6 L). */
export const formatCompactCurrencyINR = (
  value: string | number | null | undefined,
): string => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "number" ? value : Number(String(value).replace(/,/g, ""));

  if (Number.isNaN(numeric)) {
    return String(value);
  }

  const abs = Math.abs(numeric);
  const sign = numeric < 0 ? "-" : "";

  if (abs >= 10_000_000) {
    return `${sign}₹${(abs / 10_000_000).toFixed(abs >= 100_000_000 ? 1 : 2)} Cr`;
  }

  if (abs >= 100_000) {
    return `${sign}₹${(abs / 100_000).toFixed(abs >= 1_000_000 ? 1 : 2)} L`;
  }

  if (abs >= 1_000) {
    return `${sign}₹${(abs / 1_000).toFixed(1)} K`;
  }

  return formatCurrencyINR(numeric);
};
