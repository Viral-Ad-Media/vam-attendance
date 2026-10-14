import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BarChart3, CheckCircle2, Clock, Shield, Users, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { CtaBand } from "@/components/marketing/CtaBand";

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
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: BarChart3,
    title: "Actionable reports",
    description: "Spot trends and follow up quickly with structured attendance analytics.",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Users,
    title: "Team-ready workflows",
    description: "Coordinate teachers, courses, and classes from one clean workspace.",
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: Zap,
    title: "Fast operations",
    description: "Keep sessions moving with low-friction forms and quick shortcuts.",
    tone: "bg-amber-50 text-amber-600",
  },
  {
    icon: Shield,
    title: "Secure by design",
    description: "Protect attendance records with role-aware access and robust auth.",
    tone: "bg-teal-50 text-teal-600",
  },
  {
    icon: CheckCircle2,
    title: "Simple onboarding",
    description: "Start with your current roster and move your team in without friction.",
    tone: "bg-blue-50 text-blue-600",
  },
];

const steps = [
  {
    title: "Set up your workspace",
    description: "Add courses, teachers, and students — or import your current roster.",
  },
  {
    title: "Schedule and mark sessions",
    description: "Put classes on the calendar and record attendance in a couple of clicks.",
  },
  {
    title: "Follow up with confidence",
    description: "Spot at-risk students and review trends before small gaps become big ones.",
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
                className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/features"
                className="inline-flex h-11 items-center rounded-lg border border-white/30 bg-white/10 px-5 text-sm font-semibold text-white transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
              <article key={feature.title} className="glass-card card-hover p-6">
                <span className={`icon-chip ${feature.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-white/60">
        <div className="marketing-shell marketing-section">
          <div className="mb-10 text-center">
            <span className="section-eyebrow">How it works</span>
            <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">From roster to insight in three steps</h2>
          </div>
          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, index) => (
              <li key={step.title} className="relative rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <div className="pt-16 sm:pt-20 lg:pt-24">
        <CtaBand
          title="Ready for a cleaner attendance workflow?"
          description="Launch in minutes and give your team a dashboard that is easier to read and faster to use."
          primary={{ label: "Create Account", href: "/signup" }}
        />
      </div>

      <Footer />
    </div>
  );
}
