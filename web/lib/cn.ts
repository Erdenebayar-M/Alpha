type ClassValue = string | false | null | undefined;

/** Joins truthy class names with a space. Small enough to not need clsx. */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
