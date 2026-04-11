import { appendToSheet } from "@/lib/sheets";

export type SheetsAppendInput = {
  spreadsheetId: string;
  range: string;
  values: string[][];
};

export async function sheetsAppendAction(data: SheetsAppendInput) {
  const { spreadsheetId, range, values } = data;

  // ✅ VALIDATION
  if (!spreadsheetId) throw new Error("Missing spreadsheetId");
  if (!range) throw new Error("Missing range");
  if (!values) throw new Error("Missing values");

  console.log("[ACTION] sheets_append");

  const res = await appendToSheet(spreadsheetId, range, values);

  return res;
}