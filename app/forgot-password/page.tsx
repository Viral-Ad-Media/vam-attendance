"use client";

import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { useState } from "react";

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
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-slate-900">Reset your password</h1>
            <p className="text-slate-600">We will email you a secure link to set a new password.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              {message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-900">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-fuchsia-600 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 px-4 py-2 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Send reset link"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Remembered your password?{" "}
            <Link href="/login" className="font-semibold text-fuchsia-600 hover:text-fuchsia-700">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
