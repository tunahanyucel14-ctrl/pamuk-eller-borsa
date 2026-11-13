import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pamuk Eller Borsa Arenası",
  description: "30 günlük sanal borsa yarışması",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

// Sayfa açılırken kayıtlı temayı hemen uygular (renk titremesi olmasın diye)
const themeScript = `try{var t=localStorage.getItem("pamuk-tema");if(t==="zumrut"||!t){t="retro";localStorage.setItem("pamuk-tema","retro")}document.documentElement.setAttribute("data-theme",t)}catch(e){document.documentElement.setAttribute("data-theme","retro")}`;

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
      <body>{children}</body>
    </html>
  );
}
