"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUp, FileText, ShieldCheck, AlertTriangle, CheckCircle2, Trash2, Save, CalendarClock, Landmark } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { tl } from "../../../lib/finans";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";

type Installment = {
  installment_no: number; due_date: string; installment_amount: string;
  principal_amount: string; interest_amount: string; fees_amount: string; remaining_principal: string;
};
type LoanPlan = {
  bank_name: string; loan_type: "konut" | "ihtiyac" | "tasit" | "ticari" | "diger";
  currency: string; principal_amount: string; remaining_amount: string; annual_interest_rate: string;
  monthly_interest_rate: string; schedule: Installment[];
};
type ExistingDebt = { id: string; name: string; creditor: string; created_by: string };
type SavedPlan = {
  id: string; debt_id: string | null; bank_name: string; loan_type: string; currency: string;
  principal_amount: number; remaining_amount: number; installment_count: number; first_due_date: string; last_due_date: string; status: string;
};
type SavedInstallment = { id: string; installment_no: number; due_date: string; installment_amount: number; principal_amount: number | null; interest_amount: number | null; fees_amount: number | null; remaining_principal: number | null; status: string; paid_at: string | null };
type UploadRef = { path: string; mimeType: string };

const TYPES = [
  { value: "konut", label: "Konut kredisi" },
  { value: "ihtiyac", label: "İhtiyaç kredisi" },
  { value: "tasit", label: "Taşıt kredisi" },
  { value: "ticari", label: "Ticari kredi" },
  { value: "diger", label: "Diğer" }
] as const;

