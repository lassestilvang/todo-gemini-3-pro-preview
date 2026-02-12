export function isValidId(id: number): boolean {
  return Number.isInteger(id) && id >= -2147483648 && id <= 2147483647;
}
