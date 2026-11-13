import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppShell from "./components/app-shell";

export const metadata: Metadata = {
  title: {
    default: "Pamuk Eller | Akıllı Finans",
    template: "%s | Pamuk Eller",
  },
  applicationName: "Pamuk Eller",
  description: "Gelir, gider, bütçe, borç ve finansal hedeflerini tek merkezden yönet.",
  appleWebApp: {
    capable: true,
    title: "Pamuk Eller",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#d95743",
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
