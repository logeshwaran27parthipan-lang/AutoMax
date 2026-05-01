export function interpolate(template: string, payload: any): string {
  return template.replace(/{{(.*?)}}/g, (match, key) => {
    const trimmedKey = key.trim();

    // Support dot notation: step_0_output.Email
    const parts = trimmedKey.split(".");
    let value: any = payload;

    for (const part of parts) {
      if (value === undefined || value === null) {
        value = undefined;
        break;
      }
      // If value is a JSON string, parse it first
      if (typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch {
          value = undefined;
          break;
        }
      }
      value = value[part];
    }

    if (value === undefined || value === null) {
      console.warn(
        `[INTERPOLATE] Missing variable: "${trimmedKey}" — replacing with empty string.`,
        { availableKeys: Object.keys(payload).join(", ") },
      );
      return "";
    }

    // If the resolved value is an object/array, return it as JSON string
    if (typeof value === "object") {
      return JSON.stringify(value);
    }

    return String(value);
  });
}
