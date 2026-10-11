const VARIABLE_PATTERN = /\{\{\s*([\p{L}\p{N}_-]{1,100})\s*\}\}/gu;

export function extractPromptVariables(text: string): string[] {
  return [...new Set([...text.matchAll(VARIABLE_PATTERN)].map(match => match[1]))];
}

/** Values stay literal text, including dollar signs and Markdown/HTML. */
export function fillPromptVariables(text: string, values: Record<string, string>): string {
  return text.replace(VARIABLE_PATTERN, (placeholder, key: string) =>
    Object.hasOwn(values, key) && values[key] !== '' ? values[key] : placeholder,
  );
}
