export type ExtractedData = {
  emails: string[];
  phones: string[];
  primaryEmail: string | null;
  primaryPhone: string | null;
};

export function extractData(text: string): ExtractedData {
  if (!text || typeof text !== "string") {
    return {
      emails: [],
      phones: [],
      primaryEmail: null,
      primaryPhone: null,
    };
  }

  const emailRegex =
    /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const emails = [...new Set(text.match(emailRegex) || [])];

  const phoneRegex =
    /(?:\+91[-\s]?)?(?:\d{10}|\+?[1-9]\d{1,2}[-\s]?\d{10})/g;
  const rawPhones = text.match(phoneRegex) || [];
  const phones = [
    ...new Set(rawPhones.map((p) => p.replace(/[\s\-()]/g, ""))),
  ];

  return {
    emails,
    phones,
    primaryEmail: emails[0] || null,
    primaryPhone: phones[0] || null,
  };
}