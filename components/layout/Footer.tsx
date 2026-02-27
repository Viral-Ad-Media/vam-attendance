import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 font-bold text-lg mb-4">
              <div className="h-8 w-8 rounded-md bg-gradient-to-r from-fuchsia-600 to-cyan-600" />
              <span>VAM Attendance</span>
            </div>
            <p className="text-sm text-slate-600">
              Professional attendance management system for educators and institutions.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/features" className="text-slate-600 hover:text-slate-900">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-slate-600 hover:text-slate-900">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-slate-600 hover:text-slate-900">
                  About
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-slate-600 hover:text-slate-900">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-slate-600 hover:text-slate-900">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="text-slate-600 hover:text-slate-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-slate-600 hover:text-slate-900">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="border-t border-slate-200 pt-8 flex flex-col sm:flex-row items-center justify-between">
          <p className="text-sm text-slate-600">
            © {currentYear} Viral Ad Media. All rights reserved.
          </p>

          {/* Social Links */}
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              <Twitter className="h-5 w-5" />
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              <Github className="h-5 w-5" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 hover:text-slate-900 transition"
            >
              <Linkedin className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
