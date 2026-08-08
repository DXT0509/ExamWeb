export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <main className="container-page grid min-h-screen place-items-center py-8">{children}</main>;
}
