"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck, Users } from "lucide-react";

type OrgRole = "admin" | "teacher" | "student" | "viewer";

type Member = {
  id: string;
  user_id: string;
  role: OrgRole | string;
  full_name: string | null;
  email: string | null;
  is_superadmin?: boolean;
};

type Viewer = {
  id: string;
  role: OrgRole | "superadmin" | null;
  isSuperadmin: boolean;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
  viewer: "Viewer",
};

async function readError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error || fallback;
  } catch {
    return fallback;
  }
}

export function MembersRolesPanel() {
  const [members, setMembers] = React.useState<Member[]>([]);
  const [viewer, setViewer] = React.useState<Viewer | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [savingId, setSavingId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [membershipsRes, profileRes] = await Promise.all([
        fetch("/api/memberships", { cache: "no-store" }),
        fetch("/api/account/profile", { cache: "no-store" }),
      ]);
      if (!membershipsRes.ok) {
        // Non-managers get a 403 here — that's expected, just show nothing.
        if (membershipsRes.status === 403) {
          setMembers([]);
          return;
        }
        throw new Error(await readError(membershipsRes, "Failed to load team members"));
      }
      const membershipsData = (await membershipsRes.json()) as Member[];
      setMembers(membershipsData);

      if (profileRes.ok) {
        const profileData = (await profileRes.json()) as {
          profile: { id: string };
          role: OrgRole | "superadmin" | null;
          isSuperadmin: boolean;
        };
        setViewer({ id: profileData.profile.id, role: profileData.role, isSuperadmin: profileData.isSuperadmin });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const canManage = viewer?.isSuperadmin || viewer?.role === "admin";

  const changeRole = async (member: Member, role: OrgRole) => {
    setSavingId(member.id);
    setError(null);
    try {
      const res = await fetch(`/api/memberships/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to update role"));
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role } : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setSavingId(null);
    }
  };

  const toggleSuperadmin = async (member: Member, next: boolean) => {
    setSavingId(member.id);
    setError(null);
    try {
      const res = await fetch(`/api/superadmin/users/${member.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ superadmin: next }),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to update superadmin access"));
      setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, is_superadmin: next } : m)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update superadmin access");
    } finally {
      setSavingId(null);
    }
  };

  if (!loading && members.length === 0 && !canManage) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Members &amp; Roles</CardTitle>
            <CardDescription>Manage who has access to this organization and what they can do</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading members…
          </div>
        )}

        {error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {!loading &&
          members.map((member) => {
            const normalizedRole = (member.role === "owner" ? "admin" : member.role) as OrgRole;
            const isSelf = viewer?.id === member.user_id;
            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-900">
                    {member.full_name || member.email || "Unknown member"}
                  </p>
                  {member.email && <p className="truncate text-sm text-slate-600">{member.email}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {canManage && !isSelf ? (
                    <Select
                      value={ROLE_LABELS[normalizedRole] ? normalizedRole : "viewer"}
                      onValueChange={(value) => changeRole(member, value as OrgRole)}
                      disabled={savingId === member.id}
                    >
                      <SelectTrigger className="h-9 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="teacher">Teacher</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="capitalize">
                      {ROLE_LABELS[normalizedRole] || normalizedRole}
                    </Badge>
                  )}

                  {viewer?.isSuperadmin && !isSelf && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <ShieldCheck className="h-3.5 w-3.5 text-indigo-600" />
                      Superadmin
                      <Switch
                        checked={!!member.is_superadmin}
                        onCheckedChange={(checked) => toggleSuperadmin(member, checked)}
                        disabled={savingId === member.id}
                        aria-label={`Toggle superadmin for ${member.full_name || member.email}`}
                      />
                    </label>
                  )}
                </div>
              </div>
            );
          })}

        {!loading && members.length === 0 && (
          <p className="text-sm text-slate-600">No other members yet.</p>
        )}
      </CardContent>
    </Card>
  );
}
