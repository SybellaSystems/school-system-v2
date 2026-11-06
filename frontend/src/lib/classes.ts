export const SCHOOL_CLASSES = [
  "S1 A",
  "S1 B",
  "S1 C",
  "S1 D",
  "S1 E",
  "S1 F",
  "S1 G",
  "S2 A",
  "S2 B",
  "S2 C",
  "S2 D",
  "S2 E",
  "S3 A",
  "S3 B",
  "S3 C",
  "S3 D",
  "S3 E",
  "S4 ARH A",
  "S4 ARH B",
  "S6 MPC",
  "S6 HGL",
] as const;

const removedClasses = new Set(["S4 ARH", "S5 ARH"]);

export function isSupportedClass(value: unknown): value is string {
  const className = String(value ?? "").trim().replace(/\s+/g, " ");
  return Boolean(className) && !removedClasses.has(className.toUpperCase());
}
