import { getSheetRows } from "@/lib/sheets";

export type SheetsReadInput = {
  spreadsheetId: string;
  range: string;
};

export async function sheetsReadAction(data: SheetsReadInput) {
  const { spreadsheetId, range } = data;

  // ✅ VALIDATION
  if (!spreadsheetId) throw new Error("Missing spreadsheetId");
  if (!range) throw new Error("Missing range");

  console.log("[ACTION] sheets_read");

  const rows = await getSheetRows(spreadsheetId, range);

  return rows;
}