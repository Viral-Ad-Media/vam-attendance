import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { Check, BarChart3, Users, Clock, Zap, Shield } from "lucide-react";

export const metadata = {
  title: "VAM Attendance - Attendance Management Made Easy",
  description: "Track student and teacher attendance with real-time insights, detailed reports, and seamless integration.",
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="relative px-4 py-24 sm:px-6 sm:py-32 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-200 bg-fuchsia-50 px-4 py-2 mb-8">
              <span className="h-2 w-2 rounded-full bg-fuchsia-600" />
              <span className="text-sm font-medium text-fuchsia-900">
                Attendance tracking made simple
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Attendance Management
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-600 via-purple-600 to-cyan-600">
                Made Simple
              </span>
            </h1>

            <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
              Track attendance in real-time, generate instant reports, and gain actionable insights
              to improve student engagement and institutional performance.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/signup"
                className="px-8 py-3 rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-semibold hover:opacity-90 transition"
              >
                Start Free Trial
              </Link>
              <Link
                href="#features"
                className="px-8 py-3 rounded-lg border border-slate-300 text-slate-900 font-semibold hover:bg-slate-50 transition"
              >
                Learn More
              </Link>
            </div>

            {/* Screenshot/Demo area */}
            <div className="mx-auto max-w-4xl">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-6 shadow-lg">
                <div className="aspect-video bg-gradient-to-br from-slate-200 to-slate-300 rounded-md flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <p className="text-slate-600">Dashboard Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
              Powerful Features for Educators
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need to manage attendance efficiently and effectively.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition">
              <Clock className="h-8 w-8 text-fuchsia-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Real-Time Tracking</h3>
              <p className="text-slate-600">
                Mark attendance instantly with a simple click. Updates are synchronized across all devices.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition">
              <BarChart3 className="h-8 w-8 text-cyan-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Detailed Reports</h3>
              <p className="text-slate-600">
                Generate comprehensive reports with attendance rates, trends, and student-wise analytics.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition">
              <Users className="h-8 w-8 text-purple-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Multi-User Support</h3>
              <p className="text-slate-600">
                Manage multiple classes and students. Perfect for schools and educational institutions.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition">
              <Zap className="h-8 w-8 text-yellow-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Fast & Reliable</h3>
              <p className="text-slate-600">
                Built for performance. Load data instantly and never worry about downtime or delays.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition">
              <Shield className="h-8 w-8 text-green-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Secure & Private</h3>
              <p className="text-slate-600">
                Enterprise-grade security. Your data is encrypted and protected with industry best practices.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition">
              <Check className="h-8 w-8 text-blue-600 mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Easy Integration</h3>
              <p className="text-slate-600">
                Import data from CSV, Excel, or integrate with your existing systems seamlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-fuchsia-600 to-cyan-600">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Simplify Attendance Management?
          </h2>
          <p className="text-lg text-fuchsia-100 mb-8">
            Join thousands of educators who are already using VAM Attendance to save time and improve accuracy.
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-3 rounded-lg bg-white text-fuchsia-600 font-semibold hover:bg-fuchsia-50 transition"
          >
            Start Your Free Trial
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
