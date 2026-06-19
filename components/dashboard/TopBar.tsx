// File: components/dashboard/TopBar.tsx
"use client";

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { useAccount } from "@/components/dashboard/AccountContext";

export function TopBar({
  title, subtitle,
  showAccountInTitle = true,
  showAccountIdInSubtitle = true,
}: {
  title?: string; subtitle?: string;
  showAccountInTitle?: boolean; showAccountIdInSubtitle?: boolean;
}) {
  const { accountId, accountLabel } = useAccount();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const computedTitle = showAccountInTitle
    ? (mounted ? (accountLabel || "All Accounts") : "All Accounts")
    : (title ?? "Welcome back");

  const computedSubtitle = showAccountIdInSubtitle
    ? (mounted ? (accountId === "all" ? "All Accounts" : `Account ID: ${accountId}`) : "All Accounts")
    : (subtitle ?? "Dashboard");

  const initials = React.useMemo(() => {
    const s = (accountLabel || "Viral Ad Media").trim();
    const parts = s.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]?.toUpperCase() ?? "").join("") || "VA";
  }, [accountLabel]);

  const onLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      console.error(e);
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="sticky top-0 z-20 -mx-3 border-b border-slate-200 bg-slate-50/95 backdrop-blur sm:-mx-5 lg:-mx-7">
      <div className="flex flex-wrap items-center gap-3 px-3 py-3 sm:flex-nowrap sm:px-5 lg:px-7">
        {/* Left: Title / Subtitle */}
        <div className="min-w-0 flex-1">
          <div className="text-xs font-medium text-slate-500">
            <span suppressHydrationWarning>{computedSubtitle}</span>
          </div>
          <h1 className="truncate text-lg font-semibold text-slate-900 sm:text-2xl">
            <span suppressHydrationWarning>{computedTitle}</span>
          </h1>
        </div>

        {/* Right: Profile menu only (thresholds moved to ControlsBar) */}
        <div className="w-full sm:w-auto sm:ml-auto flex items-center justify-between sm:justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Open profile menu"
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg border border-slate-200",
                  "w-full justify-between bg-white px-2.5 py-1.5 text-slate-700 shadow-sm transition hover:bg-slate-50 sm:w-auto sm:justify-center"
                )}
              >
                <Avatar className="h-7 w-7">
                  <AvatarImage src="/avatar.png" alt="Profile" />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 text-slate-500" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem asChild>
                <a href="/dashboard/profile" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Profile
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="/dashboard/settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" /> Account Settings
                </a>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onLogout}
                className="flex items-center gap-2 text-red-600 focus:text-red-700"
              >
                <LogOut className="h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