function numberFromTR(raw: string): number {
  const value = raw.trim().replace(/[\s₺]/g, "");
  if (value.includes(",") && value.includes(".")) return Number(value.lastIndexOf(",") > value.lastIndexOf(".") ? value.replace(/\./g, "").replace(",", ".") : value.replace(/,/g, ""));
  if (value.includes(",")) return Number(value.replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(value)) return Number(value.replace(/\./g, ""));
  return Number(value);
}
function optionalNumber(raw: string): number | null {
  if (!raw.trim()) return null;
  const value = numberFromTR(raw);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : null;
}
function formatAmount(value: number, currency: string) {
  try { return new Intl.NumberFormat("tr-TR", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); }
  catch { return value.toLocaleString("tr-TR", { maximumFractionDigits: 2 }) + " " + currency; }
}
function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function mimeFor(file: File): string {
  const mime = file.type.toLowerCase();
  if (["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(mime)) return mime;
  if (!mime && /\.pdf$/i.test(file.name)) return "application/pdf";
  if (!mime && /\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (!mime && /\.png$/i.test(file.name)) return "image/png";
  if (!mime && /\.webp$/i.test(file.name)) return "image/webp";
  return "";
}

export default function KrediPlanlariPage() {
  const { aileId, kullaniciId, yazabilir, yonetebilir } = useAile();
  const [plan, setPlan] = useState<LoanPlan | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [uploads, setUploads] = useState<UploadRef[]>([]);
  const [debts, setDebts] = useState<ExistingDebt[]>([]);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState("");
  const [expandedInstallments, setExpandedInstallments] = useState<SavedInstallment[]>([]);
  const [existingDebtId, setExistingDebtId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    const [debtResult, planResult] = await Promise.all([
      supabase.from("family_debts").select("id,name,creditor,created_by").eq("family_id", aileId).eq("debt_type", "kredi").order("created_at", { ascending: false }),
      supabase.from("family_loan_plans").select("id,debt_id,bank_name,loan_type,currency,principal_amount,remaining_amount,installment_count,first_due_date,last_due_date,status").eq("family_id", aileId).order("created_at", { ascending: false })
    ]);
    if (debtResult.error || planResult.error) {
      setError((debtResult.error || planResult.error)?.message || "Kredi kayıtları yüklenemedi.");
      return;
    }
    const allDebts = (debtResult.data || []) as ExistingDebt[];
    setDebts(yonetebilir ? allDebts : allDebts.filter(d => d.created_by === kullaniciId));
    setSavedPlans((planResult.data || []) as SavedPlan[]);
  }, [aileId, kullaniciId, yonetebilir]);

  useEffect(() => { void load(); }, [load]);

  async function removeUploads(paths = uploads) {
    const list = paths.map(x => x.path);
    if (list.length) await supabase.storage.from("receipts").remove(list);
  }

  async function analyze(files?: FileList | null) {
    setError(""); setSuccess("");
    if (!yazabilir) { setError("Bu aile alanında kredi planı ekleme yetkin yok."); return; }
    if (busy) return;
    const selected = Array.from(files || []);
    if (!selected.length) return;
    if (selected.length > 5) { setError("En fazla 5 görsel veya tek PDF seçebilirsin."); return; }
    if (selected.some(f => f.size > 6 * 1024 * 1024) || selected.reduce((n, f) => n + f.size, 0) > 12 * 1024 * 1024) {
      setError("Her dosya en fazla 6 MB, toplam yükleme en fazla 12 MB olabilir."); return;
    }
    if (selected.some(f => !mimeFor(f))) { setError("PDF, JPG, PNG veya WEBP dosyaları destekleniyor."); return; }
    const pdfs = selected.filter(f => mimeFor(f) === "application/pdf");
    if (pdfs.length > 1 || (pdfs.length && selected.length > 1)) { setError("PDF dosyasını tek başına yükle; birden fazla görseli birlikte seçebilirsin."); return; }
    setBusy(true);
    await removeUploads();
    setUploads([]); setPlan(null); setWarnings([]);
    const uploaded: UploadRef[] = [];
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session?.access_token) throw new Error("Oturumun doğrulanamadı. Yeniden giriş yap.");
      for (const file of selected) {
        const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, "-").slice(-100) || (mimeFor(file) === "application/pdf" ? "kredi-plani.pdf" : "kredi-plani.png");
        const path = sessionData.session.user.id + "/" + Date.now() + "-" + crypto.randomUUID().slice(0, 8) + "-" + safeName;
        const mimeType = mimeFor(file);
        const { error: uploadError } = await supabase.storage.from("receipts").upload(path, file, { contentType: mimeType, upsert: false });
        if (uploadError) throw new Error("Belge güvenli alana yüklenemedi: " + uploadError.message);
        uploaded.push({ path, mimeType });
      }
      const response = await fetch("/api/loan-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + sessionData.session.access_token },
        body: JSON.stringify({ files: uploaded })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Kredi ödeme planı okunamadı.");
      const raw = data.plan;
      if (!raw || !Array.isArray(raw.schedule) || !raw.schedule.length) throw new Error("Belgeden ödeme tablosu çıkarılamadı.");
      setPlan({
        bank_name: raw.bank_name || "",
        loan_type: raw.loan_type || "diger",
        currency: raw.currency || "",
        principal_amount: raw.principal_amount === null ? "" : String(raw.principal_amount),
        remaining_amount: raw.remaining_amount === null ? "" : String(raw.remaining_amount),
        annual_interest_rate: raw.annual_interest_rate === null ? "" : String(raw.annual_interest_rate),
        monthly_interest_rate: raw.monthly_interest_rate === null ? "" : String(raw.monthly_interest_rate),
        schedule: raw.schedule.map((r: any) => ({
          installment_no: Number(r.installment_no), due_date: String(r.due_date),
          installment_amount: String(r.installment_amount),
          principal_amount: r.principal_amount === null ? "" : String(r.principal_amount),
          interest_amount: r.interest_amount === null ? "" : String(r.interest_amount),
          fees_amount: r.fees_amount === null ? "" : String(r.fees_amount),
          remaining_principal: r.remaining_principal === null ? "" : String(r.remaining_principal)
        }))
      });
      setWarnings(Array.isArray(data.warnings) ? data.warnings : []);
      setFileName(selected.length === 1 ? selected[0].name : selected.length + " görselden okunan kredi planı");
      setUploads(uploaded);
      setExistingDebtId("");
    } catch (e) {
      await removeUploads(uploaded);
      setError(e instanceof Error ? e.message : "Kredi planı analiz edilemedi.");
    } finally {
      setBusy(false);
    }
  }

  function updatePlan<K extends keyof LoanPlan>(key: K, value: LoanPlan[K]) {
    setPlan(current => current ? { ...current, [key]: value } : current);
  }
  function updateInstallment(index: number, key: keyof Installment, value: string) {
    setPlan(current => current ? {
      ...current,
      schedule: current.schedule.map((row, i) => i === index ? { ...row, [key]: value } : row)
    } : current);
  }

  async function save() {
    if (!plan || busy) return;
    setError(""); setSuccess("");
    const principal = numberFromTR(plan.principal_amount);
    if (!plan.bank_name.trim()) { setError("Banka adını kontrol edip gir."); return; }
    if (!/^[A-Z]{3}$/.test(plan.currency)) { setError("Geçerli bir para birimi seç."); return; }
    if (!Number.isFinite(principal) || principal <= 0) { setError("Kredi anaparasını kontrol et."); return; }
    const remaining = plan.remaining_amount.trim() ? numberFromTR(plan.remaining_amount) : NaN;
    if (!Number.isFinite(remaining) || remaining < 0 || remaining > principal) { setError("Güncel kalan borcu doğrula. Belgede açıkça yoksa bankanın güncel borç ekranındaki tutarı gir."); return; }
    if (!plan.schedule.length || plan.schedule.length > 600) { setError("Ödeme tablosu 1–600 taksit içermeli."); return; }
    const optionalFields = plan.schedule.flatMap(row => [row.principal_amount, row.interest_amount, row.fees_amount, row.remaining_principal]).filter(value => value.trim());
    if (optionalFields.some(value => { const parsed = numberFromTR(value); return !Number.isFinite(parsed) || parsed < 0; })) { setError("Taksit anapara/faiz/masraf alanlarında geçersiz değer var."); return; }
    const schedule = plan.schedule.map((row, index) => {
      const amount = numberFromTR(row.installment_amount);
      const optional = (value: string) => value.trim() ? optionalNumber(value) : null;
      return {
        installment_no: row.installment_no,
        due_date: row.due_date,
        installment_amount: amount,
        principal_amount: optional(row.principal_amount),
        interest_amount: optional(row.interest_amount),
        fees_amount: optional(row.fees_amount),
        remaining_principal: optional(row.remaining_principal)
      };
    });
    if (schedule.some((row, index) => row.installment_no !== index + 1 || !validDate(row.due_date) || !Number.isFinite(row.installment_amount) || row.installment_amount <= 0)) {
      setError("Taksit numaralarını, tarihleri ve tutarları kontrol et."); return;
    }
    if (schedule.some((row, index) => index > 0 && row.due_date <= schedule[index - 1].due_date)) {
      setError("Taksit tarihleri kronolojik sırada olmalı."); return;
    }
    if (schedule.some(row => [row.principal_amount, row.interest_amount, row.fees_amount, row.remaining_principal].some(v => v !== null && (!Number.isFinite(v) || v < 0)))) {
      setError("Anapara, faiz, masraf ve kalan tutar alanlarında negatif veya geçersiz değer var."); return;
    }
    const annualRate = plan.annual_interest_rate.trim() ? numberFromTR(plan.annual_interest_rate) : null;
    const monthlyRate = plan.monthly_interest_rate.trim() ? numberFromTR(plan.monthly_interest_rate) : null;
    if ((annualRate !== null && (!Number.isFinite(annualRate) || annualRate < 0 || annualRate > 200)) ||
        (monthlyRate !== null && (!Number.isFinite(monthlyRate) || monthlyRate < 0 || monthlyRate > 20))) {
      setError("Faiz oranı geçerli aralıkta değil."); return;
    }
    if (plan.currency !== "TRY" && existingDebtId) { setError("Mevcut borç kaydına bağlamak için para birimi TRY olmalı."); return; }
    setBusy(true);
    try {
      const payload = {
        bank_name: plan.bank_name.trim(),
        loan_type: plan.loan_type,
        currency: plan.currency,
        principal_amount: principal,
        remaining_amount: remaining,
        annual_interest_rate: annualRate,
        monthly_interest_rate: monthlyRate,
        installment_count: schedule.length,
        first_due_date: schedule[0].due_date,
        file_name: fileName,
        storage_path: uploads[0]?.path || null,
        debt_id: existingDebtId || null,
        schedule
      };
      const { data, error } = await supabase.rpc("save_family_loan_plan", { p_family_id: aileId, p_plan: payload });
      if (error) throw error;
      setSuccess(schedule.length + " taksit, " + plan.bank_name + " kredi planına kaydedildi. Ödemeler takvimine işlendi.");
      setPlan(null); setWarnings([]); setUploads([]); setFileName(""); setExistingDebtId("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kredi planı kaydedilemedi.");
    } finally { setBusy(false); }
  }

  const availableDebts = debts.filter(debt => !savedPlans.some(saved => saved.debt_id === debt.id));

  async function toggleSavedPlan(planId: string) {
    if (expandedPlanId === planId) { setExpandedPlanId(""); setExpandedInstallments([]); return; }
    setError("");
    const { data, error } = await supabase.from("family_loan_installments")
      .select("id,installment_no,due_date,installment_amount,principal_amount,interest_amount,fees_amount,remaining_principal,status,paid_at")
      .eq("family_id", aileId).eq("plan_id", planId).order("installment_no").limit(600);
    if (error) { setError(error.message); return; }
    setExpandedInstallments((data || []) as SavedInstallment[]);
    setExpandedPlanId(planId);
  }

  async function cancelPlan() {
    if (busy) return;
    setBusy(true);
    await removeUploads();
    setUploads([]); setPlan(null); setWarnings([]); setFileName(""); setExistingDebtId("");
    setBusy(false);
  }

  return <div className="space-y-5">
    <header>
      <p className="text-xs font-bold uppercase tracking-widest text-accent">Belge zekâsı</p>
      <h1 className={baslik}>Kredi Planlarım</h1>
      <p className="text-sm text-muted">Banka kredi sözleşmeni veya aylık ödeme planını yükle. Bankayı tanıyıp taksitleri vade vade çıkaralım.</p>
    </header>

    <section className={kart + " space-y-3"}>
      <div className="flex items-center gap-3"><span className="rounded-xl bg-accent/10 p-3 text-accent"><FileUp size={20}/></span><div><h2 className="font-bold">Kredi belgesi yükle</h2><p className="text-xs text-muted">PDF veya JPG, PNG, WEBP · Tek PDF ya da en fazla 5 görsel · Dosya başına 6 MB</p></div></div>
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-inner p-6 text-center hover:border-accent">
        <FileText size={28} className="text-accent"/>
        <b className="text-sm">{busy ? "Belge analiz ediliyor..." : "Dosya seç veya buraya dokun"}</b>
        <span className="text-xs text-muted">Banka adı, kredi türü, faiz ve tüm taksitler okunmaya çalışılır.</span>
        <input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" multiple disabled={busy || !yazabilir} onChange={e => { void analyze(e.target.files); e.currentTarget.value = ""; }}/>
      </label>
      {!yazabilir && <p className="text-xs text-muted">Görüntüleyici rolünde belge yükleme kapalıdır.</p>}
      {busy && <p className="text-xs text-accent">Belge güvenli alana yükleniyor ve yapay zekâ ile analiz ediliyor. Uzun ödeme planları biraz sürebilir.</p>}
    </section>

    {error && <p role="alert" className="rounded-xl border border-down/30 bg-down/10 p-3 text-sm text-down">{error}</p>}
    {success && <p role="status" className="rounded-xl border border-up/30 bg-up/10 p-3 text-sm text-up"><CheckCircle2 size={16} className="mr-2 inline"/>{success}</p>}

    {plan && <section className={kart + " space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-accent">Analiz tamamlandı · kontrol gerekli</p><h2 className="text-lg font-bold">{fileName}</h2></div><span className="rounded-full bg-up/10 px-3 py-1 text-xs font-bold text-up">{plan.schedule.length} taksit bulundu</span></div>
      {warnings.length > 0 && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3"><p className="mb-2 flex items-center gap-2 text-sm font-bold"><AlertTriangle size={16}/> Kontrol edilmesi gerekenler</p><ul className="list-disc space-y-1 pl-5 text-xs text-muted">{warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className={etiket}>Banka adı</label><input className={girdi} value={plan.bank_name} onChange={e=>updatePlan("bank_name",e.target.value)} placeholder="Örn. Garanti BBVA"/></div>
        <div><label className={etiket}>Kredi türü</label><select className={girdi} value={plan.loan_type} onChange={e=>updatePlan("loan_type",e.target.value as LoanPlan["loan_type"])}>{TYPES.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></div>
        <div><label className={etiket}>Para birimi</label><select className={girdi} value={plan.currency} onChange={e=>updatePlan("currency",e.target.value)}><option value="">Para birimi seç</option>{["TRY","USD","EUR","GBP","CHF"].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        <div><label className={etiket}>İlk kredi anaparası</label><input className={girdi} inputMode="decimal" value={plan.principal_amount} onChange={e=>updatePlan("principal_amount",e.target.value)} placeholder="Örn. 1.500.000"/></div>
        <div><label className={etiket}>Güncel kalan borç (zorunlu)</label><input className={girdi} inputMode="decimal" value={plan.remaining_amount} onChange={e=>updatePlan("remaining_amount",e.target.value)} placeholder="Belgede yoksa elle gir"/></div>
        <div><label className={etiket}>Aylık nominal faiz (%)</label><input className={girdi} inputMode="decimal" value={plan.monthly_interest_rate} onChange={e=>updatePlan("monthly_interest_rate",e.target.value)} placeholder="Belgede varsa"/></div>
        <div><label className={etiket}>Yıllık nominal faiz (%)</label><input className={girdi} inputMode="decimal" value={plan.annual_interest_rate} onChange={e=>updatePlan("annual_interest_rate",e.target.value)} placeholder="Belgede varsa"/></div>
      </div>
      {plan.currency === "TRY" && availableDebts.length > 0 && <div><label className={etiket}>Mevcut kredi borcuyla eşleştir (isteğe bağlı)</label><select className={girdi} value={existingDebtId} onChange={e=>setExistingDebtId(e.target.value)}><option value="">Yeni kredi borcu oluştur</option>{availableDebts.map(d=><option key={d.id} value={d.id}>{d.creditor || d.name} · {d.name}</option>)}</select><p className="mt-1 text-xs text-muted">Mevcut kayıt seçilirse borç bilgileri yeni planla güncellenir; seçilmezse yeni bir borç kaydı açılır.</p></div>}
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">Aylık taksit tablosu</h3><span className="text-xs text-muted">Tutarlar belgeye göre düzenlenebilir</span></div>
      <div className="max-h-[520px] overflow-auto rounded-xl border border-line">
        <table className="w-full min-w-[840px] text-xs">
          <thead className="sticky top-0 bg-inner"><tr className="text-left text-muted"><th className="p-2">No</th><th className="p-2">Vade</th><th className="p-2 text-right">Taksit</th><th className="p-2 text-right">Anapara</th><th className="p-2 text-right">Faiz</th><th className="p-2 text-right">Masraf</th><th className="p-2 text-right">Kalan anapara</th></tr></thead>
          <tbody>{plan.schedule.map((row,i)=><tr key={row.installment_no} className="border-t border-line/70"><td className="p-2 font-semibold">{row.installment_no}</td><td className="p-2"><input aria-label={row.installment_no+" vade tarihi"} type="date" className="w-36 rounded-lg border border-line bg-card px-2 py-1" value={row.due_date} onChange={e=>updateInstallment(i,"due_date",e.target.value)}/></td>{(["installment_amount","principal_amount","interest_amount","fees_amount","remaining_principal"] as const).map(key=><td key={key} className="p-2"><input aria-label={row.installment_no+" "+key} inputMode="decimal" className="w-28 rounded-lg border border-line bg-card px-2 py-1 text-right" value={row[key]} onChange={e=>updateInstallment(i,key,e.target.value)} placeholder="—"/></td>)}</tr>)}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={save} className={dugme}><Save size={16} className="mr-1 inline"/>{busy ? "Kaydediliyor..." : "Planı onayla ve takvime işle"}</button><button type="button" disabled={busy} onClick={()=>void cancelPlan()} className="rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted hover:text-down"><Trash2 size={16} className="mr-1 inline"/>Vazgeç ve belgeyi sil</button></div>
      <p className="flex items-start gap-2 rounded-xl bg-inner p-3 text-xs leading-5 text-muted"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-accent"/> Onaylandığında kredi planı ve taksitleri aile ödeme takvimine kaydedilir. TRY kredisi ayrıca Borçlarım listesine eklenir veya seçtiğin mevcut kredi kaydı güncellenir. Taksitler otomatik banka hareketi oluşturmaz; ödeme yapıldığında ayrıca işaretlenir.</p>
    </section>}

    <section className={kart + " space-y-3"}>
      <div className="flex items-center gap-2"><Landmark size={18} className="text-accent"/><h2 className="font-bold">Kayıtlı kredi planları</h2></div>
      {savedPlans.length === 0 ? <p className="text-sm text-muted">Henüz onaylanmış kredi ödeme planı yok.</p> : <div className="space-y-2">{savedPlans.map(p=><article key={p.id} className="rounded-xl bg-inner p-3">
        <button type="button" onClick={()=>void toggleSavedPlan(p.id)} className="flex w-full flex-wrap items-center justify-between gap-3 text-left">
          <div><b className="text-sm">{p.bank_name} · {TYPES.find(x=>x.value===p.loan_type)?.label || "Kredi"}</b><p className="mt-1 text-xs text-muted">{p.installment_count} taksit · {p.first_due_date} – {p.last_due_date}</p></div>
          <div className="text-right"><b className="text-sm">{formatAmount(Number(p.principal_amount),p.currency)}</b><p className="text-xs text-muted">Kalan: {formatAmount(Number(p.remaining_amount),p.currency)}</p><p className="text-xs text-accent">{expandedPlanId===p.id?"Tabloyu gizle":"Ay ay ödeme tablosunu aç"}</p></div>
        </button>
        {expandedPlanId===p.id && <div className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-line bg-card">
          <table className="w-full min-w-[650px] text-xs"><thead className="sticky top-0 bg-inner"><tr className="text-left text-muted"><th className="p-2">Taksit</th><th className="p-2">Vade tarihi</th><th className="p-2 text-right">Taksit tutarı</th><th className="p-2 text-right">Anapara</th><th className="p-2 text-right">Faiz</th><th className="p-2 text-right">Kalan anapara</th><th className="p-2">Durum</th></tr></thead><tbody>{expandedInstallments.map(row=><tr key={row.id} className="border-t border-line/70"><td className="p-2">{row.installment_no}</td><td className="p-2">{row.due_date}</td><td className="p-2 text-right font-semibold">{formatAmount(Number(row.installment_amount),p.currency)}</td><td className="p-2 text-right">{row.principal_amount===null?"—":formatAmount(Number(row.principal_amount),p.currency)}</td><td className="p-2 text-right">{row.interest_amount===null?"—":formatAmount(Number(row.interest_amount),p.currency)}</td><td className="p-2 text-right">{row.remaining_principal===null?"—":formatAmount(Number(row.remaining_principal),p.currency)}</td><td className="p-2">{row.status==="paid"?"Ödendi":row.status==="skipped"?"Atlandı":"Bekliyor"}</td></tr>)}</tbody></table>
        </div>}
      </article>)}</div>}
    </section>
  </div>;
}
