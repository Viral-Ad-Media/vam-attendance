import Link from "next/link";
import { BarChart3, CheckCircle2, Clock, Shield, Users, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "VAM Attendance - Attendance Management Made Easy",
  description:
    "Track student and teacher attendance with real-time insights, detailed reports, and seamless integration.",
};

const features = [
  {
    icon: Clock,
    title: "Real-time tracking",
    description: "Record attendance in seconds and keep everyone synced across devices.",
    tone: "text-sky-600",
  },
  {
    icon: BarChart3,
    title: "Actionable reports",
    description: "Spot trends and follow up quickly with structured attendance analytics.",
    tone: "text-emerald-600",
  },
  {
    icon: Users,
    title: "Team-ready workflows",
    description: "Coordinate teachers, courses, and classes from one clean workspace.",
    tone: "text-indigo-600",
  },
  {
    icon: Zap,
    title: "Fast operations",
    description: "Keep sessions moving with low-friction forms and quick shortcuts.",
    tone: "text-amber-600",
  },
  {
    icon: Shield,
    title: "Secure by design",
    description: "Protect attendance records with role-aware access and robust auth.",
    tone: "text-teal-600",
  },
  {
    icon: CheckCircle2,
    title: "Simple onboarding",
    description: "Start with your current roster and move your team in without friction.",
    tone: "text-blue-600",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="marketing-shell marketing-section">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="mb-4 inline-flex items-center rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
              Attendance workflow
            </span>
            <h1 className="soft-title">
              Modern attendance management that your team can read and use fast.
            </h1>
            <p className="soft-subtitle mt-5 max-w-xl">
              VAM Attendance gives educators a cleaner dashboard for tracking sessions, marking attendance,
              and finding trends without clutter.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Start Free Trial
              </Link>
              <Link
                href="/features"
                className="inline-flex h-11 items-center rounded-xl border border-slate-300 bg-white/85 px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                Explore Features
              </Link>
            </div>
          </div>

          <div className="glass-card p-5 sm:p-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">Today</p>
                  <p className="text-lg font-semibold text-slate-900">Attendance Snapshot</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                  Live
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Students</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">320</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Present</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">289</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-slate-500">Rate</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-900">90%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-shell pb-16 sm:pb-20 lg:pb-24">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Built for clarity and speed</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-600">
            Every screen focuses on fewer clicks, cleaner data entry, and better readability for busy teams.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="glass-card p-5">
                <Icon className={`h-8 w-8 ${feature.tone}`} />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="marketing-shell pb-16 sm:pb-20 lg:pb-24">
        <div className="rounded-3xl bg-slate-900 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-3xl font-semibold sm:text-4xl">Ready for a cleaner attendance workflow?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-200">
            Launch in minutes and give your team a dashboard that is easier to read and faster to use.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Create Account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
