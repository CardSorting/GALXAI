/** Conservative line-level detection, not a complete SQL parser. */
export function containsTruncateStatement(line: string): boolean {
  // TRUNCATE ON is a trigger event, not a table target. Keep matching any later
  // destructive statement on the same line; do not waive an entire trigger line.
  return /\bTRUNCATE\s+(?!ON\b)(?:TABLE\b|ONLY\b|["a-z_])/i.test(line);
}
