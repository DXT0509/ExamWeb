import { StatusBadge } from "@/components/shared/status-badge";
import { Pagination } from "@/components/ui/pagination";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { studentAttempts } from "@/lib/constants/mock-data";

export default function HistoryPage() {
  return <Card><CardHeader><CardTitle>Lịch sử bài làm</CardTitle></CardHeader><CardContent className="space-y-4 overflow-x-auto"><Table><thead><tr><Th>Đề thi</Th><Th>Trạng thái</Th><Th>Điểm</Th></tr></thead><tbody>{studentAttempts.map((a) => <tr key={a.id}><Td>{a.examTitle}</Td><Td><StatusBadge status={a.status} /></Td><Td>{a.score ?? "Chưa có"}</Td></tr>)}</tbody></Table><Pagination /></CardContent></Card>;
}
