import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Money is shown in Indian Rupees with Indian digit grouping and two
// decimals, e.g. ₹17,999.00. Non-numeric input shows ₹0.00.
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount) {
  return inrFormatter.format(Number(amount) || 0);
}

// jsPDF's built-in fonts cannot draw "₹" (it prints as "¹"), so PDFs use the
// currency code instead, e.g. INR 17,999.00.
const inrCodeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  currencyDisplay: "code",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

// Discount percent of an offer that is enabled and within its dates, else 0.
// Matches how the server prices orders.
export function getActiveOfferPercent(offer, now = new Date()) {
  if (!offer || offer.isActive !== true) return 0;
  if (new Date(offer.startDate) > now || new Date(offer.endDate) < now) return 0;
  return Number(offer.discountPercent) || 0;
}

export function formatCurrencyForPdf(amount) {
  return inrCodeFormatter.format(Number(amount) || 0).replace(/\s/g, " ");
}
