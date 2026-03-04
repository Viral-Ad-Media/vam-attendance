import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
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
        className={`${manrope.variable} ${jetbrainsMono.variable} min-h-screen font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
