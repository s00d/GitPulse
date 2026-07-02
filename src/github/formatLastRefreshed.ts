export function formatLastRefreshedTime(iso: string, locale?: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "";
  return new Date(ts).toLocaleString(locale);
}
