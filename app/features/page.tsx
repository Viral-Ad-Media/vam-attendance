import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BarChart3, Clock, Download, Lock, Plug, Shield, Users, Zap } from "lucide-react";

export const metadata = {
  title: "Features - VAM Attendance",
  description: "Explore the powerful features of VAM Attendance system.",
};

const features = [
  {
    icon: Clock,
    title: "Real-time tracking",
    description: "Mark attendance from web and keep records instantly synchronized.",
    tone: "text-sky-600",
  },
  {
    icon: BarChart3,
    title: "Insightful reporting",
    description: "Review trends, anomalies, and attendance health across classes.",
    tone: "text-emerald-600",
  },
  {
    icon: Users,
    title: "Multi-role access",
    description: "Support admins, teachers, and operational teams in one workspace.",
    tone: "text-indigo-600",
  },
  {
    icon: Zap,
    title: "Fast workflows",
    description: "Keep daily operations quick with low-friction UI and shortcuts.",
    tone: "text-amber-600",
  },
  {
    icon: Shield,
    title: "Secure platform",
    description: "Protect records with role-based controls and account safeguards.",
    tone: "text-teal-600",
  },
  {
    icon: Plug,
    title: "Easy integrations",
    description: "Fit into your existing process without changing your entire stack.",
    tone: "text-blue-600",
  },
  {
    icon: Download,
    title: "Export tools",
    description: "Export attendance data for reports, audits, and external sharing.",
    tone: "text-emerald-600",
  },
  {
    icon: Lock,
    title: "Permission controls",
    description: "Manage who can view, edit, and administer sensitive attendance data.",
    tone: "text-slate-700",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="marketing-shell marketing-section text-center">
        <h1 className="soft-title">Everything your team needs, nothing they do not</h1>
        <p className="soft-subtitle mx-auto mt-4 max-w-3xl">
          VAM Attendance focuses on clear operations, reliable data capture, and readable reporting
          for day-to-day academic workflows.
        </p>
      </section>

      <section className="marketing-shell pb-16 sm:pb-20 lg:pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="glass-card p-5">
                <Icon className={`h-8 w-8 ${feature.tone}`} />
                <h2 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
