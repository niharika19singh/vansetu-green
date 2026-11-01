/**
 * VanSetu Green — Production Numeric Formatting & Validation Utility
 *
 * Ensures mathematical and scientific rigor across all 4 role workspaces:
 * 1. Preserves true numeric 0 (never treats 0 as falsy/missing).
 * 2. Safely handles null, undefined, empty strings, NaN, Infinity, and unparsed objects.
 * 3. Never produces runtime exceptions (e.g. `TypeError: Cannot read properties of undefined (reading 'toFixed')`).
 * 4. Upholds scientific integrity: never fabricates placeholder values when data is absent.
 */

export function isValidNumber(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  if (typeof val === 'object') return false;
  const num = Number(val);
  return typeof num === 'number' && !Number.isNaN(num) && Number.isFinite(num);
}

/**
 * Safely converts a numeric value to a fixed-decimal string.
 * @param {*} val - Value to format
 * @param {number} [digits=2] - Number of fraction digits
 * @param {string} [fallback='—'] - Fallback when value is not a valid finite number
 * @returns {string} Formatted number or fallback
 */
export function safeToFixed(val, digits = 2, fallback = '—') {
  if (!isValidNumber(val)) return fallback;
  return Number(val).toFixed(digits);
}

/**
 * Formats multi-criteria decision priority scores (typically [0, 1]).
 * @param {*} val 
 * @param {number} [digits=3] 
 * @param {string} [fallback='N/A'] 
 * @returns {string}
 */
export function formatScore(val, digits = 3, fallback = 'N/A') {
  return safeToFixed(val, digits, fallback);
}

/**
 * Formats Land Surface Temperature in Celsius.
 * @param {*} val 
 * @param {number} [digits=1] 
 * @param {string} [fallback='—'] 
 * @returns {string}
 */
export function formatTemperature(val, digits = 1, fallback = '—') {
  if (!isValidNumber(val)) return fallback;
  return `${Number(val).toFixed(digits)}°C`;
}

/**
 * Formats Normalized Difference Vegetation Index (NDVI, typically [-1, 1]).
 * @param {*} val 
 * @param {number} [digits=2] 
 * @param {string} [fallback='—'] 
 * @returns {string}
 */
export function formatNDVI(val, digits = 2, fallback = '—') {
  return safeToFixed(val, digits, fallback);
}

/**
 * Formats Indian Rupee currency in Lakhs (₹X.XX L).
 * @param {*} val - Amount in Lakhs
 * @param {number} [digits=1] 
 * @param {string} [fallback='—'] 
 * @returns {string}
 */
export function formatCurrencyLakh(val, digits = 1, fallback = '—') {
  if (!isValidNumber(val)) return fallback;
  return `₹${Number(val).toFixed(digits)}L`;
}

/**
 * Formats Indian Rupee currency in Crores (₹X.XX Cr).
 * @param {*} val - Amount in Crores
 * @param {number} [digits=2] 
 * @param {string} [fallback='—'] 
 * @returns {string}
 */
export function formatCurrencyCrore(val, digits = 2, fallback = '—') {
  if (!isValidNumber(val)) return fallback;
  return `₹${Number(val).toFixed(digits)} Cr`;
}

/**
 * Formats Indian Rupee raw integer amount with Indian comma grouping.
 * @param {*} val - Raw INR amount
 * @param {string} [fallback='—'] 
 * @returns {string}
 */
export function formatCurrencyRawINR(val, fallback = '—') {
  if (!isValidNumber(val)) return fallback;
  return `₹${Number(val).toLocaleString('en-IN')}`;
}

/**
 * Formats percentage values.
 * @param {*} val - The value
 * @param {number} [digits=0] - Decimal places
 * @param {boolean} [isRatio=true] - If true, multiplies by 100 (e.g. 0.45 -> 45%)
 * @param {string} [fallback='—'] 
 * @returns {string}
 */
export function formatPercentage(val, digits = 0, isRatio = true, fallback = '—') {
  if (!isValidNumber(val)) return fallback;
  const num = isRatio ? Number(val) * 100 : Number(val);
  return `${num.toFixed(digits)}%`;
}

/**
 * Formats distance in kilometers.
 * @param {*} val 
 * @param {number} [digits=2] 
 * @param {string} [fallback='—'] 
 * @returns {string}
 */
export function formatDistanceKm(val, digits = 2, fallback = '—') {
  if (!isValidNumber(val)) return fallback;
  return `${Number(val).toFixed(digits)} km`;
}

/**
 * Formats distance in meters.
 * @param {*} val 
 * @param {number} [digits=0] 
 * @param {string} [fallback='—'] 
 * @returns {string}
 */
export function formatMeters(val, digits = 0, fallback = '—') {
  if (!isValidNumber(val)) return fallback;
  return `${Number(val).toFixed(digits)} m`;
}
