import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";

export const metadata: Metadata = {
  title: "PT YPTI - Sistem Manajemen Tool Room & Inventaris",
  description: "Enterprise Tool Room & Inventory Management System PT Yogya Presisi Tehnikatama Industri",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Public+Sans:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1E40AF" />
      </head>
      <body className="min-h-full bg-[#F8FAFC] text-slate-800 flex flex-col">
        <ToastProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
