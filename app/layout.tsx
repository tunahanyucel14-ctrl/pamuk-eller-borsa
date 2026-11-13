import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "./components/app-shell";

export const metadata: Metadata = {
  title: "Pamuk Eller Borsa Arenası",
  description: "30 günlük sanal borsa yarışması",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Sayfa açılırken kayıtlı temayı hemen uygular (renk titremesi olmasın diye)
const themeScript = `try{var t=localStorage.getItem("pamuk-tema")||"retro";var f=localStorage.getItem("pamuk-font")||"modern";document.documentElement.setAttribute("data-theme",t);document.documentElement.setAttribute("data-font",f)}catch(e){document.documentElement.setAttribute("data-theme","retro")}`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" data-theme="retro" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body><AppShell>{children}</AppShell></body>
    </html>
  );
}
