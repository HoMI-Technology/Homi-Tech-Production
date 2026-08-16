import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** className merge — shared by planner UI (ported from SPA). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
