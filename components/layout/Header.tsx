"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [loggedIn, setLoggedIn] = React.useState(false);

  // Close the mobile menu when the route changes
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Heuristic auth check (cookies/localStorage flags)
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const hasSupabaseCookie = document.cookie.includes("sb-") || document.cookie.includes("vam_active_org");
    const stored = (() => {
      try {
        return localStorage.getItem("vam.account") || localStorage.getItem("vam_active_org");
      } catch {
        return null;
      }
    })();
    setLoggedIn(Boolean(hasSupabaseCookie || stored));
  }, []);

  const isActive = (href: string) => {
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navItems = [
    { href: "/", label: "Home" },
    { href: "/features", label: "Features" },
    { href: "/pricing", label: "Pricing" },
    { href: "/about", label: "About" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg min-w-0">
          <div className="h-8 w-8 rounded-md bg-gradient-to-r from-fuchsia-600 to-cyan-600" />
          <span className="hidden sm:inline truncate">VAM Attendance</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-slate-100 text-slate-900"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* CTA Buttons + Mobile Toggle */}
        <div className="flex items-center gap-2">
          {!loggedIn && (
            <>
              <Link
                href="/login"
                className="hidden sm:inline-flex px-3 py-2 rounded-md text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="hidden xs:inline-flex px-3 py-2 rounded-md text-sm font-medium bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white hover:opacity-90 transition"
              >
                Get Started
              </Link>
            </>
          )}

          {loggedIn && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden sm:inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-sm hover:bg-slate-50">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatar.png" alt="Profile" />
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-slate-800">Account</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">Account settings</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={async () => {
                    try {
                      await fetch("/api/auth/logout", { method: "POST" });
                    } catch {}
                    window.location.href = "/login";
                  }}
                  className="text-red-600 focus:text-red-700"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md hover:bg-slate-100"
            aria-label="Toggle navigation"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-3 shadow-md">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                {item.label}
              </Link>
            ))}
            {!loggedIn && (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-center shadow-sm"
                >
                  Get Started
                </Link>
              </div>
            )}
            {loggedIn && (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-4 py-2 rounded-md text-sm font-medium text-slate-900 hover:bg-slate-50"
                >
                  Account settings
                </Link>
                <button
                  onClick={async () => {
                    try {
                      await fetch("/api/auth/logout", { method: "POST" });
                    } catch {}
                    window.location.href = "/login";
                  }}
                  className="px-4 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 text-left"
                >
                  Logout
                </button>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
