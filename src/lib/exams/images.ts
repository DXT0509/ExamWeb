/**
 * Utility functions for handling single and multi-image question prompts
 */

/**
 * Parses raw image_path string into an array of clean image URLs.
 * Supports:
 * - Single URL: "https://..."
 * - Multi-line URLs: "https://...1\nhttps://...2"
 * - JSON array string: '["https://...1", "https://...2"]'
 * - Comma-separated URLs: "https://...1,https://...2"
 */
export function parseQuestionImages(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== "string" || !raw.trim()) return [];
  const trimmed = raw.trim();

  // Try parsing JSON array
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
          .map((s) => s.trim());
      }
    } catch {
      // Fallback below
    }
  }

  // Split by newlines if present
  if (trimmed.includes("\n")) {
    return trimmed
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  // Split by comma if present
  if (trimmed.includes(",") && (trimmed.includes("http://") || trimmed.includes("https://") || trimmed.includes("/uploads/"))) {
    return trimmed
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [trimmed];
}

/**
 * Serializes an array of image URLs back into a single string for storage.
 */
export function serializeQuestionImages(urls: string[]): string | null {
  const clean = urls.map((u) => u.trim()).filter(Boolean);
  if (clean.length === 0) return null;
  if (clean.length === 1) return clean[0] ?? null;
  return clean.join("\n");
}
