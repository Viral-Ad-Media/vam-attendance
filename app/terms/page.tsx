import { LegalPage } from "@/components/marketing/LegalPage";

export const metadata = {
  title: "Terms of Service - VAM Attendance",
  description: "Terms of Service for VAM Attendance system.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Legal"
      title="Terms of Service"
      description="The terms that govern your use of the VAM Attendance service."
    >
      <section>
        <h2 className="mb-3">Agreement to Terms</h2>
        <p className="text-slate-600">
          By accessing and using the VAM Attendance service, you accept and agree to be bound by and
          comply with the terms and provision of this agreement. If you do not agree to abide by the
          above, please do not use this service.
        </p>
      </section>

      <section>
        <h2 className="mb-3">Use License</h2>
        <p className="mb-3 text-slate-600">
          Permission is granted to temporarily download one copy of the materials (information or
          software) on VAM Attendance for personal, non-commercial transitory viewing only.
        </p>
        <p className="text-slate-600">
          This is the grant of a license, not a transfer of title, and under this license you may
          not:
        </p>
        <ul className="list-disc list-inside space-y-2 text-slate-600 mt-2">
          <li>Modifying or copying the materials</li>
          <li>Using the materials for any commercial purpose or for any public display</li>
          <li>Attempting to decompile or reverse engineer any software contained on the Service</li>
          <li>Transferring the materials to another person or &quot;mirroring&quot; the materials on any server</li>
          <li>Removing any copyright or other proprietary notations from the materials</li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3">Disclaimer</h2>
        <p className="text-slate-600">
          The materials on VAM Attendance&apos;s website and service are provided on an &apos;as is&apos; basis.
          VAM Attendance makes no warranties, expressed or implied, and hereby disclaims and negates
          all other warranties including, without limitation, implied warranties or conditions of
          merchantability, fitness for a particular purpose, or non-infringement of intellectual
          property or other violation of rights.
        </p>
      </section>

      <section>
        <h2 className="mb-3">Limitations</h2>
        <p className="text-slate-600">
          In no event shall VAM Attendance or its suppliers be liable for any damages (including,
          without limitation, damages for loss of data or profit, or due to business interruption)
          arising out of the use or inability to use the materials on VAM Attendance, even if
          VAM Attendance or an authorized representative has been notified orally or in writing of
          the possibility of such damage.
        </p>
      </section>

      <section>
        <h2 className="mb-3">Accuracy of Materials</h2>
        <p className="text-slate-600">
          The materials appearing on VAM Attendance could include technical, typographical, or
          photographic errors. VAM Attendance does not warrant that any of the materials on its
          website are accurate, complete, or current. VAM Attendance may make changes to the
          materials contained on its website at any time without notice.
        </p>
      </section>

      <section>
        <h2 className="mb-3">Links</h2>
        <p className="text-slate-600">
          VAM Attendance has not reviewed all of the sites linked to its website and is not
          responsible for the contents of any such linked site. The inclusion of any link does not
          imply endorsement by VAM Attendance of the site. Use of any such linked website is at the
          user&apos;s own risk.
        </p>
      </section>

      <section>
        <h2 className="mb-3">Modifications</h2>
        <p className="text-slate-600">
          VAM Attendance may revise these terms of service for its website at any time without notice.
          By using this website, you are agreeing to be bound by the then current version of these
          terms of service.
        </p>
      </section>

      <section>
        <h2 className="mb-3">Governing Law</h2>
        <p className="text-slate-600">
          These terms and conditions are governed by and construed in accordance with the laws of the
          United States, and you irrevocably submit to the exclusive jurisdiction of the courts in
          that location.
        </p>
      </section>

      <section>
        <h2 className="mb-3">Contact Information</h2>
        <p className="text-slate-600">
          If you have any questions about these Terms of Service, please contact us at:
        </p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-slate-600">
            Email: legal@vamattendance.com
            <br />
            Address: 123 Education Street, New York, NY 10001, USA
          </p>
        </div>
      </section>

      <div className="border-t border-slate-200 pt-6 text-sm text-slate-500">
        <p>Last Modified: December 8, 2024</p>
      </div>
    </LegalPage>
  );
}
