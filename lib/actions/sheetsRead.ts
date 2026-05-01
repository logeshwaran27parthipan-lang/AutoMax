import { getSheetRows } from "@/lib/sheets";

export type SheetsReadInput = {
  spreadsheetId: string;
  range: string;
};

export async function sheetsReadAction(data: SheetsReadInput) {
  const { spreadsheetId, range } = data;

  if (!spreadsheetId) throw new Error("Missing spreadsheetId");
  if (!range) throw new Error("Missing range");

  console.log("[ACTION] sheets_read");

  const rows = await getSheetRows(spreadsheetId, range);

  if (!rows || rows.length < 2) return [];

  const headers = rows[0] as string[];
  const dataRows = rows.slice(1);

  const result = dataRows.map((row: any[]) => {
    const obj: Record<string, string> = {};
    headers.forEach((header, i) => {
      obj[header] = row[i] ?? "";
    });
    return obj;
  });

  return result;
}