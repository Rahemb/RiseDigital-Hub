"use client";
import { useState } from "react";
import Link from "next/link";
import { previewCsv, importCsv } from "@/app/lead-actions";
import { Button } from "@/components/ui/button";
type Rows = NonNullable<Awaited<ReturnType<typeof previewCsv>>["rows"]>;
export function CsvImport() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Rows>();
  const [message, setMessage] = useState("");
  const [importedIds, setImportedIds] = useState<string[]>([]);
  const [pending, setPending] = useState(false);
  async function run(importing: boolean) {
    setPending(true);
    setMessage("");
    try {
      if (importing) {
        const r = await importCsv(text);
        setMessage(r.error ?? r.message ?? "");
        setImportedIds(r.ids ?? []);
        setRows(undefined);
      } else {
        const r = await previewCsv(text);
        setMessage(r.error ?? "");
        setRows(r.rows);
      }
    } catch {
      setMessage(
        "Could not process the file. Check its contents and try again.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="panel p-5 space-y-4">
      {!!importedIds.length && (
        <Link
          className="block text-primary underline"
          href={`/leads/list?ids=${importedIds.join(",")}`}
        >
          Review the {importedIds.length} imported leads →
        </Link>
      )}
      <h2 className="font-semibold">Import leads from CSV</h2>
      <p className="text-sm text-muted-foreground">
        UTF-8, comma or semicolon separated. Maximum 500 KB and 200 rows.
        companyName and orgNumber are required. Existing leads are never
        overwritten. Emails and websites are imported as unverified.
      </p>
      <code className="block overflow-x-auto text-xs p-3 bg-muted rounded">
        companyName,orgNumber,website,industry,municipality,email,notes
      </code>
      <label className="block text-sm">
        Choose CSV file
        <input
          type="file"
          accept=".csv,text/csv"
          className="field block w-full"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            setRows(undefined);
            if (file) {
              if (file.size > 500000) {
                setMessage("The file exceeds 500 KB");
                return;
              }
              setText(await file.text());
              setMessage("");
            }
          }}
        />
      </label>
      <label className="block text-sm">
        Or paste CSV
        <textarea
          className="field w-full font-mono text-xs"
          rows={9}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setRows(undefined);
          }}
        />
      </label>
      <Button disabled={pending || !text} onClick={() => run(false)}>
        {pending ? "Working …" : "Validate and preview"}
      </Button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      {rows && (
        <>
          <div className="overflow-auto max-h-96">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Company</th>
                  <th>Org. no.</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.row} className="border-t border-border">
                    <td className="p-2">{r.row}</td>
                    <td className="p-2">{r.data?.companyName ?? "—"}</td>
                    <td className="p-2">{r.data?.orgNumber ?? "—"}</td>
                    <td className="p-2">{r.error || "Ready to import"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm">
            Only valid, new, non-suppressed companies are imported. Checks run
            again when saving.
          </p>
          <Button
            disabled={pending || !rows.some((r) => r.data && !r.error)}
            onClick={() => run(true)}
          >
            Import valid rows
          </Button>
        </>
      )}
    </section>
  );
}
