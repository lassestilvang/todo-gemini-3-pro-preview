import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ⚡ Bolt Opt: O(1) allocation-free object emptiness check
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isObjectEmpty(obj: Record<string | number | symbol, any>): boolean {
  for (const key in obj) {
    if (Object.hasOwn(obj, key)) {
      return false;
    }
  }
  return true;
}
