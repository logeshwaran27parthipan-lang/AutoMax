import { google, sheets_v4 } from "googleapis";

function getAuthClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";

  if (!clientEmail) {
    throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_EMAIL in environment");
  }

  if (!privateKey) {
    throw new Error("Missing GOOGLE_PRIVATE_KEY in environment");
  }

  // Replace escaped newlines with real newlines
  privateKey = privateKey.replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  } as any);

  return auth;
}

function getSheets(auth?: any): sheets_v4.Sheets {
  const client = google.sheets({ version: "v4", auth });
  return client;
}

export async function appendToSheet(
  spreadsheetId: string,
  range: string,
  values: string[][],
) {
  try {
    const auth = getAuthClient();
    const sheets = getSheets(auth);

    const res = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values,
      },
    });

    return res.data;
  } catch (err: any) {
    throw new Error(`appendToSheet failed: ${err?.message || String(err)}`);
  }
}

export async function getSheetRows(spreadsheetId: string, range: string) {
  try {
    const auth = getAuthClient();
    const sheets = getSheets(auth);

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = (res.data.values as string[][]) || [];
    return rows;
  } catch (err: any) {
    // return empty array on error as requested
    console.error("getSheetRows error:", err?.message || err);
    return [];
  }
}

export async function clearSheet(spreadsheetId: string, range: string) {
  try {
    const auth = getAuthClient();
    const sheets = getSheets(auth);

    const res = await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });

    return res.data;
  } catch (err: any) {
    throw new Error(`clearSheet failed: ${err?.message || String(err)}`);
  }
}
