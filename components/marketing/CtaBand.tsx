import Link from "next/link";
import { ArrowRight } from "lucide-react";

type CtaBandProps = {
  title?: string;
  description?: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
};

export function CtaBand({
  title = "Ready for a cleaner attendance workflow?",
  description = "Set up your workspace in minutes and give your team a dashboard that is easier to read and faster to use.",
  primary = { label: "Start Free Trial", href: "/signup" },
  secondary = { label: "Talk to us", href: "/contact" },
}: CtaBandProps) {
  return (
    <section className="marketing-shell pb-16 sm:pb-20 lg:pb-24">
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 px-6 py-12 text-center text-white sm:px-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[36rem] -translate-x-1/2 rounded-full bg-primary/40 blur-3xl"
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold sm:text-4xl">{title}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-slate-300">{description}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={primary.href}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {primary.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={secondary.href}
              className="inline-flex h-11 items-center rounded-lg border border-white/25 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            >
              {secondary.label}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
