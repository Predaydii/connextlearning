const dateFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });
const dateTimeFmt = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});
const numberFmt = new Intl.NumberFormat("th-TH");

const shortDateFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "2-digit", timeZone: "Asia/Bangkok" });

/** "20 ต.ค. 69" */
export function formatThaiDateShort(d: Date | string) {
  return shortDateFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function formatThaiDate(d: Date | string) {
  return dateFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function formatThaiDateTime(d: Date | string) {
  return dateTimeFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function formatNumber(n: number) {
  return numberFmt.format(n);
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
