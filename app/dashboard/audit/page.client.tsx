"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Loader, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type AuditLog = {
  id: string;
  org_id: string;
  actor_id: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
};

const actionColors: Record<string, string> = {
  create: "bg-emerald-100 text-emerald-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  read: "bg-slate-100 text-slate-700",
  resend: "bg-amber-100 text-amber-800",
  list: "bg-slate-100 text-slate-700",
};

const entityLabels: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  course: "Course",
  session: "Session",
  attendance: "Attendance",
  enrollment: "Enrollment",
  "student_feedback": "Feedback",
  "student_feedback_request": "Feedback Request",
  user: "User",
};

function formatDate(value: string) {
  try {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
}

async function readResponseError(response: Response, fallback: string) {
  const text = await response.text();
  try {
    const parsed = JSON.parse(text) as { error?: string; message?: string };
    return parsed.error || parsed.message || fallback;
  } catch {
    return text || fallback;
  }
}

export default function AuditPageClient() {
  const [logs, setLogs] = React.useState<AuditLog[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionFilter, setActionFilter] = React.useState("all");
  const [entityFilter, setEntityFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);

  const loadLogs = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (entityFilter !== "all") params.set("entity", entityFilter);
      params.set("limit", String(pageSize * 2));

      const response = await fetch(`/api/audit?${params}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await readResponseError(response, "Failed to load audit logs"));
      }
      const data = (await response.json()) as AuditLog[];
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, pageSize]);

  React.useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const uniqueActions = React.useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.action))).sort();
  }, [logs]);

  const uniqueEntities = React.useMemo(() => {
    return Array.from(new Set(logs.map((log) => log.entity))).sort();
  }, [logs]);

  const filteredLogs = React.useMemo(() => {
    return logs.filter((log) => {
      if (actionFilter !== "all" && log.action !== actionFilter) return false;
      if (entityFilter !== "all" && log.entity !== entityFilter) return false;
      return true;
    });
  }, [logs, actionFilter, entityFilter]);

  const paginatedLogs = filteredLogs.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredLogs.length / pageSize);

  return (
    <div className="w-full space-y-5">
      <TopBar title="Audit logs" subtitle="View organization activity trail" />

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-6 shadow-sm">
          <Loader className="mr-2 h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-slate-600">Loading audit logs…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="mr-2 inline-block h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && (
        <>
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Filter by action</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action.charAt(0).toUpperCase() + action.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Filter by entity</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entities</SelectItem>
                    {uniqueEntities.map((entity) => (
                      <SelectItem key={entity} value={entity}>
                        {entityLabels[entity] || entity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Activity trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {paginatedLogs.length > 0 ? (
                <>
                  <div className="space-y-2 divide-y divide-slate-200 border-t border-slate-200">
                    {paginatedLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 pt-3 first:pt-0">
                        <Activity className="mt-1 h-4 w-4 flex-shrink-0 text-slate-400" />
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={cn("capitalize", actionColors[log.action] || "bg-slate-100 text-slate-700")}>
                              {log.action}
                            </Badge>
                            <span className="text-sm font-medium text-slate-900">
                              {entityLabels[log.entity] || log.entity}
                            </span>
                            {log.entity_id && (
                              <code className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600 font-mono">
                                {log.entity_id.slice(0, 8)}
                              </code>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(log.created_at)}</p>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-xs font-medium text-primary hover:underline">
                                View metadata
                              </summary>
                              <pre className="mt-2 overflow-auto rounded bg-slate-50 p-2 text-xs text-slate-600 whitespace-pre-wrap break-words max-w-lg">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <PaginationControls page={page} pageSize={pageSize} totalPages={totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
                  <Activity className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  No audit logs matching your filters.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
