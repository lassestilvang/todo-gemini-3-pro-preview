import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isObjectEmpty(obj: any): boolean {
  for (const _ in obj) {
    return false;
  }
  return true;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isObjectNotEmpty(obj: any): boolean {
  for (const _ in obj) {
    return true;
  }
  return false;
}
