import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ConfirmDialogProvider } from "@/components/ui/ConfirmDialog";

export const metadata: Metadata = {
  title: "PT YPTI - Tool Room & Inventory Management ERP",
  description: "Enterprise Tool Room & Inventory Management System - PT Yogyakarta Precision Tooling Industries",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-[#F8FAFC] text-slate-800 flex flex-col font-sans">
        <ToastProvider>
          <ConfirmDialogProvider>{children}</ConfirmDialogProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
