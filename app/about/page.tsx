import { Award, Target, Users, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { CtaBand } from "@/components/marketing/CtaBand";

export const metadata = {
  title: "About VAM Attendance",
  description: "Learn about VAM Attendance and our mission to simplify attendance management.",
};

const values = [
  { icon: Users, title: "User-centered", description: "We optimize around real classroom workflows.", tone: "bg-primary/10 text-primary" },
  { icon: Target, title: "Reliable", description: "Consistency matters when schools depend on records.", tone: "bg-emerald-50 text-emerald-600" },
  { icon: Award, title: "Quality-first", description: "Clear interfaces and predictable behavior by default.", tone: "bg-indigo-50 text-indigo-600" },
  { icon: Zap, title: "Always improving", description: "We keep refining speed, clarity, and usability.", tone: "bg-amber-50 text-amber-600" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <PageHero
        eyebrow="About the platform"
        title="Built to make attendance operations easier to run"
        description="VAM Attendance was created to give educators and administrators a cleaner way to track participation and act on attendance signals quickly."
      />

      <section className="marketing-shell py-14 sm:py-16 lg:py-20">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="glass-card card-hover border-l-4 border-l-primary p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Our Mission</h2>
            <p className="mt-3 text-slate-600">
              Help institutions run attendance workflows with less friction, clearer visibility,
              and tools that are straightforward for every role.
            </p>
          </article>
          <article className="glass-card card-hover border-l-4 border-l-amber-400 p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Our Vision</h2>
            <p className="mt-3 text-slate-600">
              Become the most trusted attendance platform for modern schools through reliability,
              strong UX, and practical reporting.
            </p>
          </article>
        </div>
      </section>

      <section className="marketing-shell pb-14 sm:pb-16 lg:pb-20">
        <h2 className="text-center text-3xl font-semibold text-slate-900 sm:text-4xl">Core Values</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <article key={value.title} className="glass-card card-hover p-6">
                <span className={`icon-chip ${value.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{value.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{value.description}</p>
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
