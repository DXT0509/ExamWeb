import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  return <Badge className="bg-[var(--muted)] capitalize">{status.replace("_", " ")}</Badge>;
}
