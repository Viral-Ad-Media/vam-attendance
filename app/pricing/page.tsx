import Link from "next/link";
import { Check } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Pricing - VAM Attendance",
  description: "Simple and transparent pricing for VAM Attendance system.",
};

const plans = [
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    description: "For independent teachers and small class teams.",
    features: ["Up to 50 students", "1 class", "Basic reports", "Email support", "1GB storage"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$29",
    period: "/month",
    description: "For growing schools that need deeper tracking.",
    features: [
      "Up to 500 students",
      "5 classes",
      "Advanced reports",
      "Priority support",
      "50GB storage",
      "API access",
      "Custom branding",
    ],
    cta: "Choose Professional",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations with complex operations.",
    features: [
      "Unlimited students",
      "Unlimited classes",
      "Custom reports",
      "24/7 support",
      "Unlimited storage",
      "Dedicated account support",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <section className="marketing-shell marketing-section text-center">
        <h1 className="soft-title">Simple pricing that scales with your school</h1>
        <p className="soft-subtitle mx-auto mt-4 max-w-3xl">
          Start small, expand as needed, and keep attendance operations consistent across teams.
        </p>
      </section>

      <section className="marketing-shell pb-16 sm:pb-20 lg:pb-24">
        <div className="grid gap-5 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`glass-card relative p-6 ${plan.highlighted ? "ring-2 ring-sky-400/40" : ""}`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Most Popular
                </span>
              )}
              <h2 className="text-xl font-semibold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-600">{plan.description}</p>
              <div className="mt-5">
                <span className="text-4xl font-semibold text-slate-900">{plan.price}</span>
                <span className="text-slate-500">{plan.period}</span>
              </div>
              <Link
                href={plan.name === "Enterprise" ? "/contact" : "/signup"}
                className={`mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                  plan.highlighted
                    ? "bg-slate-900 text-white hover:bg-slate-800"
                    : "border border-slate-300 bg-white/85 text-slate-800 hover:bg-slate-50"
                }`}
              >
                {plan.cta}
              </Link>
              <ul className="mt-5 space-y-2">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 text-sky-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <Footer />
    </div>
  );
}
