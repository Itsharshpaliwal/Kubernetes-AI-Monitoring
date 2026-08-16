import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Kubernetes Troubleshooting Agent",
  description: "AI-powered Kubernetes monitoring and troubleshooting platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
