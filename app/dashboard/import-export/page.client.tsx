"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Download, Upload, Loader, CheckCircle, Database, FileText } from "lucide-react";

async function readResponseError(response: Response, fallback: string) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return text || fallback;
  }
}

type ExportFormat = "students" | "attendance" | "sessions" | "enrollments";

type ImportResult = {
  imported: number;
  errors: Array<{ row: number; error: string }>;
};

function downloadTemplate(type: "students" | "attendance" | "sessions" | "enrollments") {
  const templates: Record<string, string> = {
    students: "name,email,phone,country,program,class_name\nJane Doe,jane@example.com,+1234567890,US,English,Morning Group",
    attendance: "session_id,student_id,status\n<uuid>,<uuid>,present",
    sessions: "title,starts_at,ends_at,course_id,teacher_id\nMorning Session,2025-01-01T09:00:00,,<uuid>,<uuid>",
    enrollments: "student_id,course_id\n<uuid>,<uuid>",
  };
  const csv = templates[type];
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${type}-template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportExportPageClient() {
  const [exporting, setExporting] = React.useState<ExportFormat | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [importType, setImportType] = React.useState<"students">("students");
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const [importResult, setImportResult] = React.useState<ImportResult | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(format);
      setMessage(null);

      const endpoints: Record<ExportFormat, string> = {
        students: "/api/students",
        attendance: "/api/attendance?limit=10000",
        sessions: "/api/sessions",
        enrollments: "/api/enrollments",
      };

      const filenames: Record<ExportFormat, string> = {
        students: `students-export-${new Date().toISOString().split("T")[0]}.csv`,
        attendance: `attendance-export-${new Date().toISOString().split("T")[0]}.csv`,
        sessions: `sessions-export-${new Date().toISOString().split("T")[0]}.csv`,
        enrollments: `enrollments-export-${new Date().toISOString().split("T")[0]}.csv`,
      };

      const response = await fetch(endpoints[format], { cache: "no-store" });
      if (!response.ok) throw new Error(await readResponseError(response, "Failed to export data"));

      const data = (await response.json()) as Array<Record<string, unknown>>;
      if (data.length === 0) {
        setMessage({ type: "error", text: "No data available to export" });
        return;
      }

      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(","),
        ...data.map((row) =>
          headers.map((header) => {
            const value = row[header];
            if (value === null || value === undefined) return '""';
            const str = String(value);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          }).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filenames[format];
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: `Exported ${data.length} records` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Export failed" });
    } finally {
      setExporting(null);
    }
  };

  const handleImportClick = () => { fileInputRef.current?.click(); };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setMessage(null);
      setImportResult(null);

      const csv = await file.text();
      const lines = csv.trim().split(/\r?\n/);
      if (lines.length < 2) {
        setMessage({ type: "error", text: "CSV must have a header row and at least one data row" });
        return;
      }

      const endpoint = importType === "students" ? "/api/import/students" : null;
      if (!endpoint) {
        setMessage({ type: "error", text: "Import type not supported yet" });
        return;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });

      const data = (await res.json()) as ImportResult & { error?: string };

      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Import failed" });
        return;
      }

      setImportResult(data);
      setMessage({
        type: data.errors?.length > 0 ? "error" : "success",
        text: `Imported ${data.imported} record${data.imported === 1 ? "" : "s"}${data.errors?.length ? ` (${data.errors.length} row${data.errors.length === 1 ? "" : "s"} skipped)` : ""}`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full space-y-5">
      <TopBar title="Import/Export" subtitle="Bulk data operations" />

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-2 ${
          message.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-800"
        }`}>
          {message.type === "success"
            ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
          <div>
            <p>{message.text}</p>
            {importResult?.errors && importResult.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs">
                {importResult.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.error}</li>
                ))}
                {importResult.errors.length > 5 && (
                  <li>…and {importResult.errors.length - 5} more</li>
                )}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Export data</CardTitle>
                <CardDescription>Download your data as CSV files</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">Export your data in CSV format for analysis or backup.</p>
            <div className="space-y-2">
              {(["students", "attendance", "sessions", "enrollments"] as ExportFormat[]).map((fmt) => (
                <Button
                  key={fmt}
                  variant="outline"
                  onClick={() => handleExport(fmt)}
                  disabled={exporting !== null}
                  className="w-full justify-start capitalize"
                >
                  {exporting === fmt ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                  Export {fmt}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Import data</CardTitle>
                <CardDescription>Upload a CSV to bulk import records</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Import student data from a CSV file. Headers must match the template.
            </p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Import type</label>
                <select
                  value={importType}
                  onChange={(e) => setImportType(e.target.value as "students")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25"
                >
                  <option value="students">Students</option>
                </select>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelected}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={handleImportClick}
                disabled={importing}
                className="w-full"
              >
                {importing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                {importing ? "Importing…" : "Select CSV file"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-slate-600" />
            <div>
              <CardTitle>CSV templates</CardTitle>
              <CardDescription>Download templates with the correct column headers</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            {([
              { type: "students", label: "Students template", cols: "name, email, phone, country, program, class_name" },
              { type: "attendance", label: "Attendance template", cols: "session_id, student_id, status" },
              { type: "sessions", label: "Sessions template", cols: "title, starts_at, course_id, teacher_id" },
              { type: "enrollments", label: "Enrollments template", cols: "student_id, course_id" },
            ] as { type: "students" | "attendance" | "sessions" | "enrollments"; label: string; cols: string }[]).map(({ type, label, cols }) => (
              <div key={type} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{cols}</p>
                <button
                  onClick={() => downloadTemplate(type)}
                  className="mt-2 text-xs font-semibold text-primary hover:underline"
                >
                  Download template →
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
