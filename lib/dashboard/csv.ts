export function formatCSV(headers: string[], rows: Record<string, string>[]): string {
  return [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => `"${(r[h] ?? "").replace(/"/g, '""')}"`).join(","),
    ),
  ].join("\n");
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: Record<string, string>[],
): void {
  const csv = formatCSV(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
