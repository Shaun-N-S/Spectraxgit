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
