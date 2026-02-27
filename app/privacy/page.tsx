import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata = {
  title: "Privacy Policy - VAM Attendance",
  description: "Privacy policy for VAM Attendance system.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold text-slate-900 mb-8">Privacy Policy</h1>

          <div className="prose prose-slate max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Introduction</h2>
              <p className="text-slate-600">
                VAM Attendance ("we," "us," "our," or "Company") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and otherwise process personal
                information in connection with our Services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Information We Collect</h2>
              <p className="text-slate-600 mb-4">We collect information in the following ways:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>Information you provide directly (name, email, phone)</li>
                <li>Information about your usage of our Services</li>
                <li>Information from third-party sources with your consent</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">How We Use Your Information</h2>
              <p className="text-slate-600 mb-4">We use information for the following purposes:</p>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>Providing and improving our Services</li>
                <li>Communicating with you about our Services</li>
                <li>Complying with legal obligations</li>
                <li>Protecting our rights and your rights</li>
                <li>Personalizing your experience</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Data Security</h2>
              <p className="text-slate-600">
                We implement appropriate technical and organizational measures to protect your personal
                information against unauthorized access, alteration, disclosure, or destruction. However,
                no method of transmission over the Internet or electronic storage is completely secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Your Rights</h2>
              <p className="text-slate-600 mb-4">
                Depending on your location, you may have certain rights regarding your personal information,
                including:
              </p>
              <ul className="list-disc list-inside space-y-2 text-slate-600">
                <li>The right to access your personal information</li>
                <li>The right to correct inaccurate information</li>
                <li>The right to delete your information</li>
                <li>The right to restrict processing</li>
                <li>The right to data portability</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Contact Us</h2>
              <p className="text-slate-600">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-slate-600">
                  Email: privacy@vamattendance.com
                  <br />
                  Address: 123 Education Street, New York, NY 10001, USA
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Changes to This Privacy Policy</h2>
              <p className="text-slate-600">
                We may update this Privacy Policy from time to time. We will notify you of any significant
                changes by updating the "Last Modified" date of this Privacy Policy.
              </p>
            </section>

            <div className="pt-8 border-t border-slate-200 text-sm text-slate-600">
              <p>Last Modified: December 8, 2024</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
