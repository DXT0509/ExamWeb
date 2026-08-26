export type DocumentStatus = "draft" | "published" | "archived";
export type DocumentSourceType = "file" | "url";

export type DocumentItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  file_path: string | null;
  external_url: string | null;
  status: DocumentStatus;
  is_public: boolean;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type AdminDocumentListItem = Pick<
  DocumentItem,
  | "id"
  | "title"
  | "slug"
  | "description"
  | "file_path"
  | "external_url"
  | "status"
  | "is_public"
  | "updated_at"
>;

export type PublicDocumentItem = Pick<
  DocumentItem,
  | "id"
  | "title"
  | "slug"
  | "description"
  | "file_path"
  | "external_url"
  | "updated_at"
>;
