import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatIndianNumber(value, decimals = 2) {
  const num = Number(value);
  if (isNaN(num)) return '0';

  const fixed = num.toFixed(decimals);
  const [intPart, fracPart] = fixed.split('.');

  const lastThree = intPart.slice(-3);
  const rest = intPart.slice(0, -3);
  const formattedInt = rest
    ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree
    : lastThree;

  return fracPart ? `${formattedInt}.${fracPart}` : formattedInt;
}
