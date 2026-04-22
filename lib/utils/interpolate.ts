/**
 * Interpolate template with payload values
 *
 * Production-grade features:
 * - Replaces {{variable}} with payload[variable]
 * - Warns if variable key not found (for debugging)
 * - Returns empty string if key missing
 */
export function interpolate(template: string, payload: any) {
  return template.replace(/{{(.*?)}}/g, (match, key) => {
    const trimmedKey = key.trim();
    const value = payload[trimmedKey];

    // Log warning if variable not found in payload
    if (value === undefined || value === null) {
      console.warn(
        `[INTERPOLATE] Missing variable: "${trimmedKey}" — replacing with empty string. Check your workflow step config.`,
        { availableKeys: Object.keys(payload).join(", ") },
      );
    }

    return value ?? "";
  });
}
