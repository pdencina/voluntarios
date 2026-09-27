import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sitio = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(sitio),
  title: "Voluntarios CPA",
  description: "Administración de equipos de voluntarios del Campus Puente Alto",
  robots: { index: false, follow: false },
  applicationName: "Voluntarios CPA",
  appleWebApp: { capable: true, title: "Voluntarios", statusBarStyle: "black-translucent" },
  openGraph: { siteName: "Voluntarios CPA", locale: "es_CL", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#31302e",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-slate-900">
        <Toaster />
        {children}
      </body>
    </html>
  );
}
