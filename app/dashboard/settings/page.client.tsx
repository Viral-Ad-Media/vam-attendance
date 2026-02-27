// app/dashboard/settings/page.client.tsx
"use client";

import { TopBar } from "@/components/dashboard/TopBar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Bell, Lock, Eye, Database, Trash2 } from "lucide-react";

interface Settings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyReports: boolean;
  monthlyReports: boolean;
  dataRetention: string;
  twoFactorAuth: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    emailNotifications: true,
    pushNotifications: false,
    weeklyReports: true,
    monthlyReports: true,
    dataRetention: "12months",
    twoFactorAuth: false,
  });

  const handleToggle = (key: keyof Settings) => {
    const value = settings[key];
    if (typeof value === "boolean") {
      setSettings({
        ...settings,
        [key]: !value,
      });
    }
  };

  return (
    <div className="w-full">
      <TopBar title="Settings" subtitle="Settings" />

      <div className="space-y-6 max-w-3xl">
        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-fuchsia-600" />
              <div>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage how you receive updates</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Email Notifications</p>
                <p className="text-sm text-slate-600">Receive notifications via email</p>
              </div>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={() => handleToggle("emailNotifications")}
                className="h-4 w-4 cursor-pointer"
              />
            </div>

            <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Push Notifications</p>
                <p className="text-sm text-slate-600">Get push notifications on your devices</p>
              </div>
              <input
                type="checkbox"
                checked={settings.pushNotifications}
                onChange={() => handleToggle("pushNotifications")}
                className="h-4 w-4 cursor-pointer"
              />
            </div>

            <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Weekly Reports</p>
                <p className="text-sm text-slate-600">Receive weekly attendance reports</p>
              </div>
              <input
                type="checkbox"
                checked={settings.weeklyReports}
                onChange={() => handleToggle("weeklyReports")}
                className="h-4 w-4 cursor-pointer"
              />
            </div>

            <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Monthly Reports</p>
                <p className="text-sm text-slate-600">Receive monthly attendance reports</p>
              </div>
              <input
                type="checkbox"
                checked={settings.monthlyReports}
                onChange={() => handleToggle("monthlyReports")}
                className="h-4 w-4 cursor-pointer"
              />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-cyan-600" />
              <div>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                <p className="text-sm text-slate-600">
                  Add an extra layer of security to your account
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.twoFactorAuth}
                onChange={() => handleToggle("twoFactorAuth")}
                className="h-4 w-4 cursor-pointer"
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

        {/* Data Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-purple-600" />
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
                onChange={(e) =>
                  setSettings({ ...settings, dataRetention: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600"
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

        {/* Danger Zone */}
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trash2 className="h-5 w-5 text-red-600" />
              <div>
                <CardTitle className="text-red-900">Danger Zone</CardTitle>
                <CardDescription className="text-red-700">
                  Irreversible actions
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button className="w-full bg-red-600 hover:bg-red-700">
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
