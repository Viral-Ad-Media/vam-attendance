"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, Download, Upload, Loader, CheckCircle, Database } from "lucide-react";

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

export default function ImportExportPageClient() {
  const [exporting, setExporting] = React.useState<ExportFormat | null>(null);
  const [importing, setImporting] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: "success" | "error"; text: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(format);
      setMessage(null);

      // Fetch data for export
      let endpoint = "";
      let filename = "";

      switch (format) {
        case "students":
          endpoint = "/api/students";
          filename = `students-export-${new Date().toISOString().split("T")[0]}.csv`;
          break;
        case "attendance":
          endpoint = "/api/attendance?limit=10000";
          filename = `attendance-export-${new Date().toISOString().split("T")[0]}.csv`;
          break;
        case "sessions":
          endpoint = "/api/sessions";
          filename = `sessions-export-${new Date().toISOString().split("T")[0]}.csv`;
          break;
        case "enrollments":
          endpoint = "/api/enrollments";
          filename = `enrollments-export-${new Date().toISOString().split("T")[0]}.csv`;
          break;
      }

      const response = await fetch(endpoint, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readResponseError(response, "Failed to export data"));
      }

      const data = (await response.json()) as Array<Record<string, any>>;
      if (data.length === 0) {
        setMessage({ type: "error", text: "No data available to export" });
        return;
      }

      // Convert to CSV
      const headers = Object.keys(data[0]);
      const csv = [
        headers.join(","),
        ...data.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              if (value === null || value === undefined) return '""';
              if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return JSON.stringify(value).replace(/"/g, '');
            })
            .join(",")
        ),
      ].join("\n");

      // Download
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ type: "success", text: `Exported ${data.length} records as ${format}` });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Export failed" });
    } finally {
      setExporting(null);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setMessage(null);

      const text = await file.text();
      const lines = text.trim().split("\n");
      if (lines.length < 2) {
        setMessage({ type: "error", text: "CSV file must contain headers and at least one row" });
        return;
      }

      // Simple CSV parsing (no quoted fields support for now)
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",");
        const obj: Record<string, string> = {};
        headers.forEach((header, i) => {
          obj[header] = values[i]?.trim() || "";
        });
        return obj;
      });

      setMessage({
        type: "success",
        text: `Ready to import ${rows.length} records. Import functionality coming soon.`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Import failed" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="w-full space-y-5">
      <TopBar title="Import/Export" subtitle="Bulk data operations" />

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm flex items-center gap-2 ${
            message.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
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
            <p className="text-sm text-slate-600">
              Export your data in CSV format for analysis, backup, or external systems.
            </p>
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={() => handleExport("students")}
                disabled={exporting !== null}
                className="w-full justify-start"
              >
                {exporting === "students" && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                <Database className="mr-2 h-4 w-4" />
                Export students
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("attendance")}
                disabled={exporting !== null}
                className="w-full justify-start"
              >
                {exporting === "attendance" && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                <Database className="mr-2 h-4 w-4" />
                Export attendance
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("sessions")}
                disabled={exporting !== null}
                className="w-full justify-start"
              >
                {exporting === "sessions" && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                <Database className="mr-2 h-4 w-4" />
                Export sessions
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport("enrollments")}
                disabled={exporting !== null}
                className="w-full justify-start"
              >
                {exporting === "enrollments" && <Loader className="mr-2 h-4 w-4 animate-spin" />}
                <Database className="mr-2 h-4 w-4" />
                Export enrollments
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Upload className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Import data</CardTitle>
                <CardDescription>Upload CSV files to bulk import records</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600">
              Import student, teacher, or attendance data from CSV files. Headers must match system field names.
            </p>
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
              {importing ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Select CSV file
            </Button>
            <p className="text-xs text-slate-500">
              Upload a CSV with headers matching your data model.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Import/Export templates</CardTitle>
          <CardDescription>Download templates with the correct column headers</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-slate-600">
            Use these templates to ensure your CSV files have the correct structure.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-5">
            <li>Students: id, name, email, phone, country, program, class_name</li>
            <li>Attendance: session_id, student_id, status (present/absent/late)</li>
            <li>Sessions: title, starts_at, ends_at, course_id, teacher_id</li>
            <li>Enrollments: student_id, course_id</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
