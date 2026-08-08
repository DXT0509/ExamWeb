import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExamPrep",
  description: "Nền tảng luyện thi Phase 1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
