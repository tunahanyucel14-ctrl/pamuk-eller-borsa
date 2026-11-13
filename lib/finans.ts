export function tl(n: number): string {
  return (
    Number(n).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " TL"
  );
}

function iki(n: number): string {
  return String(n).padStart(2, "0");
}

export function bugunAy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}`;
}

export function bugun(): string {
  const d = new Date();
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
}

// "2026-11" -> { bas: "2026-11-01", sonraki: "2026-12-01" }
export function ayAraligi(ay: string): { bas: string; sonraki: string } {
  const [y, m] = ay.split("-").map(Number);
  const bas = `${y}-${iki(m)}-01`;
  const sonraki = m === 12 ? `${y + 1}-01-01` : `${y}-${iki(m + 1)}-01`;
  return { bas, sonraki };
}

// "2026-11-13" -> "13.11.2026"
export function tarihTR(t: string): string {
  return t.split("-").reverse().join(".");
}

// "1.250,50" -> 1250.5 | "1250,5" -> 1250.5 | "1.250" -> 1250 | "12.5" -> 12.5
export function sayiyaCevir(s: string): number {
  const t = s.trim();
  if (t.includes(",")) return Number(t.replace(/\./g, "").replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(t)) return Number(t.replace(/\./g, ""));
  return Number(t);
}
