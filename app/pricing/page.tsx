import Link from "next/link";
import { Check, ChevronDown } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { CtaBand } from "@/components/marketing/CtaBand";

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

const faqs = [
  {
    question: "How does billing work?",
    answer:
      "Subscriptions and payment details are handled securely through Stripe. Admins can update cards and view invoices from Settings → Billing.",
  },
  {
    question: "Can I cancel my plan?",
    answer: "Yes. Use the billing portal under Settings → Billing to manage or cancel your subscription.",
  },
  {
    question: "Who can see attendance data?",
    answer:
      "Access is role-based. Admins manage the whole organization, while teachers only see the sessions and attendance records that belong to them.",
  },
  {
    question: "Can I export my data?",
    answer: "Yes. Import and export tools let you move student and attendance data in and out for reports and audits.",
  },
  {
    question: "Our school needs something custom.",
    answer: "The Enterprise plan is built for that. Reach out through the contact page and we will tailor it with you.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Header />

      <PageHero
        eyebrow="Transparent plans"
        title="Simple pricing that scales with your school"
        description="Start small, expand as needed, and keep attendance operations consistent across teams."
      />

      <section className="marketing-shell py-14 sm:py-16 lg:py-20">
        <div className="grid items-stretch gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`glass-card relative flex flex-col p-6 sm:p-7 ${plan.highlighted ? "border-primary shadow-lg ring-1 ring-primary/20 md:-translate-y-2" : "card-hover"}`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
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
                className={`mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  plan.highlighted
                    ? "bg-primary text-white hover:brightness-105"
                    : "border border-slate-300 bg-white/85 text-slate-800 hover:bg-slate-50"
                }`}
              >
                {plan.cta}
              </Link>
              <ul className="mt-6 space-y-3 border-t border-slate-100 pt-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>


      <section className="border-y border-slate-200/70 bg-white/60">
        <div className="marketing-shell marketing-section">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <span className="section-eyebrow">FAQ</span>
              <h2 className="text-3xl font-semibold text-slate-900 sm:text-4xl">Questions, answered</h2>
            </div>
            <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
              {faqs.map((faq) => (
                <details key={faq.question} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                    {faq.question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="pt-16 sm:pt-20 lg:pt-24">
        <CtaBand title="Not sure which plan fits?" description="Tell us about your school and we will help you pick the right setup." primary={{ label: "Contact Sales", href: "/contact" }} secondary={{ label: "Start Free Trial", href: "/signup" }} />
      </div>

      <Footer />
    </div>
  );
}
