"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { Header } from "@/components/layout/Header";
import { getBrowserSupabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => getBrowserSupabase(), []);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!supabase) {
      setError("Authentication client is not configured.");
      setCheckingLink(false);
      return;
    }

    let active = true;
    const init = async () => {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!active) return;

      if (sessionError) {
        setError("Invalid or expired password link. Request a new one.");
      } else {
        setLinkReady(Boolean(data.session));
      }
      setCheckingLink(false);
    };

    init();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (!active) return;
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setLinkReady(Boolean(session));
          setError("");
          setCheckingLink(false);
        }
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!linkReady || !supabase) {
      setError("This password link is not active. Request a new one.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message || "Failed to update password");
        return;
      }

      setMessage("Password updated successfully. Redirecting to login...");
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setError("Unable to update password. Try the link again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="marketing-shell flex min-h-[calc(100vh-64px)] items-center justify-center py-10">
        <div className="glass-card w-full max-w-md p-6 sm:p-7">
          <div className="mb-7 text-center">
            <h1 className="text-3xl font-semibold text-slate-900">Set a new password</h1>
            <p className="mt-2 text-sm text-slate-600">Choose a strong password for your account.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {message}
            </div>
          )}

          {checkingLink ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              Validating your password link...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                  New Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-800">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || !linkReady}
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {loading ? "Updating password..." : "Update password"}
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-slate-600">
            Need a new link?{" "}
            <Link href="/forgot-password" className="font-semibold text-sky-700 hover:text-sky-800">
              Request reset email
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
