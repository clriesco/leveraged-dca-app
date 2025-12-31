/**
 * Number formatting utilities for Spanish locale
 * - Thousands separator: point (.)
 * - Decimal separator: comma (,)
 * - Currency symbol: $ (after the number)
 */

/**
 * Formats a number as currency in Spanish format
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Formatted string like "1.234,56 $"
 */
export function formatCurrencyES(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSymbol?: boolean;
  }
): string {
  if (!Number.isFinite(value)) return "-";

  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
    showSymbol = true,
  } = options || {};

  // Format with Spanish locale
  const formatted = value.toLocaleString("es-ES", {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  return showSymbol ? `${formatted} $` : formatted;
}

/**
 * Formats a number as percentage in Spanish format
 * @param value - The number to format (as decimal, e.g., 0.15 for 15%)
 * @param options - Formatting options
 * @returns Formatted string like "+15,23 %"
 */
export function formatPercentES(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    showSign?: boolean;
  }
): string {
  if (!Number.isFinite(value)) return "-";

  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    showSign = true,
  } = options || {};

  const percentValue = value * 100;
  const formatted = percentValue.toLocaleString("es-ES", {
    minimumFractionDigits,
    maximumFractionDigits,
  });

  const sign = showSign && percentValue >= 0 ? "+" : "";
  return `${sign}${formatted} %`;
}

/**
 * Formats a number in Spanish format (no currency symbol)
 * @param value - The number to format
 * @param options - Formatting options
 * @returns Formatted string like "1.234,56"
 */
export function formatNumberES(
  value: number,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }
): string {
  if (!Number.isFinite(value)) return "-";

  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = options || {};

  return value.toLocaleString("es-ES", {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

/**
 * Converts a string with comma decimal separator to a number
 * Handles both comma and point as decimal separators
 * @param value - String value that may contain comma or point as decimal separator
 * @returns Parsed number or NaN if invalid
 */
export function parseNumberES(value: string): number {
  if (!value || value.trim() === "") return NaN;

  const trimmed = value.trim();
  
  // If it has a comma, treat it as decimal separator (Spanish format)
  if (trimmed.includes(",")) {
    // Count points before the comma - if any, they're thousands separators
    const commaIndex = trimmed.indexOf(",");
    const beforeComma = trimmed.substring(0, commaIndex);
    const afterComma = trimmed.substring(commaIndex + 1);
    
    if (beforeComma.includes(".")) {
      // Has points before comma - they're thousands separators
      // Remove all points, then replace comma with point
      const normalized = beforeComma.replace(/\./g, "") + "." + afterComma;
      return parseFloat(normalized);
    } else {
      // No points before comma - comma is decimal separator
      const normalized = trimmed.replace(",", ".");
      return parseFloat(normalized);
    }
  }
  
  // No comma - check if point is decimal or thousands separator
  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    if (parts.length === 2) {
      // Single point - check if it's decimal or thousands
      // If the part after point has 3 digits, it might be thousands (e.g., "1.234")
      // But if it's at the start (like "0.336"), it's definitely decimal
      if (parts[0] === "" || parts[0] === "0" || parts[1].length !== 3) {
        // Decimal separator
        return parseFloat(trimmed);
      } else {
        // Could be thousands, but without comma we'll treat as decimal
        return parseFloat(trimmed);
      }
    } else {
      // Multiple points - they're thousands separators
      const cleaned = trimmed.replace(/\./g, "");
      return parseFloat(cleaned);
    }
  }
  
  // No comma or point - just a number
  return parseFloat(trimmed);
}

/**
 * Formats a number for display in an input field (with comma as decimal separator)
 * Removes trailing zeros to avoid showing unnecessary precision
 * @param value - The number to format
 * @param decimals - Maximum number of decimal places
 * @returns Formatted string with comma as decimal separator, without trailing zeros
 */
export function formatForInput(value: number | string, decimals: number = 2): string {
  if (value === "" || value === null || value === undefined) return "";
  if (typeof value === "string") {
    // If it's already a string, parse it first to handle it properly
    const parsed = parseNumberES(value);
    if (isNaN(parsed)) {
      // If parsing fails, just ensure comma is used and return as is
      return value.replace(".", ",");
    }
    value = parsed;
  }
  if (!Number.isFinite(value)) return "";

  // Format with maximum decimals, then remove trailing zeros
  let formatted: string;
  if (decimals === 0) {
    // For integers, use Math.round to avoid issues with toFixed rounding
    formatted = Math.round(value).toString();
  } else {
    formatted = value.toFixed(decimals);
    // Remove trailing zeros and the decimal point/comma if all decimals are zeros
    formatted = formatted.replace(/\.?0+$/, "");
    // Replace point with comma for decimal separator
    formatted = formatted.replace(".", ",");
    // Ensure we have at least one digit before the comma if the number is less than 1
    if (formatted.startsWith(",")) {
      formatted = "0" + formatted;
    }
  }
  return formatted;
}

