import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, Award, Zap } from "lucide-react";

export const metadata = {
  title: "About VAM Attendance",
  description: "Learn about VAM Attendance and our mission to simplify attendance management.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* Hero Section */}
      <section className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-6">
            About VAM Attendance
          </h1>
          <p className="text-xl text-slate-600">
            Dedicated to simplifying attendance management for educators and institutions worldwide.
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-12 mb-16">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Mission</h2>
              <p className="text-lg text-slate-600 mb-4">
                To provide educators with a simple, reliable, and secure platform to track student
                attendance and gain actionable insights to improve engagement and performance.
              </p>
              <p className="text-lg text-slate-600">
                We believe that efficient attendance management should not be complicated. Our platform
                is designed with educators in mind, offering intuitive interfaces and powerful analytics.
              </p>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Our Vision</h2>
              <p className="text-lg text-slate-600 mb-4">
                To become the leading attendance management solution trusted by educators and
                institutions across the globe.
              </p>
              <p className="text-lg text-slate-600">
                We envision a world where attendance tracking is seamless, and educators have the
                insights they need to support every student's success.
              </p>
            </div>
          </div>

          {/* Core Values */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Our Core Values</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <Users className="h-10 w-10 text-fuchsia-600 mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">User-Centric</h3>
                  <p className="text-slate-600">
                    We design every feature with the end user in mind.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Target className="h-10 w-10 text-cyan-600 mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">Reliability</h3>
                  <p className="text-slate-600">
                    Trust and consistency are at the heart of what we do.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Award className="h-10 w-10 text-purple-600 mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">Excellence</h3>
                  <p className="text-slate-600">
                    We strive for excellence in every aspect of our service.
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <Zap className="h-10 w-10 text-yellow-600 mb-4" />
                  <h3 className="font-semibold text-slate-900 mb-2">Innovation</h3>
                  <p className="text-slate-600">
                    We continuously innovate to meet evolving needs.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Team Section */}
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-8 text-center">Our Team</h2>
            <p className="text-lg text-slate-600 text-center max-w-3xl mx-auto mb-8">
              We're a dedicated team of educators, engineers, and designers passionate about making
              attendance management simple and effective.
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="text-center">
                  <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gradient-to-br from-fuchsia-600 to-cyan-600 flex items-center justify-center text-2xl font-bold text-white">
                    {String(i).padStart(2, "0")}
                  </div>
                  <h3 className="font-semibold text-slate-900">Team Member</h3>
                  <p className="text-slate-600">Position</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
