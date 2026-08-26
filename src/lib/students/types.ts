export type StudentItem = {
  id: string;
  display_name: string | null;
  email: string;
  status: "active" | "locked";
  created_at: string;
};

export type StudentListParams = {
  page: number;
  pageSize: number;
  q: string;
  status: "all" | "active" | "locked";
};

export type StudentListResult = {
  items: StudentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
