import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Check } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Pricing - VAM Attendance",
  description: "Simple and transparent pricing for VAM Attendance system.",
};

const plans = [
  {
    name: "Starter",
    price: "$9",
    period: "/month",
    description: "Perfect for individual teachers",
    features: [
      "Up to 50 students",
      "1 class",
      "Basic reports",
      "Email support",
      "Data storage: 1GB",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$29",
    period: "/month",
    description: "For schools and institutions",
    features: [
      "Up to 500 students",
      "5 classes",
      "Advanced reports",
      "Priority support",
      "Data storage: 50GB",
      "API access",
      "Custom branding",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large organizations",
    features: [
      "Unlimited students",
      "Unlimited classes",
      "Custom reports",
      "24/7 support",
      "Unlimited storage",
      "API access",
      "Custom branding",
      "Dedicated account manager",
      "On-premise option",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            Choose the perfect plan for your needs. Always flexible to scale.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className="text-slate-600">Monthly</span>
            <button className="relative inline-flex h-8 w-14 items-center rounded-full bg-fuchsia-600">
              <span className="inline-block h-6 w-6 transform rounded-full bg-white transition translate-x-1" />
            </button>
            <span className="text-slate-600">
              Yearly <span className="text-fuchsia-600 font-semibold">Save 20%</span>
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, idx) => (
              <div
                key={idx}
                className={`relative rounded-2xl border transition ${
                  plan.highlighted
                    ? "border-fuchsia-600 bg-gradient-to-br from-fuchsia-50 to-cyan-50 shadow-xl scale-105 md:scale-100"
                    : "border-slate-200 bg-white hover:shadow-lg"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <span className="inline-block px-4 py-1 bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white text-sm font-semibold rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <p className="text-slate-600 text-sm mb-6">{plan.description}</p>

                  <div className="mb-6">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-600">{plan.period}</span>
                  </div>

                  <Link
                    href="/signup"
                    className={`block w-full py-2 px-4 rounded-lg font-semibold transition text-center ${
                      plan.highlighted
                        ? "bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white hover:opacity-90"
                        : "border border-slate-300 text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {plan.cta}
                  </Link>

                  <div className="border-t border-slate-200 mt-6 pt-6">
                    <ul className="space-y-3">
                      {plan.features.map((feature, fidx) => (
                        <li key={fidx} className="flex items-center gap-2">
                          <Check className="h-5 w-5 text-fuchsia-600 flex-shrink-0" />
                          <span className="text-slate-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8 bg-slate-50">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-slate-900 mb-12 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            {[
              {
                q: "Can I cancel my subscription anytime?",
                a: "Yes, you can cancel your subscription anytime. No long-term contracts required.",
              },
              {
                q: "Do you offer discounts for annual plans?",
                a: "Yes, save 20% when you switch to an annual billing plan.",
              },
              {
                q: "Is there a free trial available?",
                a: "Yes, we offer a 14-day free trial for all plans. No credit card required.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, PayPal, and bank transfers for enterprise customers.",
              },
              {
                q: "Can I upgrade or downgrade my plan?",
                a: "Yes, you can change your plan at any time. Charges will be adjusted accordingly.",
              },
            ].map((faq, idx) => (
              <div key={idx} className="bg-white rounded-lg p-6 border border-slate-200">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
