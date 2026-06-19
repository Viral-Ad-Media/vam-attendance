import Link from "next/link";
import Image from "next/image";
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
    tone: "text-primary",
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

      <section className="relative h-[calc(100svh-96px)] min-h-[500px] max-h-[760px] overflow-hidden border-b border-slate-200 bg-slate-950">
        <Image
          src="/attendance-dashboard-hero.png"
          alt="Attendance dashboard shown on a laptop"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-slate-950/58" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.82),rgba(2,6,23,0.56)_42%,rgba(2,6,23,0.2)_100%)]" />
        <div className="marketing-shell relative flex h-full items-center">
          <div className="max-w-2xl py-10 text-white">
            <span className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              Attendance workflow
            </span>
            <h1 className="text-5xl font-semibold leading-none sm:text-6xl lg:text-7xl">
              VAM Attendance
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-100 sm:text-lg">
              A clearer operating system for classes, coaches, enrollments, and attendance history.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
              >
                Start Free Trial
              </Link>
              <Link
                href="/features"
                className="inline-flex h-11 items-center rounded-lg border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Explore Features
              </Link>
            </div>
            <div className="mt-8 grid max-w-xl grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-2xl font-semibold">Live</p>
                <p className="text-slate-200">session status</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">1-click</p>
                <p className="text-slate-200">attendance logs</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">Full</p>
                <p className="text-slate-200">student history</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="marketing-shell py-14 sm:py-18 lg:py-20">
        <div className="mb-8 text-center">
          <span className="section-eyebrow">Operational clarity</span>
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
        <div className="rounded-lg bg-slate-950 px-6 py-10 text-center text-white sm:px-10">
          <h2 className="text-3xl font-semibold sm:text-4xl">Ready for a cleaner attendance workflow?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-200">
            Launch in minutes and give your team a dashboard that is easier to read and faster to use.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            Create Account
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
