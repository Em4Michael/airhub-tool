import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const RATING_COLORS: Record<string, string> = {
  Highest: "bg-emerald-100 text-emerald-800 border-emerald-200",
  High: "bg-blue-100 text-blue-800 border-blue-200",
  Medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Low: "bg-orange-100 text-orange-800 border-orange-200",
  Lowest: "bg-red-100 text-red-800 border-red-200",
  "N/A": "bg-gray-100 text-gray-800 border-gray-200",
};

export const TASK_TYPE_LABELS: Record<string, string> = {
  page_quality: "Page Quality",
  needs_met: "Needs Met",
  youtube: "YouTube",
  image: "Image",
  side_by_side: "Side by Side",
};

export function formatCurrency(amount: number) {
  return `₦${amount.toLocaleString("en-NG")}`;
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "response" in err) {
    const e = err as { response?: { data?: { message?: string } } };
    return e.response?.data?.message || "An error occurred";
  }
  if (err instanceof Error) return err.message;
  return "An error occurred";
}
