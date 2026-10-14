"use client";

import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PageHero } from "@/components/marketing/PageHero";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <PageHero
        eyebrow="Contact"
        title="Talk to our team"
        description="Send your questions, implementation details, or partnership requests and we will respond."
      />

      <section className="marketing-shell py-14 sm:py-16 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <article className="glass-card p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Send a message</h2>
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-slate-800">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-semibold text-slate-800">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label htmlFor="subject" className="mb-2 block text-sm font-semibold text-slate-800">
                  Subject
                </label>
                <input
                  id="subject"
                  name="subject"
                  type="text"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="How can we help?"
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <div>
                <label htmlFor="message" className="mb-2 block text-sm font-semibold text-slate-800">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  placeholder="Your message..."
                  rows={5}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Send Message
              </button>
              {submitted && (
                <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Message sent successfully. We will get back to you soon.
                </div>
              )}
            </form>
          </article>

          <article className="glass-card h-fit p-6 sm:p-8">
            <h2 className="text-2xl font-semibold text-slate-900">Contact details</h2>
            <div className="mt-5 space-y-5">
              <div className="flex items-start gap-3">
                <span className="icon-chip h-10 w-10 shrink-0 bg-primary/10 text-primary"><Mail className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Email</p>
                  <p className="text-sm text-slate-600">support@vamattendance.com</p>
                  <p className="text-sm text-slate-600">info@vamattendance.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="icon-chip h-10 w-10 shrink-0 bg-emerald-50 text-emerald-600"><Phone className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Phone</p>
                  <p className="text-sm text-slate-600">+1 (555) 123-4567</p>
                  <p className="text-sm text-slate-600">+1 (555) 123-4568</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="icon-chip h-10 w-10 shrink-0 bg-indigo-50 text-indigo-600"><MapPin className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Office</p>
                  <p className="text-sm text-slate-600">123 Education Street</p>
                  <p className="text-sm text-slate-600">New York, NY 10001, USA</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="icon-chip h-10 w-10 shrink-0 bg-amber-50 text-amber-600"><Clock className="h-5 w-5" /></span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Hours</p>
                  <p className="text-sm text-slate-600">Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <Footer />
    </div>
  );
}
