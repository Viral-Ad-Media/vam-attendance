import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { CtaBand } from "@/components/marketing/CtaBand";
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
    tone: "bg-primary/10 text-primary",
  },
  {
    icon: BarChart3,
    title: "Insightful reporting",
    description: "Review trends, anomalies, and attendance health across classes.",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Users,
    title: "Multi-role access",
    description: "Support admins, teachers, and operational teams in one workspace.",
    tone: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: Zap,
    title: "Fast workflows",
    description: "Keep daily operations quick with low-friction UI and shortcuts.",
    tone: "bg-amber-50 text-amber-600",
  },
  {
    icon: Shield,
    title: "Secure platform",
    description: "Protect records with role-based controls and account safeguards.",
    tone: "bg-teal-50 text-teal-600",
  },
  {
    icon: Plug,
    title: "Easy integrations",
    description: "Fit into your existing process without changing your entire stack.",
    tone: "bg-blue-50 text-blue-600",
  },
  {
    icon: Download,
    title: "Export tools",
    description: "Export attendance data for reports, audits, and external sharing.",
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: Lock,
    title: "Permission controls",
    description: "Manage who can view, edit, and administer sensitive attendance data.",
    tone: "bg-slate-100 text-slate-700",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <PageHero
        eyebrow="Operational toolkit"
        title="Everything your team needs, nothing they do not"
        description="VAM Attendance focuses on clear operations, reliable data capture, and readable reporting for day-to-day academic workflows."
      />

      <section className="marketing-shell py-14 sm:py-16 lg:py-20">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="glass-card card-hover p-6">
                <span className={`icon-chip ${feature.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-slate-900">{feature.title}</h2>
                <p className="mt-2 text-sm text-slate-600">{feature.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <CtaBand />

      <Footer />
    </div>
  );
}
