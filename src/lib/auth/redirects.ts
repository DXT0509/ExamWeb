export function getSafeNextPath(value: FormDataEntryValue | string | null | undefined, fallback = "/student") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function getHomePathForRole(role: "student" | "admin") {
  return role === "admin" ? "/admin" : "/student";
}
