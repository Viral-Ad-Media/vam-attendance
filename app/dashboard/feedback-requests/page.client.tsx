"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader, Mail, RotateCcw, Trash2, Send } from "lucide-react";

type FeedbackRequest = {
  id: string;
  org_id: string;
  attendance_id: string;
  student_id: string;
  session_id: string;
  sent_to: string;
  sent_at?: string | null;
  submitted_at?: string | null;
  expires_at?: string | null;
  created_at: string;
};

type Student = {
  id: string;
  name: string;
  email?: string | null;
};

type Session = {
  id: string;
  title?: string | null;
  starts_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
}

function getStatus(request: FeedbackRequest) {
  if (request.submitted_at) return { label: "Submitted", color: "bg-emerald-100 text-emerald-800" };
  if (!request.sent_at) return { label: "Not sent", color: "bg-slate-100 text-slate-700" };
  if (request.expires_at && new Date(request.expires_at) < new Date()) {
    return { label: "Expired", color: "bg-red-100 text-red-800" };
  }
  return { label: "Sent", color: "bg-blue-100 text-blue-800" };
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

export default function FeedbackRequestsPageClient() {
  const [requests, setRequests] = React.useState<FeedbackRequest[]>([]);
  const [students, setStudents] = React.useState<Map<string, Student>>(new Map());
  const [sessions, setSessions] = React.useState<Map<string, Session>>(new Map());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<string | null>(null);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);

  const loadAll = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [requestsRes, studentsRes, sessionsRes] = await Promise.all([
        fetch("/api/student-feedback-requests", { cache: "no-store" }),
        fetch("/api/students", { cache: "no-store" }),
        fetch("/api/sessions", { cache: "no-store" }),
      ]);

      if (!requestsRes.ok) throw new Error(await readResponseError(requestsRes, "Failed to load requests"));
      if (!studentsRes.ok) throw new Error(await readResponseError(studentsRes, "Failed to load students"));
      if (!sessionsRes.ok) throw new Error(await readResponseError(sessionsRes, "Failed to load sessions"));

      const requestsData = (await requestsRes.json()) as FeedbackRequest[];
      const studentsData = (await studentsRes.json()) as Student[];
      const sessionsData = (await sessionsRes.json()) as Session[];

      setRequests(requestsData);
      setStudents(new Map(studentsData.map((s) => [s.id, s])));
      setSessions(new Map(sessionsData.map((s) => [s.id, s])));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAll();
  }, [loadAll]);

  const filteredRequests = React.useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter === "all") return true;
      const status = getStatus(req);
      return status.label.toLowerCase().replace(" ", "-") === statusFilter;
    });
  }, [requests, statusFilter]);

  const paginatedRequests = filteredRequests.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredRequests.length / pageSize);

  const handleResend = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const response = await fetch(`/api/student-feedback-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend" }),
      });
      if (!response.ok) throw new Error(await readResponseError(response, "Failed to resend"));
      setActionMessage("Feedback request resent successfully");
      await loadAll();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to resend");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (requestId: string) => {
    try {
      setActionLoading(requestId);
      const response = await fetch(`/api/student-feedback-requests/${requestId}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await readResponseError(response, "Failed to delete"));
      setActionMessage("Feedback request deleted");
      await loadAll();
      setDeleteConfirm(null);
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="w-full space-y-5">
      <TopBar title="Feedback requests" subtitle="Manage student feedback workflows" />

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-6 shadow-sm">
          <Loader className="mr-2 h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-slate-600">Loading feedback requests…</p>
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
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Filter by status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="not-sent">Not sent</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {actionMessage && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {actionMessage}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Feedback requests</CardTitle>
            </CardHeader>
            <CardContent>
              {paginatedRequests.length > 0 ? (
                <>
                  <div className="space-y-3 divide-y divide-slate-200 border-t border-slate-200">
                    {paginatedRequests.map((req) => {
                      const student = students.get(req.student_id);
                      const session = sessions.get(req.session_id);
                      const status = getStatus(req);
                      return (
                        <div key={req.id} className="flex flex-col gap-3 pt-3 first:pt-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium text-slate-900">{student?.name || "Unknown student"}</span>
                                <Badge className={status.color}>{status.label}</Badge>
                              </div>
                              <p className="mt-1 text-xs text-slate-600">
                                Session: {session?.title || "Unknown session"}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Sent to: {req.sent_to}
                              </p>
                              {req.sent_at && (
                                <p className="text-xs text-slate-500">
                                  Sent: {formatDate(req.sent_at)}
                                </p>
                              )}
                              {req.submitted_at && (
                                <p className="text-xs text-emerald-600">
                                  Submitted: {formatDate(req.submitted_at)}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {!req.submitted_at && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleResend(req.id)}
                                    disabled={actionLoading === req.id}
                                    className="w-fit"
                                  >
                                    {actionLoading === req.id ? (
                                      <Loader className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <RotateCcw className="mr-1 h-3 w-3" />
                                    )}
                                    Resend
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setDeleteConfirm(req.id)}
                                    disabled={actionLoading === req.id}
                                    className="w-fit text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="mr-1 h-3 w-3" />
                                    Delete
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <PaginationControls page={page} pageSize={pageSize} totalPages={totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
                  <Mail className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  No feedback requests matching your filter.
                </div>
              )}
            </CardContent>
          </Card>

          <Dialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete feedback request</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-slate-600">
                This will permanently delete the feedback request. This action cannot be undone.
              </p>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                  disabled={actionLoading !== null}
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
