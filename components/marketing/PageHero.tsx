import * as React from "react";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
  align?: "center" | "left";
};

export function PageHero({ eyebrow, title, description, children, align = "center" }: PageHeroProps) {
  const centered = align === "center";
  return (
    <section className="relative isolate overflow-hidden border-b border-slate-200/70">
      <div aria-hidden="true" className="marketing-hero-bg pointer-events-none absolute inset-0 -z-10" />
      <div
        className={`marketing-shell marketing-section ${centered ? "text-center" : "text-left"}`}
      >
        <span className="section-eyebrow">{eyebrow}</span>
        <h1 className={`soft-title ${centered ? "mx-auto max-w-4xl" : "max-w-3xl"}`}>{title}</h1>
        {description && (
          <p className={`soft-subtitle mt-4 max-w-3xl ${centered ? "mx-auto" : ""}`}>{description}</p>
        )}
        {children && <div className={`mt-8 ${centered ? "flex justify-center" : ""}`}>{children}</div>}
      </div>
    </section>
  );
}
