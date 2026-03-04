"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (!formData.name || !formData.email || !formData.password) {
        setError("Please fill in all fields");
        setLoading(false);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.name,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Signup failed");
        setLoading(false);
        return;
      }

      setSuccess("Signup successful. Check your email to verify your account.");
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  const passwordStrength =
    formData.password.length >= 8
      ? formData.password.match(/[A-Z]/) && formData.password.match(/[0-9]/)
        ? "strong"
        : "medium"
      : "weak";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="marketing-shell flex min-h-[calc(100vh-64px)] items-center justify-center py-10">
        <div className="glass-card w-full max-w-md p-6 sm:p-7">
          <div className="mb-7 text-center">
            <h1 className="text-3xl font-semibold text-slate-900">Create your account</h1>
            <p className="mt-2 text-sm text-slate-600">Set up your workspace and start tracking attendance.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-800">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-semibold text-slate-800">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 pr-11 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.password && (
                <div className="mt-2">
                  <div className="mb-1 flex gap-1">
                    <div
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "weak" || passwordStrength === "medium" || passwordStrength === "strong"
                          ? "bg-rose-500"
                          : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "medium" || passwordStrength === "strong" ? "bg-amber-500" : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "strong" ? "bg-emerald-500" : "bg-slate-200"
                      }`}
                    />
                  </div>
                  <p className="text-xs capitalize text-slate-500">{passwordStrength} password</p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-800">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                required
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input type="checkbox" className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600" required />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-semibold text-sky-700 hover:text-sky-800">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="font-semibold text-sky-700 hover:text-sky-800">
                  Privacy Policy
                </Link>
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || formData.password !== formData.confirmPassword}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-sky-700 hover:text-sky-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
