"use client";

import Link from "next/link";
import { useState } from "react";
import { Header } from "@/components/layout/Header";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Unable to send reset link");
        return;
      }
      setMessage(data.message || "Check your email for the password setup link.");
    } catch {
      setError("Unable to send reset link. Please try again.");
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
            <h1 className="text-3xl font-semibold text-slate-900">Reset your password</h1>
            <p className="mt-2 text-sm text-slate-600">We will email you a secure link to set a new password.</p>
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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Sending link..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
