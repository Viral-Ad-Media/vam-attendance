"use client";

import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { Bell, Lock, Eye, Database, Trash2, Loader2, CheckCircle } from "lucide-react";

interface Settings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
  dataRetention: string;
  twoFactorAuth: boolean;
}

const defaults: Settings = {
  emailNotifications: true,
  pushNotifications: false,
  weeklyReports: true,
  monthlyReports: true,
  dataRetention: "12months",
  twoFactorAuth: false,
};

async function readError(res: Response, fallback: string) {
  const text = await res.text();
  try { return (JSON.parse(text) as { error?: string }).error || fallback; } catch { return fallback; }
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setSettings({ ...defaults, ...(data as Partial<Settings>) }))
      .catch(() => setSettings(defaults))
      .finally(() => setLoading(false));
  }, []);

  const save = async (updated: Settings) => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to save settings"));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof Settings) => {
    const value = settings[key];
    if (typeof value !== "boolean") return;
    const updated = { ...settings, [key]: !value };
    setSettings(updated);
    save(updated);
  };

  const setRetention = (value: string) => {
    const updated = { ...settings, dataRetention: value };
    setSettings(updated);
    save(updated);
  };

  return (
    <div className="w-full">
      <TopBar title="Settings" subtitle="Preferences and security" />

      <div className="max-w-3xl space-y-6">
        {loading && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4" /> Settings saved.
          </div>
        )}

        {saving && !saved && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage how you receive updates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {([
              { key: "emailNotifications", label: "Email Notifications", desc: "Receive notifications via email" },
              { key: "pushNotifications", label: "Push Notifications", desc: "Get push notifications on your devices" },
              { key: "weeklyReports", label: "Weekly Reports", desc: "Receive weekly attendance reports" },
              { key: "monthlyReports", label: "Monthly Reports", desc: "Receive monthly attendance reports" },
            ] as { key: keyof Settings; label: string; desc: string }[]).map(({ key, label, desc }) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{label}</p>
                  <p className="text-sm text-slate-600">{desc}</p>
                </div>
                <Switch
                  checked={settings[key] as boolean}
                  onCheckedChange={() => toggle(key)}
                  disabled={loading || saving}
                  aria-label={label}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-emerald-600" />
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                <p className="text-sm text-slate-600">Add an extra layer of security to your account</p>
              </div>
              <Switch
                checked={settings.twoFactorAuth}
                onCheckedChange={() => toggle("twoFactorAuth")}
                disabled={loading || saving}
                aria-label="Two-factor authentication"
              />
            </div>
            <div className="border-t border-slate-200 pt-4">
              <Button variant="outline" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-indigo-600" />
              <div>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Manage your data and storage</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">
                Data Retention Policy
              </label>
              <select
                value={settings.dataRetention}
                onChange={(e) => setRetention(e.target.value)}
                disabled={loading || saving}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="3months">3 months</option>
                <option value="6months">6 months</option>
                <option value="12months">12 months</option>
                <option value="24months">24 months</option>
                <option value="forever">Forever</option>
              </select>
            </div>
            <div className="border-t border-slate-200 pt-4">
              <Button variant="outline" className="w-full">
                Download My Data
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-red-600" />
              <div>
                <CardTitle className="text-red-900">Danger Zone</CardTitle>
                <CardDescription className="text-red-700">Irreversible actions</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-red-600 hover:bg-red-700">Delete Account</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
