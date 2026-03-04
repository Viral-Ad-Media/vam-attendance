import { Award, Target, Users, Zap } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "About VAM Attendance",
  description: "Learn about VAM Attendance and our mission to simplify attendance management.",
};

const values = [
  { icon: Users, title: "User-centered", description: "We optimize around real classroom workflows.", tone: "text-sky-600" },
  { icon: Target, title: "Reliable", description: "Consistency matters when schools depend on records.", tone: "text-emerald-600" },
  { icon: Award, title: "Quality-first", description: "Clear interfaces and predictable behavior by default.", tone: "text-indigo-600" },
  { icon: Zap, title: "Always improving", description: "We keep refining speed, clarity, and usability.", tone: "text-amber-600" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="marketing-shell marketing-section text-center">
        <h1 className="soft-title">Built to make attendance operations easier to run</h1>
        <p className="soft-subtitle mx-auto mt-4 max-w-3xl">
          VAM Attendance was created to give educators and administrators a cleaner way to track
          participation and act on attendance signals quickly.
        </p>
      </section>

      <section className="marketing-shell pb-12 sm:pb-16 lg:pb-20">
        <div className="grid gap-4 lg:grid-cols-2">
          <article className="glass-card p-6">
            <h2 className="text-2xl font-semibold text-slate-900">Our Mission</h2>
            <p className="mt-3 text-slate-600">
              Help institutions run attendance workflows with less friction, clearer visibility,
              and tools that are straightforward for every role.
            </p>
          </article>
          <article className="glass-card p-6">
            <h2 className="text-2xl font-semibold text-slate-900">Our Vision</h2>
            <p className="mt-3 text-slate-600">
              Become the most trusted attendance platform for modern schools through reliability,
              strong UX, and practical reporting.
            </p>
          </article>
        </div>
      </section>

      <section className="marketing-shell pb-16 sm:pb-20 lg:pb-24">
        <h2 className="text-center text-3xl font-semibold text-slate-900 sm:text-4xl">Core Values</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((value) => {
            const Icon = value.icon;
            return (
              <article key={value.title} className="glass-card p-5">
                <Icon className={`h-8 w-8 ${value.tone}`} />
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{value.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{value.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <Footer />
    </div>
  );
}
