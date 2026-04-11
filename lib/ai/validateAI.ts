export function validateAIResponse(data: any) {
  if (!data) return false;
  if (typeof data.action !== "string") return false;
  if (typeof data.params !== "object") return false;
  return true;
}