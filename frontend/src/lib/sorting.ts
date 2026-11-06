export function compareNames(first: string, second: string) {
  return first.localeCompare(second, undefined, { sensitivity: "base" });
}
