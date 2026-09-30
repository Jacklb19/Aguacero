export const TIME_ZONE = "America/Bogota";

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const timeSecFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function bogotaTime(iso: string, withSeconds = false): string {
  return (withSeconds ? timeSecFmt : timeFmt).format(new Date(iso));
}

export function bogotaDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

const numberFmt = new Intl.NumberFormat("en-US");
export function formatNumber(n: number, maximumFractionDigits = 0): string {
  if (maximumFractionDigits === 0) return numberFmt.format(Math.round(n));
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(n);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}
