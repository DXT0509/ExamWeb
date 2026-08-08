export function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function formNullableString(formData: FormData, key: string) {
  const value = formString(formData, key).trim();
  return value.length > 0 ? value : null;
}

export function formBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

export function formNumber(formData: FormData, key: string) {
  return Number(formData.get(key));
}

export function formIdList(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is string => typeof value === "string");
}
