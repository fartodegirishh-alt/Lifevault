// Shared expiry status logic for server and client
/**
 * Computes expiry status based on target date and reference date.
 * @param {string|Date} expiryDate - The expiry or warranty end date (YYYY-MM-DD)
 * @param {string|Date} today - Reference date, defaults to today
 * @param {number} windowDays - Days window to consider "Expiring soon", defaults to 30
 * @returns {"No expiry date" | "Invalid date" | "Expired" | "Expiring soon" | "Active"}
 */
export function getExpiryStatus(expiryDate, today = new Date(), windowDays = 30) {
  if (!expiryDate) return "No expiry date";
  
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return "Invalid date";

  const now = new Date(today);
  if (isNaN(now.getTime())) return "Invalid date";

  // Normalize both dates to midnight UTC/local date boundaries for consistent days calculation
  const expDay = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffTime = expDay.getTime() - nowDay.getTime();
  const daysLeft = Math.ceil(diffTime / 86400000);

  if (daysLeft < 0) return "Expired";
  if (daysLeft <= windowDays) return "Expiring soon";
  return "Active";
}

/**
 * Calculates days left until expiry
 * @param {string|Date} expiryDate 
 * @param {string|Date} today 
 * @returns {number|null}
 */
export function getDaysLeft(expiryDate, today = new Date()) {
  if (!expiryDate) return null;
  const exp = new Date(expiryDate);
  if (isNaN(exp.getTime())) return null;

  const now = new Date(today);
  const expDay = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  return Math.ceil((expDay.getTime() - nowDay.getTime()) / 86400000);
}

/**
 * Calculates warranty end date given purchase date and warranty months
 * @param {string} purchaseDate - YYYY-MM-DD
 * @param {number} months - integer
 * @returns {string|null} - YYYY-MM-DD
 */
export function calculateWarrantyEndDate(purchaseDate, months) {
  if (!purchaseDate || !months || isNaN(months) || months <= 0) return null;
  const date = new Date(purchaseDate);
  if (isNaN(date.getTime())) return null;

  const targetDate = new Date(date);
  targetDate.setMonth(targetDate.getMonth() + parseInt(months, 10));
  
  return targetDate.toISOString().split('T')[0];
}
