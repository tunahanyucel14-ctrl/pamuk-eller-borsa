"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, CalendarClock, Trash2, Bell, BellRing, Wallet, ShieldCheck } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { kart, girdi, dugme, baslik, etiket } from "../../../lib/ui";

type Bill = { id: string; name: string; amount: number; due_day: number; category: string; active: boolean };
type Debt = { id: string; name: string; monthly_payment: number; due_day: number | null; remaining_amount: number };
type ReminderSettings = { salaryDay: string; leadDays: number };
const SETTINGS_KEY = "pamuk-reminder-settings-v1";
const SENT_KEY = "pamuk-reminder-sent-v1";

function dateForDay(day: number, from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let due = new Date(today.getFullYear(), today.getMonth(), Math.min(day, new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()));
  if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(day, new Date(today.getFullYear(), today.getMonth() + 2, 0).getDate()));
  return due;
}
function daysUntil(date: Date) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86400000);
}
function dateLabel(date: Date) { return date.toLocaleDateString("tr-TR", { day: "numeric", month: "long" }); }

export default function OdemelerPage() {
  const { aileId, kullaniciId, yazabilir, yonetebilir } = useAile();
  const [rows, setRows] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("1");
  const [category, setCategory] = useState("Fatura");
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<ReminderSettings>({ salaryDay: "", leadDays: 3 });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [upcoming, setUpcoming] = useState<{ title: string; detail: string; date: Date; kind: "salary" | "bill" | "debt" }[]>([]);

  const load = useCallback(async () => {
    const [billsResult, debtsResult] = await Promise.all([
      supabase.from("family_bills").select("*").eq("family_id", aileId).eq("active", true).order("due_day"),
      supabase.from("family_debts").select("id,name,monthly_payment,due_day,remaining_amount").eq("family_id", aileId),
    ]);
    if (billsResult.error || debtsResult.error) setError((billsResult.error || debtsResult.error)?.message || "Kayıtlar yüklenemedi.");
    else { setRows((billsResult.data || []) as Bill[]); setDebts((debtsResult.data || []) as Debt[]); }
  }, [aileId]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
      if (stored && typeof stored === "object") setSettings({
        salaryDay: typeof stored.salaryDay === "string" ? stored.salaryDay : "",
        leadDays: [1, 3, 5, 7].includes(Number(stored.leadDays)) ? Number(stored.leadDays) : 3,
      });
    } catch { /* Varsayılan ayarlar kullanılır. */ }
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0) + debts.filter(row=>Number(row.remaining_amount)>0).reduce((sum, row) => sum + Number(row.monthly_payment), 0);
  const debtsWithoutDueDate=debts.filter(row=>Number(row.remaining_amount)>0&&Number(row.monthly_payment)>0&&!row.due_day).length;
  const billEvents = rows.map(row => ({ title: row.name, detail: tl(Number(row.amount)), date: dateForDay(row.due_day), kind: "bill" as const }));
  const debtEvents = debts.filter(row => Number(row.monthly_payment) > 0 && Number(row.remaining_amount) > 0 && row.due_day).map(row => ({
    title: row.name + " taksiti", detail: tl(Number(row.monthly_payment)), date: dateForDay(Number(row.due_day)), kind: "debt" as const,
  }));
  const salaryEvents = settings.salaryDay ? [{
    title: "Maaş günü",
    detail: "Maaşını kontrol etmeyi unutma.",
    date: dateForDay(Number(settings.salaryDay)),
    kind: "salary" as const,
  }] : [];
  const events = [...billEvents, ...debtEvents, ...salaryEvents].sort((a, b) => a.date.getTime() - b.date.getTime());

  useEffect(() => {
    const next = events.map(event => ({ ...event, days: daysUntil(event.date) })).filter(event => event.days >= 0 && event.days <= settings.leadDays);
    setUpcoming(next);
    if (permission !== "granted" || next.length === 0) return;
    let sent: string[] = [];
    try { sent = JSON.parse(localStorage.getItem(SENT_KEY) || "[]"); } catch { sent = []; }
    let changed = false;
    for (const event of next) {
      const eventKey = [event.kind, event.title, event.date.getFullYear(), event.date.getMonth() + 1, event.date.getDate()].join(":");
      if (sent.includes(eventKey)) continue;
      const timing = event.days === 0 ? "Bugün" : event.days + " gün sonra";
      try {
        new Notification("Pamuk Eller · " + (event.kind === "salary" ? "Maaş hatırlatması" : event.kind === "debt" ? "Borç taksiti hatırlatması" : "Ödeme hatırlatması"), {
          body: event.title + " · " + timing + " (" + dateLabel(event.date) + ") · " + event.detail,
          icon: "/icon.svg",
          tag: eventKey,
        });
        sent.push(eventKey); changed = true;
      } catch { /* Tarayıcı bildirimi oluşturulamazsa uygulama içi hatırlatma gösterilir. */ }
    }
    if (changed) localStorage.setItem(SENT_KEY, JSON.stringify(sent.slice(-100)));
  // The list is intentionally rechecked when payment rows or reminder preferences change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, debts, settings, permission]);

  function saveSettings() {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  }

  async function enableNotifications() {
    if (!("Notification" in window)) { setPermission("unsupported"); return; }
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    const parsedAmount = Number(amount);
    const parsedDay = Number(day);
    if (!name.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !Number.isInteger(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      setError("Ödeme adı, pozitif tutar ve 1–31 arasında geçerli bir gün gir.");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("family_bills").insert({
        family_id: aileId, created_by: kullaniciId, name: name.trim(), amount: Math.round(parsedAmount * 100) / 100, due_day: parsedDay, category: category.trim() || "Diğer",
      });
      if (error) throw error;
      setName(""); setAmount("");
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ödeme kaydedilemedi. Bağlantını kontrol edip tekrar dene.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-accent">Ödeme takvimi</p>
        <h1 className={baslik}>Düzenli ödemeler</h1>
        <p className="text-sm text-muted">Faturalarını, taksitlerini ve maaş gününü takip et; yaklaşan tarihler için hatırlatma al.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className={kart}>
          <p className="text-sm text-muted">Aylık düzenli ödeme toplamı</p>
          <p className="mt-2 text-2xl font-black">{tl(total)}</p>
        </div>
        <div className={kart}>
          <p className="text-sm text-muted">Yaklaşan hatırlatmalar</p>
          <p className="mt-2 text-2xl font-black">{upcoming.length}</p>
          <p className="mt-1 text-xs text-muted">Seçtiğin bildirim aralığındaki maaş ve ödemeler</p>
        </div>
      </div>

      <section className={kart + " space-y-4"}>
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-accent/10 p-3 text-accent"><Bell size={19}/></span>
          <div><h2 className="font-bold">Maaş ve ödeme bildirimleri</h2><p className="text-xs text-muted">Hatırlatma tercihlerini bu cihazda sakla.</p></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={etiket}>Maaş günü (ayın kaçında?)</label>
            <input type="number" min="1" max="31" className={girdi} placeholder="Örn. 15" value={settings.salaryDay} onChange={e => setSettings(old => ({ ...old, salaryDay: e.target.value }))}/>
            <p className="mt-1 text-[11px] text-muted">Maaş gününü girersen yaklaşınca hatırlatırım.</p>
          </div>
          <div>
            <label className={etiket}>Kaç gün önceden hatırlatayım?</label>
            <select className={girdi} value={settings.leadDays} onChange={e => setSettings(old => ({ ...old, leadDays: Number(e.target.value) }))}>
              <option value={1}>1 gün önce</option><option value={3}>3 gün önce</option><option value={5}>5 gün önce</option><option value={7}>7 gün önce</option>
            </select>
            <p className="mt-1 text-[11px] text-muted">Maaş ve kayıtlı ödemeler için geçerlidir.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={saveSettings} className={dugme}>Hatırlatma ayarlarını kaydet</button>
          <button type="button" onClick={enableNotifications} className="inline-flex items-center gap-2 rounded-xl border border-line bg-inner px-4 py-2.5 text-sm font-bold hover:border-accent">
            <BellRing size={16}/> {permission === "granted" ? "Bildirimler açık" : "Bildirimleri etkinleştir"}
          </button>
        </div>
        {saved && <p className="text-xs font-semibold text-up">Hatırlatma tercihlerin kaydedildi.</p>}
        {permission === "denied" && <p className="text-xs text-down">Tarayıcı bildirim izni kapalı. Site ayarlarından bildirimlere izin vermelisin.</p>}
        {permission === "unsupported" && <p className="text-xs text-down">Bu tarayıcı bildirimleri desteklemiyor. Yaklaşan hatırlatmalar uygulama içinde görünür.</p>}
        {permission === "default" && <p className="text-xs text-muted">Bildirim almak için önce izin vermelisin. Tarayıcı izin penceresini açacağız.</p>}
        <p className="flex items-start gap-2 rounded-xl bg-inner p-3 text-xs leading-5 text-muted"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent"/> Şimdilik hatırlatmalar, Pamuk Eller bu tarayıcıda açıkken kontrol edilir. Uygulama kapalıyken veya telefonda tarayıcı tamamen kapalıyken bildirim garantisi vermez.</p>
      </section>

      {upcoming.length > 0 && <section className={kart}>
        <h2 className="mb-3 flex items-center gap-2 font-bold"><BellRing size={17} className="text-accent"/> Yaklaşan hatırlatmalar</h2>
        <div className="space-y-2">{upcoming.map((event, index) => <div key={event.kind + event.title + index} className="flex items-center justify-between gap-3 rounded-xl bg-inner p-3">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-accent/10 p-2 text-accent">{event.kind === "salary" ? <Wallet size={17}/> : <CalendarClock size={17}/>}</span><div><p className="text-sm font-bold">{event.title}</p><p className="text-xs text-muted">{event.detail} · {dateLabel(event.date)}</p></div></div>
          <span className="shrink-0 text-xs font-bold text-accent">{daysUntil(event.date) === 0 ? "Bugün" : daysUntil(event.date) + " gün kaldı"}</span>
        </div>)}</div>
      </section>}

      {error && <p className="text-sm text-down">{error}</p>}
      {debtsWithoutDueDate>0&&<p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted">{debtsWithoutDueDate} açık borçta ödeme günü tanımlı değil. Bu borçlar için hatırlatma oluşturulamaz; Borçlar bölümünden ödeme gününü ekle.</p>}
      <section className={kart}>
        <h2 className="mb-3 font-bold">Ödeme listesi</h2>
        {rows.length === 0 ? <p className="text-sm text-muted">Henüz düzenli ödeme yok.</p> : <div className="space-y-2">
          {rows.map(row => {
            const due = dateForDay(row.due_day); const left = daysUntil(due);
            return <div key={row.id} className="flex items-center justify-between gap-3 rounded-xl bg-inner p-3">
              <div className="flex min-w-0 items-center gap-3"><span className="rounded-xl bg-accent/10 p-2 text-accent"><CalendarClock size={18}/></span><div className="min-w-0"><b className="text-sm">{row.name}</b><p className="text-xs text-muted">Her ayın {row.due_day}. günü · {row.category}</p><p className={"mt-1 text-[11px] font-semibold " + (left === 0 ? "text-down" : "text-accent")}>{left === 0 ? "Bugün ödenmeli" : left + " gün sonra · " + dateLabel(due)}</p></div></div>
              <div className="flex items-center gap-3"><b className="shrink-0 text-sm">{tl(Number(row.amount))}</b>{yonetebilir && <button onClick={async () => { if (!window.confirm(row.name + " ödeme kaydı silinsin mi?")) return; const { error } = await supabase.from("family_bills").delete().eq("id", row.id).eq("family_id", aileId); if (error) setError(error.message); else await load(); }} aria-label="Ödemeyi sil" className="text-muted hover:text-down"><Trash2 size={15}/></button>}</div>
            </div>;
          })}
        </div>}
      </section>

      {yazabilir && <form onSubmit={add} className={kart + " grid gap-3 sm:grid-cols-2"}>
        <h2 className="font-bold sm:col-span-2">Ödeme ekle</h2>
        <div><label className={etiket}>Ödeme adı</label><input required className={girdi} value={name} onChange={e => setName(e.target.value)} placeholder="Kira, elektrik, internet..."/></div>
        <div><label className={etiket}>Tutar (TL)</label><input required type="number" min="0.01" step="0.01" className={girdi} value={amount} onChange={e => setAmount(e.target.value)}/></div>
        <div><label className={etiket}>Ödeme günü</label><input required type="number" min="1" max="31" className={girdi} value={day} onChange={e => setDay(e.target.value)}/></div>
        <div><label className={etiket}>Kategori</label><input className={girdi} value={category} onChange={e => setCategory(e.target.value)}/></div>
        <button className={dugme + " sm:col-span-2"}><Plus size={16} className="inline"/> Ödeme ekle</button>
      </form>}
    </div>
  );
}
