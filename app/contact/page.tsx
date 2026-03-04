"use client";

import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

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

      <section className="marketing-shell marketing-section text-center">
        <h1 className="soft-title">Talk to our team</h1>
        <p className="soft-subtitle mx-auto mt-4 max-w-3xl">
          Send your questions, implementation details, or partnership requests and we will respond.
        </p>
      </section>

      <section className="marketing-shell pb-16 sm:pb-20 lg:pb-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <article className="glass-card p-6">
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
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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
                  className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
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
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm shadow-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
                  required
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Send Message
              </button>
              {submitted && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  Message sent successfully. We will get back to you soon.
                </div>
              )}
            </form>
          </article>

          <article className="glass-card p-6">
            <h2 className="text-2xl font-semibold text-slate-900">Contact details</h2>
            <div className="mt-5 space-y-5">
              <div className="flex items-start gap-3">
                <Mail className="mt-0.5 h-5 w-5 text-sky-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Email</p>
                  <p className="text-sm text-slate-600">support@vamattendance.com</p>
                  <p className="text-sm text-slate-600">info@vamattendance.com</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="mt-0.5 h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Phone</p>
                  <p className="text-sm text-slate-600">+1 (555) 123-4567</p>
                  <p className="text-sm text-slate-600">+1 (555) 123-4568</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 text-indigo-600" />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Office</p>
                  <p className="text-sm text-slate-600">123 Education Street</p>
                  <p className="text-sm text-slate-600">New York, NY 10001, USA</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="mt-0.5 h-5 w-5 text-amber-600" />
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
