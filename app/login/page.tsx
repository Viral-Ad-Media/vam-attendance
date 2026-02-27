"use client";

import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Validation
    if (!email || !password) {
      setError("Please fill in all fields");
      setLoading(false);
      return;
    }

    if (email.length < 3 || !email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to sign in. Please check your credentials.");
        setLoading(false);
        return;
      }

      const role =
        data.user?.app_metadata?.role ||
        data.user?.user_metadata?.role ||
        data.user?.app_metadata?.roles?.[0] ||
        "";

      // Redirect to teacher dashboard if teacher role, otherwise main dashboard
      if (role === "teacher") {
        router.push("/dashboard/teacher");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h1>
            <p className="text-slate-600">Sign in to your attendance dashboard</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600 focus:border-transparent"
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-900 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                <span className="text-slate-600">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-fuchsia-600 hover:text-fuchsia-700">
                Forgot password?
              </Link>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-slate-500">Or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-2 gap-4">
            <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium text-slate-900">
              Google
            </button>
            <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium text-slate-900">
              GitHub
            </button>
          </div>

          {/* Sign up link */}
          <p className="text-center text-slate-600 mt-6">
            Don't have an account?{" "}
            <Link href="/signup" className="text-fuchsia-600 hover:text-fuchsia-700 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
