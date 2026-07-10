export function compact(n: number): string {
  if (!isFinite(n)) return "\u2014";
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toFixed(n < 10 ? 2 : 0);
}

export function formatTokenAmount(n: number): string {
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

export function formatWithCommas(n: number | string, decimals = 2): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!isFinite(num)) return "\u2014";
  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function truncateDecimals(n: number | string, decimals = 2): string {
  const num = typeof n === "string" ? parseFloat(n) : n;
  if (!isFinite(num)) return "\u2014";
  const parts = num.toString().split(".");
  if (!parts[1]) return parts[0];
  return `${parts[0]}.${parts[1].slice(0, decimals)}`;
}

export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatCountdown(targetTs: number, now = Math.floor(Date.now() / 1e3)): string {
  const diff = targetTs - now;
  if (diff <= 0) return "Live now";
  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function timestampToDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysToHuman(days: number): string {
  if (days <= 30) return `${days} Days`;
  const months = Math.floor(days / 30);
  if (months === 12) return "1 Year";
  if (months > 12) return `${(months / 12).toFixed(0)} Years`;
  return `${months} Months`;
}

export function isMatured(maturesOn: number): boolean {
  return Math.floor(Date.now() / 1e3) > maturesOn;
}
