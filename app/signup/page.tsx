"use client";

import { Header } from "@/components/layout/Header";
import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, Check } from "lucide-react";
import { useRouter } from "next/navigation";

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
    setLoading(true);

    try {
      // Validate form
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

      // Call signup API
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

      // Success - show confirmation message and redirect
      alert("Signup successful! Please check your email to verify your account.");
      setFormData({ name: "", email: "", password: "", confirmPassword: "" });
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
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
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Create your account</h1>
            <p className="text-slate-600">Join thousands of educators using VAM Attendance</p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-2">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600 focus:border-transparent"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
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
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange}
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

              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="mt-2 text-xs">
                  <div className="flex gap-1 mb-1">
                    <div
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "weak" || passwordStrength === "medium" || passwordStrength === "strong"
                          ? "bg-red-500"
                          : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "medium" || passwordStrength === "strong"
                          ? "bg-yellow-500"
                          : "bg-slate-200"
                      }`}
                    />
                    <div
                      className={`h-1 flex-1 rounded-full ${
                        passwordStrength === "strong" ? "bg-green-500" : "bg-slate-200"
                      }`}
                    />
                  </div>
                  <p className="text-slate-600 capitalize">{passwordStrength} password</p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-900 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600 focus:border-transparent"
                required
              />
            </div>

            {/* Terms & Conditions */}
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1" required />
              <span className="text-sm text-slate-600">
                I agree to the{" "}
                <Link href="/terms" className="text-fuchsia-600 hover:text-fuchsia-700">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-fuchsia-600 hover:text-fuchsia-700">
                  Privacy Policy
                </Link>
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || formData.password !== formData.confirmPassword}
              className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create Account"}
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

          {/* Social Signup */}
          <div className="grid grid-cols-2 gap-4">
            <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium text-slate-900">
              Google
            </button>
            <button className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium text-slate-900">
              GitHub
            </button>
          </div>

          {/* Login link */}
          <p className="text-center text-slate-600 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-fuchsia-600 hover:text-fuchsia-700 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
