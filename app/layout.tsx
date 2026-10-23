import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Proofly — Collect and publish customer testimonials",
    template: "%s · Proofly",
  },
  description:
    "Proofly helps teams collect, moderate, and publish customer testimonials on a beautiful public wall.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "Proofly",
    description: "Collect and publish customer testimonials.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
