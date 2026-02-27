import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VAM Attendance - Track and Manage Attendance",
  description: "Professional attendance management system for teachers and students. Track attendance, generate reports, and manage sessions with ease.",
  keywords: ["attendance", "management", "teacher", "student", "tracking"],
  authors: [{ name: "Viral Ad Media" }],
  openGraph: {
    title: "VAM Attendance",
    description: "Professional attendance management system",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white dark:bg-slate-950`}
      >
        {children}
      </body>
    </html>
  );
}
