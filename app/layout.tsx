import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pamuk Eller Borsa Arenası",
  description: "30 günlük sanal borsa yarışması",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
