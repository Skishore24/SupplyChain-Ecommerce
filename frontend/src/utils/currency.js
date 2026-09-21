export const CURRENCY_SYMBOL = '₹';
export const CURRENCY_CODE = 'INR';

/**
 * Formats an amount into Indian Rupees (INR) format (e.g., ₹1,299.00 or ₹1,50,000.00).
 * Handles numbers, strings, and null/undefined safely.
 */
export const formatPrice = (amount) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const formatINR = formatPrice;
