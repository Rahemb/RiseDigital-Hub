import {
  leadInput,
  leadValidationMessage,
  type LeadInput,
} from "../../lib/leads";
export const csvColumns = [
  "companyName",
  "orgNumber",
  "website",
  "industry",
  "municipality",
  "email",
  "notes",
] as const;
export function parseCsv(text: string) {
  if (Buffer.byteLength(text, "utf8") > 500000)
    throw new Error("CSV files must not exceed 500 KB");
  const input = text.replace(/^\uFEFF/, "");
  const delimiter = input.split(/\r?\n/)[0].includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let closed = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += ch;
    } else if (ch === '"' && !cell && !closed) quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
      closed = false;
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
      closed = false;
    } else {
      if (closed && !/\s/.test(ch))
        throw new Error("Invalid CSV after closing quote");
      cell += ch;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.length > 201)
    throw new Error("Import no more than 200 rows at a time");
  const header = rows.shift()?.map((s) => s.trim()) ?? [];
  if (!header.includes("companyName") || !header.includes("orgNumber"))
    throw new Error("Headers companyName and orgNumber are required");
  if (new Set(header).size !== header.length)
    throw new Error("Duplicate column headers");
  return rows.map((r, i) => {
    const result = leadInput.safeParse(
      Object.fromEntries(header.map((h, j) => [h, r[j] ?? ""])),
    );
    return {
      row: i + 2,
      data: result.success ? result.data : null,
      error:
        r.length !== header.length
          ? "Incorrect number of columns"
          : result.success
            ? ""
            : leadValidationMessage(result.error),
    };
  });
}
export function csvExport(
  rows: Pick<LeadInput, (typeof csvColumns)[number]>[],
) {
  const escape = (v: string) =>
    '"' +
    (/^[\s]*[=+@\-\t\r\n]/.test(v) ? "'" + v : v).replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    csvColumns.join(",") +
    "\r\n" +
    rows.map((r) => csvColumns.map((k) => escape(r[k])).join(",")).join("\r\n")
  );
}
