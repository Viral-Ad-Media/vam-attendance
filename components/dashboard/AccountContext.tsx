// File: components/dashboard/AccountContext.tsx
"use client";
import * as React from "react";

type AccountCtx = {
  accountId: string;        // "all" or specific id
  accountLabel: string;     // "All Accounts" or name
  setAccount: (id: string, label: string) => void;
};

const Ctx = React.createContext<AccountCtx | null>(null);

function readCookie(name: string) {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1]) : null;
}

function writeCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${secure}`;
}

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accountId, setAccountId] = React.useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return readCookie("vam_active_org") || localStorage.getItem("vam.account") || "all";
  });

  const [accountLabel, setAccountLabel] = React.useState<string>(() => {
    if (typeof window === "undefined") return "All Accounts";
    return readCookie("vam_active_org_name") || localStorage.getItem("vam.account_label") || "All Accounts";
  });

  // Sync from broadcast events
  React.useEffect(() => {
    const onAcc = ((e: Event) => {
      const d = (e as CustomEvent).detail as { account?: string; account_label?: string } | undefined;
      if (d?.account) setAccountId(d.account);
      if (d?.account_label) setAccountLabel(d.account_label);
    }) as EventListener;
    window.addEventListener("vam:set-account", onAcc);
    return () => window.removeEventListener("vam:set-account", onAcc);
  }, []);

  // Persist choice into cookie + local storage for consistency
  const setAccount = React.useCallback((id: string, label: string) => {
    setAccountId(id);
    setAccountLabel(label);
    try {
      localStorage.setItem("vam.account", id);
      localStorage.setItem("vam.account_label", label);
    } catch {}
    writeCookie("vam_active_org", id);
    writeCookie("vam_active_org_name", label);
    window.dispatchEvent(new CustomEvent("vam:set-account", {
      detail: { account: id, account_label: label },
    }));
  }, []);

  return (
    <Ctx.Provider value={{ accountId, accountLabel, setAccount }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAccount() {
  const v = React.useContext(Ctx);
  if (!v) throw new Error("useAccount must be used within <AccountProvider>");
  return v;
}
