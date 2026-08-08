import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/actions/auth";

export function SectionShell({
  title,
  links,
  children,
}: {
  title: string;
  links: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white">
        <div className="container-page flex min-h-16 flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between">
          <Link href="/" className="font-semibold">
            ExamPrep
          </Link>
          <nav className="flex flex-wrap gap-2" aria-label={title}>
            {links.map((link) => (
              <Button key={link.href} asChild variant="ghost" size="sm">
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </nav>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm">Đăng xuất</Button>
          </form>
        </div>
      </header>
      <main className="container-page py-8">{children}</main>
    </div>
  );
}
