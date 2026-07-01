import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Home, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Page not found — VAM Attendance",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        {/* Large muted 404 */}
        <p
          aria-hidden="true"
          className="select-none text-[8rem] font-extrabold leading-none tracking-tighter text-slate-100 sm:text-[12rem]"
        >
          404
        </p>

        <div className="-mt-6 space-y-3">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Page not found
          </h1>
          <p className="mx-auto max-w-sm text-sm text-slate-500">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved. Double-check the URL, or head back to where you came from.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            <Home className="h-4 w-4" />
            Go to dashboard
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
