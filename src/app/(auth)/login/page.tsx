import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/auth-forms";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const params = await searchParams;

  return (
    <Card className="w-full max-w-md">
      <CardHeader><CardTitle>Đăng nhập</CardTitle></CardHeader>
      <CardContent><LoginForm next={params.next} resetSuccess={params.reset === "success"} /></CardContent>
    </Card>
  );
}
