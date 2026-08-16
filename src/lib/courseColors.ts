/**
 * Course tints, cycled as courses are added. Kept in its own module so the
 * store and the seed data can both use it without importing each other.
 */
export const COURSE_COLORS = [
  '#a4632a',
  '#4f9d69',
  '#3f7fbf',
  '#9a5aa8',
  '#c2843c',
  '#3f9c9c',
  '#b5535b',
] as const

/** The next unused tint, falling back to cycling once every colour is taken. */
export function nextCourseColor(used: string[]): string {
  const free = COURSE_COLORS.find((c) => !used.includes(c))
  return free ?? COURSE_COLORS[used.length % COURSE_COLORS.length]
}
