export function interpolate(template: string, payload: any) {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    return payload[key.trim()] ?? "";
  });
}