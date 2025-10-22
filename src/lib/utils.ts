import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  // Remove .00 if there are no cents
  const formatted = numAmount.toFixed(2);
  return formatted.endsWith('.00') ? `${formatted.slice(0, -3)}€` : `${formatted}€`;
}
