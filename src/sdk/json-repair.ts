/**
 * GALXAI Developer SDK: Resilient JSON Repair Engine
 * Zero-dependency heuristic repair for incomplete, truncated, or malformed LLM JSON outputs.
 * Solves:
 * - Markdown fences (```json ... ```)
 * - Conversational preface and postscript
 * - Trailing commas in arrays and objects
 * - Unquoted or single-quoted keys and strings
 * - Unclosed brackets, braces, and quotes from max_tokens cutoff
 */

export function repairJSON(raw: string): string {
  if (!raw || typeof raw !== 'string') return '{}';

  let s = raw.trim();

  // 1. Strip markdown fences
  s = s.replace(/^```(?:json|JSON)?\s*\n?/, '').replace(/\n?```\s*$/, '').trim();

  // 2. Find first opening JSON character ('{' or '[')
  const firstBrace = s.indexOf('{');
  const firstBracket = s.indexOf('[');

  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx > 0) {
    s = s.slice(startIdx);
  }

  // 3. Strip trailing conversational text if closing brace exists
  const lastBrace = s.lastIndexOf('}');
  const lastBracket = s.lastIndexOf(']');
  const endIdx = Math.max(lastBrace, lastBracket);
  if (endIdx !== -1 && endIdx < s.length - 1) {
    // Check if what follows is conversational text
    const remainder = s.slice(endIdx + 1).trim();
    if (remainder && !remainder.startsWith(',') && !remainder.startsWith(']') && !remainder.startsWith('}')) {
      s = s.slice(0, endIdx + 1);
    }
  }

  // 4. Convert single-quoted strings to double-quoted strings (safely handling escaped quotes)
  s = s.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_match, group) => {
    return `"${group.replace(/"/g, '\\"')}"`;
  });

  // 5. Quote unquoted keys: { foo: "bar" } -> { "foo": "bar" }
  s = s.replace(/([{,]\s*)([a-zA-Z0-9_$-]+)\s*:/g, '$1"$2":');

  // 6. Remove trailing commas: [1, 2, ] -> [1, 2], {"a": 1, } -> {"a": 1}
  s = s.replace(/,\s*([\]}])/g, '$1');

  // 7. Balance unclosed quotes, brackets, and braces due to generation truncation
  let inString = false;
  let escapeNext = false;
  const stack: string[] = [];

  for (let i = 0; i < s.length; i++) {
    const char = s[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack.length > 0 && stack[stack.length - 1] === '{') {
          stack.pop();
        }
      } else if (char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === '[') {
          stack.pop();
        }
      }
    }
  }

  // If ended mid-string, close the string
  if (inString) {
    s += '"';
  }

  // Remove any trailing comma or dangling colon before closing
  s = s.trim().replace(/,\s*$/, '').replace(/:\s*$/, ': null');

  // Close remaining unclosed brackets and braces in reverse order
  while (stack.length > 0) {
    const unclosed = stack.pop();
    if (unclosed === '{') s += '}';
    else if (unclosed === '[') s += ']';
  }

  return s;
}

/**
 * Safely parses JSON with automatic heuristic repair.
 */
export function safeParseJSON<T = any>(input: string): T {
  try {
    return JSON.parse(input);
  } catch {
    const repaired = repairJSON(input);
    return JSON.parse(repaired);
  }
}
