"use client";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useState } from "react";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Add your form submission logic here
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            Get in Touch
          </h1>
          <p className="text-xl text-slate-600">
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-16">
            {/* Contact Form */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-900 mb-2">
                    Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your name"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-900 mb-2">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-900 mb-2">
                    Subject
                  </label>
                  <input
                    id="subject"
                    name="subject"
                    type="text"
                    value={form.subject}
                    onChange={handleChange}
                    placeholder="How can we help?"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-900 mb-2">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Your message..."
                    rows={5}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-600 focus:border-transparent"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-600 text-white font-semibold hover:opacity-90 transition"
                >
                  Send Message
                </button>

                {submitted && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 font-medium">
                      ✓ Message sent successfully! We'll get back to you soon.
                    </p>
                  </div>
                )}
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Contact Information</h2>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Mail className="h-6 w-6 text-fuchsia-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Email</h3>
                    <p className="text-slate-600">support@vamattendance.com</p>
                    <p className="text-slate-600">info@vamattendance.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Phone className="h-6 w-6 text-cyan-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Phone</h3>
                    <p className="text-slate-600">+1 (555) 123-4567</p>
                    <p className="text-slate-600">+1 (555) 123-4568</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Office Address</h3>
                    <p className="text-slate-600">123 Education Street</p>
                    <p className="text-slate-600">New York, NY 10001, USA</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">Business Hours</h3>
                    <p className="text-slate-600">Monday - Friday: 9:00 AM - 6:00 PM EST</p>
                    <p className="text-slate-600">Saturday - Sunday: Closed</p>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="mt-12 p-6 bg-slate-50 rounded-lg">
                <h3 className="font-semibold text-slate-900 mb-4">Frequently Asked Questions</h3>
                <p className="text-slate-600 mb-4">
                  Have a common question? Check out our FAQ section for quick answers.
                </p>
                <button className="text-fuchsia-600 hover:text-fuchsia-700 font-medium">
                  View FAQ →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
