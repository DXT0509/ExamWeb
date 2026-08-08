import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { logoutAction } from "@/lib/actions/auth";
import { getHomePathForRole } from "@/lib/auth/redirects";
import { publicLinks } from "@/lib/constants/navigation";

type PublicHeaderProps = {
  userRole?: "student" | "admin" | null;
};

export function PublicHeader({ userRole = null }: PublicHeaderProps) {
  const accountLinks = userRole
    ? [{ href: getHomePathForRole(userRole), label: "Tổng quan" }]
    : [
        { href: "/login", label: "Đăng nhập" },
        { href: "/register", label: "Đăng ký" },
      ];

  return (
    <header className="sticky top-0 z-20 border-b bg-white/95">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="font-semibold focus-visible:outline-2 focus-visible:outline-offset-4">
          ExamPrep
        </Link>
        <nav className="hidden items-center gap-5 md:flex" aria-label="Điều hướng công khai">
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm hover:text-[var(--primary)]">
              {link.label}
            </Link>
          ))}
          {accountLinks.map((link) => (
            <Button key={link.href} asChild variant="outline" size="sm">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
          {userRole ? (
            <form action={logoutAction}>
              <Button type="submit" size="sm">Đăng xuất</Button>
            </form>
          ) : null}
        </nav>
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mở menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <nav className="grid gap-3" aria-label="Điều hướng mobile">
                {[...publicLinks, ...accountLinks].map((link) => (
                  <Link key={link.href} href={link.href} className="rounded-md px-2 py-2 text-sm hover:bg-[var(--muted)]">
                    {link.label}
                  </Link>
                ))}
                {userRole ? (
                  <form action={logoutAction}>
                    <Button type="submit" className="w-full">Đăng xuất</Button>
                  </form>
                ) : null}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
