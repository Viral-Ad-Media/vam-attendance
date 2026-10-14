import * as React from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/marketing/PageHero";

type LegalPageProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

/** Shared shell for long-form legal pages: hero, readable column, cross-links. */
export function LegalPage({ eyebrow, title, description, children }: LegalPageProps) {
  return (
    <div className="min-h-screen">
      <Header />
      <PageHero eyebrow={eyebrow} title={title} description={description} />

      <section className="marketing-shell py-10 sm:py-14">
        <div className="mx-auto max-w-3xl">
          <div className="glass-card space-y-8 p-6 sm:p-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:leading-relaxed [&_p]:leading-7">
            {children}
          </div>
          <p className="mt-6 text-center text-sm text-slate-500">
            Questions? <Link href="/contact" className="font-semibold text-primary hover:underline">Contact our team</Link>
            {" · "}
            <Link href="/" className="font-semibold text-primary hover:underline">Back to home</Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
