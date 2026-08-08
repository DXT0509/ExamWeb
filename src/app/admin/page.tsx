import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";
import { adminAttempts, exams } from "@/lib/constants/mock-data";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin dashboard</h1>
      <div className="grid gap-4 md:grid-cols-4">{["3 đề", "2 môn", "2 bài gần đây", "0 lỗi"].map((item) => <Card key={item}><CardContent className="p-5 text-lg font-semibold">{item}</CardContent></Card>)}</div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader><CardTitle>Đề gần đây</CardTitle></CardHeader><CardContent><Table><thead><tr><Th>Tên</Th><Th>Trạng thái</Th></tr></thead><tbody>{exams.map((e) => <tr key={e.id}><Td>{e.title}</Td><Td><StatusBadge status={e.status} /></Td></tr>)}</tbody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle>Attempt gần đây</CardTitle></CardHeader><CardContent><Table><thead><tr><Th>Đề</Th><Th>Trạng thái</Th></tr></thead><tbody>{adminAttempts.map((a) => <tr key={a.id}><Td>{a.examTitle}</Td><Td><StatusBadge status={a.status} /></Td></tr>)}</tbody></Table></CardContent></Card>
      </div>
    </div>
  );
}
