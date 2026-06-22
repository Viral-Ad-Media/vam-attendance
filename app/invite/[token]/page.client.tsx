"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { AlertCircle, CheckCircle2, Loader } from "lucide-react";

type InviteStatus = "loading" | "valid" | "invalid" | "expired" | "error";

type InviteData = {
  id: string;
  email: string;
  role: string;
  org_id: string;
  organization?: {
    name: string;
  };
};

export default function AcceptInvitePage({ token }: { token: string }) {
  const router = useRouter();
  const [status, setStatus] = React.useState<InviteStatus>("loading");
  const [invite, setInvite] = React.useState<InviteData | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [accepting, setAccepting] = React.useState(false);

  React.useEffect(() => {
    const validateInvite = async () => {
      try {
        const response = await fetch(`/api/invite/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const data = await response.json();
          const errorMsg = data.error || "Invalid invite";
          if (errorMsg.toLowerCase().includes("expired")) {
            setStatus("expired");
          } else if (errorMsg.toLowerCase().includes("not found")) {
            setStatus("invalid");
          } else {
            setError(errorMsg);
            setStatus("error");
          }
          return;
        }

        const data = (await response.json()) as InviteData;
        setInvite(data);
        setStatus("valid");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to validate invite");
        setStatus("error");
      }
    };

    validateInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!invite) return;

    try {
      setAccepting(true);
      const response = await fetch(`/api/invite/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to accept invite");
      }

      // Redirect to dashboard
      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to accept invite");
      setAccepting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="marketing-shell flex min-h-[calc(100vh-64px)] items-center justify-center py-10">
        <div className="glass-card w-full max-w-md p-6 sm:p-7">
          {status === "loading" && (
            <div className="text-center">
              <Loader className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-slate-600">Validating invitation...</p>
            </div>
          )}

          {status === "valid" && invite && !accepting && (
            <>
              <div className="mb-6 text-center">
                <CheckCircle2 className="mx-auto mb-4 h-8 w-8 text-emerald-600" />
                <h1 className="text-2xl font-semibold text-slate-900">You're invited!</h1>
                <p className="mt-2 text-sm text-slate-600">
                  {invite.organization?.name || "An organization"} invited you to join their workspace.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 mb-6 space-y-2">
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">Email:</span> {invite.email}
                </p>
                <p className="text-sm text-slate-600">
                  <span className="font-medium text-slate-900">Role:</span> {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                </p>
              </div>

              <button
                onClick={handleAccept}
                disabled={accepting}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:brightness-105 disabled:opacity-60"
              >
                {accepting ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  "Accept invitation"
                )}
              </button>

              <p className="mt-4 text-center text-sm text-slate-600">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-primary hover:brightness-90">
                  Sign in
                </Link>
              </p>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="mb-6 text-center">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-amber-600" />
                <h1 className="text-2xl font-semibold text-slate-900">Invitation expired</h1>
                <p className="mt-2 text-sm text-slate-600">
                  This invitation has expired. Please ask the organization to send you a new one.
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Return to login
              </Link>
            </>
          )}

          {status === "invalid" && (
            <>
              <div className="mb-6 text-center">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-600" />
                <h1 className="text-2xl font-semibold text-slate-900">Invalid invitation</h1>
                <p className="mt-2 text-sm text-slate-600">
                  This invitation link is not valid or has already been used.
                </p>
              </div>

              <Link
                href="/login"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Return to login
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-6 text-center">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-red-600" />
                <h1 className="text-2xl font-semibold text-slate-900">Error</h1>
                <p className="mt-2 text-sm text-red-600">{error}</p>
              </div>

              <Link
                href="/"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:brightness-105"
              >
                Go to home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
