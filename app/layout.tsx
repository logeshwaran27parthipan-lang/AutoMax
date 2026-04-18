import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AutoMax - Automate the work. Focus on the business.",
  description: "AutoMax connects your WhatsApp, Email, and Google Sheets — and runs your business workflows automatically. Built for Indian businesses.",
  keywords: ["automation", "business automation", "WhatsApp automation", "email automation", "Google Sheets", "workflow automation", "India", "small business"],
  openGraph: {
    title: "AutoMax - Automate the work. Focus on the business.",
    description: "AutoMax connects your WhatsApp, Email, and Google Sheets — and runs your business workflows automatically.",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAFAFA",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} bg-[#FAFAFA]`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
