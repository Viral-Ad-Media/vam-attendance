"use client";

// File: app/dashboard/layout.tsx
import * as React from "react";
import { AccountProvider } from "@/components/dashboard/AccountContext";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Provide account context to BOTH sidebar and pages */}
      <AccountProvider>
        {/* Mobile nav trigger */}
        <button
          type="button"
          className="fixed left-3 top-3 z-30 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-sm font-medium text-slate-700 shadow-sm backdrop-blur transition hover:-translate-y-[1px] hover:shadow-md lg:hidden"
          onClick={() => setMobileNavOpen(true)}
        >
          <Menu className="h-4 w-4" />
          Menu
        </button>

        {/* Mobile drawer */}
        <div
          className={cn(
            "fixed inset-0 z-40 lg:hidden transition",
            mobileNavOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          <div
            className={cn(
              "absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity",
              mobileNavOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setMobileNavOpen(false)}
          />
          <div
            className={cn(
              "absolute left-0 top-0 h-full w-[280px] max-w-[85vw] transform transition-transform duration-200",
              mobileNavOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <Sidebar variant="mobile" onNavigate={() => setMobileNavOpen(false)} onClose={() => setMobileNavOpen(false)} />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-[1600px]">
          {/* Minimal, slim sidebar */}
          <aside className="hidden shrink-0 border-r border-slate-200 bg-white/70 backdrop-blur lg:block">
            <Sidebar />
          </aside>

          {/* Content with slightly tighter gutters (but still breathing) */}
          <main className="flex-1 min-w-0 px-3 pb-6 pt-14 sm:px-5 lg:px-7 lg:pt-4">
            {/* Thresholds state for TopBar menu + tables/charts */}
            
              {children}
        
          </main>
        </div>
      </AccountProvider>
    </div>
  );
}
