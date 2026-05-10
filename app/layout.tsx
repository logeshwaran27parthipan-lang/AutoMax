import type { Metadata } from "next";
import "./globals.css";
import { ToastContainer } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "AutoMax",
  description: "Marketing Automation Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
