"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Plus, Trash2, Wallet } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { sayiyaCevir, tl } from "../../../lib/finans";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";

type IncomeRule = {
  id: string;
  name: string;
  income_type: "maas" | "ek_odeme" | "nobet" | "prim" | "kira" | "diger";
  expected_amount: number;
  pay_day: number;
  active: boolean;
  notes: string;
};
const TYPES = [
  { id: "maas", label: "Maaş" },
  { id: "ek_odeme", label: "Ek ödeme" },
  { id: "nobet", label: "Nöbet / fazla mesai" },
  { id: "prim", label: "Prim / ikramiye" },
  { id: "kira", label: "Kira geliri" },
  { id: "diger", label: "Diğer" },
] as const;

export default function GelirPlanlamaPage() {
  const { aileId, kullaniciId, yazabilir } = useAile();
  const [rows, setRows] = useState<IncomeRule[]>([]);
  const [name, setName] = useState("Maaş");
  const [type, setType] = useState<IncomeRule["income_type"]>("maas");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("15");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("family_income_rules").select("*").eq("family_id", aileId).order("pay_day");
    if (error) setError(error.message);
    else setRows((data || []) as IncomeRule[]);
  }, [aileId]);

  useEffect(() => { void load(); }, [load]);

  const activeRows = useMemo(() => rows.filter((row) => row.active), [rows]);
  const monthlyTotal = activeRows.reduce((sum, row) => sum + Number(row.expected_amount), 0);
  const byType = TYPES.map((item) => ({
    ...item,
    total: activeRows.filter((row) => row.income_type === item.id).reduce((sum, row) => sum + Number(row.expected_amount), 0),
  })).filter((item) => item.total > 0);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    const parsed = sayiyaCevir(amount);
    const parsedDay = Number(day);
    if (!name.trim() || !Number.isFinite(parsed) || parsed <= 0 || !Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setError("Gelir adı, pozitif tutar ve 1–31 arasında ödeme günü gir.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("family_income_rules").insert({
      family_id: aileId, created_by: kullaniciId, name: name.trim(), income_type: type,
      expected_amount: Math.round(parsed * 100) / 100, pay_day: parsedDay, notes: notes.trim(),
    });
    if (error) setError(error.message);
    else { setName(""); setAmount(""); setNotes(""); await load(); }
    setBusy(false);
  }

  async function toggle(row: IncomeRule) {
    setError("");
    const { error } = await supabase.from("family_income_rules").update({ active: !row.active }).eq("id", row.id).eq("family_id", aileId);
    if (error) setError(error.message); else await load();
  }

  async function remove(row: IncomeRule) {
    if (!window.confirm(row.name + " gelir planı silinsin mi?")) return;
    const { error } = await supabase.from("family_income_rules").delete().eq("id", row.id).eq("family_id", aileId);
    if (error) setError(error.message); else await load();
  }

  return <div className="space-y-5">
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-accent">Maaş ve düzenli gelir takvimi</p>
      <h1 className={baslik}>Gelir Planlama</h1>
      <p className="text-sm text-muted">Maaşını, ek ödemeni, nöbet ücretlerini ve diğer düzenli gelirlerini ayrı ayrı planla. Bu kayıtlar tahmindir; gerçekleşen gelir olarak işlem defterine otomatik yazılmaz.</p>
    </header>

    <div className="grid gap-3 sm:grid-cols-2">
      <div className={kart}><p className="text-sm text-muted">Planlanan aylık gelir</p><p className="mt-2 text-2xl font-black text-up">{tl(monthlyTotal)}</p><p className="mt-1 text-xs text-muted">{activeRows.length} aktif gelir kalemi</p></div>
      <div className={kart}><p className="text-sm text-muted">Gelir çeşitleri</p><div className="mt-2 flex flex-wrap gap-2">{byType.length ? byType.map((x) => <span key={x.id} className="rounded-full bg-inner px-3 py-1 text-xs">{x.label}: <b>{tl(x.total)}</b></span>) : <span className="text-sm text-muted">Henüz plan eklenmedi.</span>}</div></div>
    </div>

    {error && <p role="alert" className="rounded-xl bg-down/10 p-3 text-sm text-down">{error}</p>}

    <section className={kart + " space-y-3"}>
      <h2 className="font-bold">Gelir takvimi</h2>
      {rows.length === 0 ? <p className="text-sm text-muted">Henüz düzenli gelir planı eklemedin.</p> : <div className="space-y-2">
        {rows.map((row) => <article key={row.id} className={"flex flex-wrap items-center justify-between gap-3 rounded-xl bg-inner p-3 " + (!row.active ? "opacity-60" : "")}>
          <div className="flex min-w-0 items-center gap-3"><span className="rounded-xl bg-up/10 p-2 text-up"><CalendarClock size={18}/></span><div className="min-w-0"><p className="font-semibold">{row.name}</p><p className="text-xs text-muted">{TYPES.find((x) => x.id === row.income_type)?.label} · Her ayın {row.pay_day}. günü {row.notes ? "· " + row.notes : ""}</p></div></div>
          <div className="flex items-center gap-3"><div className="text-right"><b>{tl(Number(row.expected_amount))}</b><p className="text-xs text-muted">{row.active ? "Aktif" : "Pasif"}</p></div>{yazabilir && <><button onClick={() => void toggle(row)} className="rounded-lg border border-line px-3 py-2 text-xs">{row.active ? "Duraklat" : "Etkinleştir"}</button><button onClick={() => void remove(row)} aria-label="Gelir planını sil" className="text-muted hover:text-down"><Trash2 size={16}/></button></>}</div>
        </article>)}
      </div>}
    </section>

    {yazabilir && <form onSubmit={add} className={kart + " grid gap-3 sm:grid-cols-2"}>
      <h2 className="font-bold sm:col-span-2"><Plus size={17} className="mr-1 inline"/> Düzenli gelir ekle</h2>
      <div><label className={etiket}>Gelir adı</label><input className={girdi} value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn. Hastane maaşı" required/></div>
      <div><label className={etiket}>Gelir türü</label><select className={girdi} value={type} onChange={(e) => setType(e.target.value as IncomeRule["income_type"])}>{TYPES.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></div>
      <div><label className={etiket}>Beklenen aylık tutar (TL)</label><input className={girdi} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Örn. 65000" required/></div>
      <div><label className={etiket}>Beklenen ödeme günü</label><input className={girdi} type="number" min="1" max="31" value={day} onChange={(e) => setDay(e.target.value)} required/></div>
      <div className="sm:col-span-2"><label className={etiket}>Not (isteğe bağlı)</label><input className={girdi} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Örn. Nöbet sayısına göre değişir"/></div>
      <p className="text-xs leading-5 text-muted sm:col-span-2">Nöbet ve ek ödeme gibi değişken gelirlerde ortalama beklenen tutarı yaz. Gerçekleşen tutarı ayrıca İşlemler bölümüne kaydet; böylece tahmin ile gerçek gelir birbirine karışmaz.</p>
      <button disabled={busy} className={dugme + " sm:col-span-2"}><Wallet size={16} className="mr-1 inline"/>{busy ? "Kaydediliyor..." : "Gelir planını kaydet"}</button>
    </form>}
  </div>;
}
