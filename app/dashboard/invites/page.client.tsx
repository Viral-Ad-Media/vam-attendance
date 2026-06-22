"use client";

import * as React from "react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle, Loader, Mail, Plus, X } from "lucide-react";

type Invite = {
  id: string;
  org_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  invited_by?: string | null;
  accepted_at?: string | null;
  created_at: string;
};

type Membership = {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  created_at: string;
  updated_at: string;
};

function formatDate(value: string) {
  try {
    const date = new Date(value);
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Invalid date";
  }
}

function isExpired(expiresAt: string) {
  return new Date(expiresAt) < new Date();
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

export default function InvitesPageClient() {
  const [invites, setInvites] = React.useState<Invite[]>([]);
  const [memberships, setMemberships] = React.useState<Membership[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [actionMessage, setActionMessage] = React.useState<string | null>(null);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createForm, setCreateForm] = React.useState({ email: "", role: "teacher" });
  const [createError, setCreateError] = React.useState<string | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [invitesRes, membershipsRes] = await Promise.all([
        fetch("/api/invites", { cache: "no-store" }),
        fetch("/api/memberships", { cache: "no-store" }),
      ]);

      if (!invitesRes.ok) throw new Error(await readResponseError(invitesRes, "Failed to load invites"));
      if (!membershipsRes.ok) {
        // Memberships endpoint may not exist yet
        const invitesData = (await invitesRes.json()) as Invite[];
        setInvites(invitesData);
        setMemberships([]);
        return;
      }

      const invitesData = (await invitesRes.json()) as Invite[];
      const membershipsData = (await membershipsRes.json()) as Membership[];
      setInvites(invitesData);
      setMemberships(membershipsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email.trim()) {
      setCreateError("Email is required");
      return;
    }

    try {
      setActionLoading(true);
      setCreateError(null);
      const response = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });

      if (!response.ok) {
        throw new Error(await readResponseError(response, "Failed to create invite"));
      }

      setActionMessage("Invite created and sent successfully");
      setCreateForm({ email: "", role: "teacher" });
      setCreateOpen(false);
      await loadData();
      setTimeout(() => setActionMessage(null), 3000);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create invite");
    } finally {
      setActionLoading(false);
    }
  };

  const pendingInvites = invites.filter((i) => !i.accepted_at && !isExpired(i.expires_at));
  const acceptedInvites = invites.filter((i) => i.accepted_at);
  const expiredInvites = invites.filter((i) => !i.accepted_at && isExpired(i.expires_at));

  return (
    <div className="w-full space-y-5">
      <TopBar title="Invites" subtitle="Manage organization membership invitations" />

      {loading && (
        <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-6 shadow-sm">
          <Loader className="mr-2 h-5 w-5 animate-spin text-primary" />
          <p className="text-sm text-slate-600">Loading invites…</p>
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
          <Button onClick={() => setCreateOpen(true)} className="w-fit">
            <Plus className="mr-2 h-4 w-4" />
            Send invite
          </Button>

          {actionMessage && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {actionMessage}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Pending invites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{pendingInvites.length}</p>
                <p className="text-xs text-slate-600 mt-1">Awaiting acceptance</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Accepted invites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{acceptedInvites.length}</p>
                <p className="text-xs text-slate-600 mt-1">Active members</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Expired invites</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{expiredInvites.length}</p>
                <p className="text-xs text-slate-600 mt-1">Expired or revoked</p>
              </CardContent>
            </Card>
          </div>

          {pendingInvites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Pending invitations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 divide-y divide-slate-200 border-t border-slate-200">
                  {pendingInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between pt-3 first:pt-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{invite.email}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{invite.role}</Badge>
                          <span className="text-xs text-slate-500">
                            Expires {formatDate(invite.expires_at)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {acceptedInvites.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Organization members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 divide-y divide-slate-200 border-t border-slate-200">
                  {acceptedInvites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between pt-3 first:pt-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{invite.email}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{invite.role}</Badge>
                          <span className="text-xs text-emerald-600">
                            Joined {formatDate(invite.accepted_at || "")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send invitation</DialogTitle>
            <DialogDescription>
              Invite a person to join your organization. They'll receive an email with a link to accept.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateInvite} className="space-y-4">
            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="person@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                disabled={actionLoading}
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={createForm.role} onValueChange={(role) => setCreateForm({ ...createForm, role })}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {createError}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={actionLoading}>
                {actionLoading ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send invite
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
