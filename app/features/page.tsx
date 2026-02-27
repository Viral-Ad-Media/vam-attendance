import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, BarChart3, Users, Zap, Shield, Plug, Download, Lock } from "lucide-react";

export const metadata = {
  title: "Features - VAM Attendance",
  description: "Explore the powerful features of VAM Attendance system.",
};

const features = [
  {
    icon: Clock,
    title: "Real-Time Tracking",
    description: "Mark attendance instantly with real-time synchronization across all devices.",
    color: "text-fuchsia-600",
  },
  {
    icon: BarChart3,
    title: "Detailed Reports",
    description: "Generate comprehensive attendance reports with trends and analytics.",
    color: "text-cyan-600",
  },
  {
    icon: Users,
    title: "Multi-User Support",
    description: "Manage multiple classes, teachers, and students from one platform.",
    color: "text-purple-600",
  },
  {
    icon: Zap,
    title: "Fast & Reliable",
    description: "Built for performance with 99.9% uptime guarantee.",
    color: "text-yellow-600",
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Enterprise-grade security with end-to-end encryption.",
    color: "text-green-600",
  },
  {
    icon: Plug,
    title: "Easy Integration",
    description: "Seamlessly integrate with your existing systems and tools.",
    color: "text-blue-600",
  },
  {
    icon: Download,
    title: "Data Export",
    description: "Export data in multiple formats (CSV, Excel, PDF).",
    color: "text-indigo-600",
  },
  {
    icon: Lock,
    title: "Access Control",
    description: "Fine-grained permissions and role-based access control.",
    color: "text-red-600",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Powerful Features for Every Need
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Everything you need to manage attendance efficiently, from real-time tracking to detailed analytics.
          </p>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="hover:shadow-lg transition">
                  <CardContent className="pt-6">
                    <Icon className={`h-10 w-10 ${feature.color} mb-4`} />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
