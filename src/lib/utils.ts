import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1) + 'k';
  }
  return num.toString();
}

export function formatTimeAgo(timestampMs: number): string {
  const elapsedSec = Math.floor((Date.now() - timestampMs) / 1000);
  if (elapsedSec < 5) return 'just now';
  if (elapsedSec < 60) return `${elapsedSec}s ago`;
  if (elapsedSec < 3600) return `${Math.floor(elapsedSec / 60)}m ago`;
  if (elapsedSec < 86400) return `${Math.floor(elapsedSec / 3600)}h ago`;
  return `${Math.floor(elapsedSec / 86400)}d ago`;
}
