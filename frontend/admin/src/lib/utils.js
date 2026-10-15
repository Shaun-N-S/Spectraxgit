import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Joins whichever name parts exist, so a missing lastName (e.g. Google
// accounts without a family name) never renders as "undefined".
export function formatCustomerName(user) {
  return [user?.firstName, user?.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
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

export function formatCurrencyForPdf(amount) {
  return inrCodeFormatter.format(Number(amount) || 0).replace(/\s/g, " ");
}
