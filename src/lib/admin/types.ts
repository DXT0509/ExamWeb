export type ActionState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function parseListParams(searchParams: SearchParamsRecord) {
  const page = Number(searchParams.page ?? 1);
  const pageSize = Number(searchParams.pageSize ?? 10);
  return {
    page: Number.isInteger(page) && page > 0 ? page : 1,
    pageSize: PAGE_SIZE_OPTIONS.includes(pageSize as (typeof PAGE_SIZE_OPTIONS)[number]) ? pageSize : 10,
    q: typeof searchParams.q === "string" ? searchParams.q.trim() : "",
    status: typeof searchParams.status === "string" ? searchParams.status : "all",
    subjectId: typeof searchParams.subjectId === "string" ? searchParams.subjectId : "all",
    categoryId: typeof searchParams.categoryId === "string" ? searchParams.categoryId : "all",
    accessType: typeof searchParams.accessType === "string" ? searchParams.accessType : "all",
  };
}

export function toFieldErrors(error: { issues?: { path: PropertyKey[]; message: string }[] }) {
  return Object.fromEntries((error.issues ?? []).map((issue) => [String(issue.path[0] ?? "form"), issue.message]));
}
