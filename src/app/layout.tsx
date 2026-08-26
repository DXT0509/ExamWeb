import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { SidebarProvider } from "@/components/navigation/sidebar-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "ExamPrep - Nền tảng luyện thi trực tuyến",
  description: "Nền tảng luyện thi trực tuyến thông minh, bảo mật và chính xác.",
};

const themeInitScript = `
(function() {
  try {
    var storedTheme = localStorage.getItem('theme');
    var isDark = true;
    if (storedTheme === 'light') {
      isDark = false;
    } else if (storedTheme === 'dark') {
      isDark = true;
    } else if (storedTheme === 'system') {
      isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } else {
      isDark = true;
    }
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased transition-colors duration-200">
        <ThemeProvider>
          <SidebarProvider>
            {children}
            <Toaster />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
