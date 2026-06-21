"use client";

import * as React from "react";
import { Building2, Calendar, Loader2, Mail, MapPin, Phone, Save, ShieldCheck, User } from "lucide-react";
import { TopBar } from "@/components/dashboard/TopBar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";

type AccountProfile = {
  id: string;
  org_id: string;
  email: string;
  full_name?: string | null;
  phone?: string | null;
  location?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Organization = {
  id: string;
  name: string;
  created_at?: string | null;
};

type ProfileResponse = {
  profile: AccountProfile;
  organization: Organization | null;
  role: string;
};

type ProfileDraft = {
  full_name: string;
  phone: string;
  location: string;
  bio: string;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function initialsFor(profile: AccountProfile | null) {
  const source = profile?.full_name || profile?.email || "User";
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function toDraft(profile: AccountProfile): ProfileDraft {
  return {
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? "",
    location: profile.location ?? "",
    bio: profile.bio ?? "",
  };
}

function cleanOptional(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

export default function ProfilePageClient() {
  const [profile, setProfile] = React.useState<AccountProfile | null>(null);
  const [organization, setOrganization] = React.useState<Organization | null>(null);
  const [role, setRole] = React.useState("member");
  const [draft, setDraft] = React.useState<ProfileDraft>({
    full_name: "",
    phone: "",
    location: "",
    bio: "",
  });
  const [isEditing, setIsEditing] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saveMessage, setSaveMessage] = React.useState<string | null>(null);

  const loadProfile = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/account/profile", { cache: "no-store" });
      if (!response.ok) throw new Error(await readResponseError(response, "Failed to load profile"));
      const data = (await response.json()) as ProfileResponse;
      setProfile(data.profile);
      setOrganization(data.organization);
      setRole(data.role);
      setDraft(toDraft(data.profile));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const saveProfile = async () => {
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: cleanOptional(draft.full_name),
          phone: cleanOptional(draft.phone),
          location: cleanOptional(draft.location),
          bio: cleanOptional(draft.bio),
        }),
      });

      if (!response.ok) throw new Error(await readResponseError(response, "Failed to save profile"));
      const updated = (await response.json()) as AccountProfile;
      setProfile(updated);
      setDraft(toDraft(updated));
      setIsEditing(false);
      setSaveMessage("Profile saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const cancelEditing = () => {
    if (profile) setDraft(toDraft(profile));
    setIsEditing(false);
    setSaveMessage(null);
  };

  const displayName = profile?.full_name || profile?.email || "Account";
  const displayEmail = profile?.email || "No email";

  return (
    <div className="w-full space-y-4">
      <TopBar title="Profile" subtitle="Account details" />

      {loading && (
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading profile...
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {saveMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveMessage}
        </div>
      )}

      {!loading && profile && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-lg bg-slate-950 text-2xl font-bold text-white">
                    {initialsFor(profile)}
                  </div>
                  <h2 className="mb-1 text-xl font-semibold text-slate-900">{displayName}</h2>
                  <p className="mb-4 text-sm text-slate-600">{displayEmail}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      <ShieldCheck className="h-3 w-3" />
                      {role}
                    </Badge>
                    {organization && (
                      <Badge variant="outline">
                        <Building2 className="h-3 w-3" />
                        {organization.name}
                      </Badge>
                    )}
                  </div>
                  {!isEditing && (
                    <Button onClick={() => setIsEditing(true)} className="mt-6 w-full">
                      <User className="h-4 w-4" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {isEditing ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Full Name</Label>
                        <Input
                          id="profile-name"
                          value={draft.full_name}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, full_name: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-email">Email</Label>
                        <Input id="profile-email" value={displayEmail} disabled />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-phone">Phone</Label>
                        <Input
                          id="profile-phone"
                          value={draft.phone}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, phone: event.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="profile-location">Location</Label>
                        <Input
                          id="profile-location"
                          value={draft.location}
                          onChange={(event) =>
                            setDraft((current) => ({ ...current, location: event.target.value }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profile-bio">Bio</Label>
                      <Textarea
                        id="profile-bio"
                        value={draft.bio}
                        onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))}
                        rows={4}
                      />
                    </div>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                      <Button onClick={saveProfile} disabled={saving} className="flex-1">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                      </Button>
                      <Button onClick={cancelEditing} variant="outline" disabled={saving} className="flex-1">
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Full Name</p>
                          <p className="font-medium text-slate-900">{displayName}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Email</p>
                          <p className="font-medium text-slate-900">{displayEmail}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Phone</p>
                          <p className="font-medium text-slate-900">{profile.phone || "Not set"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Location</p>
                          <p className="font-medium text-slate-900">{profile.location || "Not set"}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Member Since</p>
                          <p className="font-medium text-slate-900">{formatDate(profile.created_at)}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-slate-400" />
                        <div>
                          <p className="text-xs font-medium text-slate-500">Organization</p>
                          <p className="font-medium text-slate-900">{organization?.name ?? "Not set"}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200 pt-4">
                      <p className="mb-2 text-xs font-medium text-slate-500">Bio</p>
                      <p className="leading-6 text-slate-900">{profile.bio || "Not set"}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
