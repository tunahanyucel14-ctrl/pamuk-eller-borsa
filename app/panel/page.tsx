"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Gauge,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  PiggyBank,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useAile } from "../../lib/aile-baglami";
import { ayAraligi, bugunAy, tarihTR, tl } from "../../lib/finans";
import type { Bakiye, Islem, Kategori } from "../../lib/tipler";
import { kart, girdi, baslik } from "../../lib/ui";

function StatCard({
  title,
  value,
  note,
  icon: Icon,
  tone = "neutral",
}: {
  title: string;
  value: string;
  note: string;
  icon: typeof Wallet;
  tone?: "positive" | "negative" | "neutral";
}) {
  const toneClass =
    tone === "positive"
      ? "text-up bg-up/10"
      : tone === "negative"
        ? "text-down bg-down/10"
        : "text-accent bg-accent/10";

  return (
    <article className={"group relative overflow-hidden rounded-[26px] border border-line bg-card p-5 shadow-[0_12px_35px_rgba(0,0,0,.07)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,.12)] sm:p-6"}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{title}</p>
          <p className="mt-3 break-words text-xl font-black tracking-tight text-fg sm:text-2xl">
            {value}
          </p>
          <p className="mt-2 text-xs text-muted">{note}</p>
        </div>
        <div className={"rounded-2xl p-3.5 transition duration-300 group-hover:scale-110 " + toneClass}>
          <Icon size={21} />
        </div>
      </div>
      <div className="pointer-events-none absolute -bottom-10 -right-8 h-32 w-32 rounded-full bg-accent/10 blur-3xl transition group-hover:scale-125" /><div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
    </article>
  );
}

export default function GenelBakis() {
  const { aileId } = useAile();
  const [ay, setAy] = useState(bugunAy());
  const [bakiyeler, setBakiyeler] = useState<Bakiye[]>([]);
  const [islemler, setIslemler] = useState<Islem[]>([]);
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [butceLimitleri, setButceLimitleri] = useState<{ category_id: string; limit_amount: number }[]>([]);
  const [butceHata, setButceHata] = useState("");
  const [aylikTrend, setAylikTrend] = useState<{ ay: string; gelir: number; gider: number }[]>([]);
  const [hata, setHata] = useState("");
  const [trendHata, setTrendHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let iptal = false;
    async function yukle() {
      setYukleniyor(true);
      setHata("");
      const { bas, sonraki } = ayAraligi(ay);
      const [yil, ayNo] = ay.split("-").map(Number);
      const trendBaslangic = new Date(yil, ayNo - 6, 1);
      const trendBitis = new Date(yil, ayNo, 1);
      const tarihISO = (d: Date) => String(d.getFullYear()) + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const [b, i, k, budgets, trend] = await Promise.all([
        supabase.from("account_balances").select("*").eq("family_id", aileId),
        supabase
          .from("fin_transactions")
          .select("*")
          .eq("family_id", aileId)
          .gte("tx_date", bas)
          .lt("tx_date", sonraki)
          .order("tx_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*").eq("family_id", aileId),
        supabase.from("family_category_budgets").select("category_id,limit_amount").eq("family_id", aileId).eq("budget_month", bas),
        supabase.from("fin_transactions").select("tx_date,kind,amount,account_id").eq("family_id", aileId).gte("tx_date", tarihISO(trendBaslangic)).lt("tx_date", tarihISO(trendBitis)).in("kind", ["gelir", "gider"]),
      ]);
      if (iptal) return;
      const h = b.error || i.error || k.error;
      if (h) {
        setHata(h.message);
      } else {
        const accountRows=((b.data ?? []) as Bakiye[]).map((x) => ({...x,balance:Number(x.balance),opening_balance:Number(x.opening_balance)}));
        const currencyByAccount=new Map(accountRows.map(x=>[x.account_id,String(x.currency||"TRY").toUpperCase()]));
        setBakiyeler(accountRows);
        setIslemler(((i.data ?? []) as Islem[]).filter(x=>currencyByAccount.get(x.account_id)==="TRY").map(x=>({...x,amount:Number(x.amount)})));
        setKategoriler((k.data ?? []) as Kategori[]);
        setButceLimitleri((budgets.data ?? []).map((x: any) => ({ category_id: x.category_id, limit_amount: Number(x.limit_amount) || 0 })));
        setButceHata(budgets.error ? "Kategori bütçeleri şu an yüklenemedi." : "");
        setTrendHata(trend.error ? "Geçmiş karşılaştırma şu an yüklenemedi." : "");
        const grouped = new Map<string, { ay: string; gelir: number; gider: number }>();
        for (let offset = 5; offset >= 0; offset--) {
          const d = new Date(yil, ayNo - 1 - offset, 1);
          const key = tarihISO(d).slice(0, 7);
          grouped.set(key, { ay: new Intl.DateTimeFormat("tr-TR", { month: "short" }).format(d), gelir: 0, gider: 0 });
        }
        for (const row of trend.data ?? []) {
          if(currencyByAccount.get(row.account_id)==="TRY"){
          const item = grouped.get(String(row.tx_date).slice(0, 7));
          if (!item) continue;
          if (row.kind === "gelir") item.gelir += Number(row.amount) || 0;
          if (row.kind === "gider") item.gider += Number(row.amount) || 0;
          }
        }
        setAylikTrend(Array.from(grouped.values()));
      }
      setYukleniyor(false);
    }
    yukle();
    return () => {
      iptal = true;
    };
  }, [aileId, ay]);

  const gelir = islemler
    .filter((x) => x.kind === "gelir")
    .reduce((t, x) => t + x.amount, 0);
  const gider = islemler
    .filter((x) => x.kind === "gider")
    .reduce((t, x) => t + x.amount, 0);
  const net = gelir - gider;
  const toplamVarlik = bakiyeler.filter(x=>String(x.currency||"TRY").toUpperCase()==="TRY").reduce((t, x) => t + x.balance, 0);
  const yabanciBakiyeler = bakiyeler.filter(x=>String(x.currency||"TRY").toUpperCase()!=="TRY");
  const tasarrufOrani = gelir > 0 ? (net / gelir) * 100 : 0;

  const kategoriAdi = (id: string | null) =>
    kategoriler.find((k) => k.id === id)?.name ?? "Kategorisiz";
  const hesapAdi = (id: string | null) =>
    bakiyeler.find((h) => h.account_id === id)?.name ?? "-";

  const giderDagilimi = useMemo(
    () =>
      Object.entries(
        islemler
          .filter((x) => x.kind === "gider")
          .reduce<Record<string, number>>((acc, x) => {
            const ad = kategoriAdi(x.category_id);
            acc[ad] = (acc[ad] ?? 0) + x.amount;
            return acc;
          }, {})
      ).sort((a, b) => b[1] - a[1]),
    [islemler, kategoriler, bakiyeler]
  );

  const butceDurumlari = useMemo(() => butceLimitleri.map((limit) => {
    const category = kategoriler.find((x) => x.id === limit.category_id);
    const spent = islemler.filter((x) => x.kind === "gider" && x.category_id === limit.category_id).reduce((sum, x) => sum + x.amount, 0);
    const pct = limit.limit_amount > 0 ? (spent / limit.limit_amount) * 100 : 0;
    return { id: limit.category_id, name: category?.name ?? "Kategori", spent, limit: limit.limit_amount, pct };
  }).sort((a, b) => b.pct - a.pct), [butceLimitleri, kategoriler, islemler]);

  const guncelTrend = aylikTrend[aylikTrend.length - 1];
  const oncekiTrend = aylikTrend[aylikTrend.length - 2];
  const degisimMetni = (guncel: number, onceki: number) => {
    if (!onceki && !guncel) return "Değişim yok";
    if (!onceki && guncel) return "Bu ay başladı";
    const oran = ((guncel - onceki) / onceki) * 100;
    return (oran > 0 ? "+" : "") + "%" + oran.toFixed(1) + " önceki aya göre";
  };
  const gelirDegisimi = guncelTrend && oncekiTrend ? guncelTrend.gelir - oncekiTrend.gelir : 0;
  const giderDegisimi = guncelTrend && oncekiTrend ? guncelTrend.gider - oncekiTrend.gider : 0;
  const netDegisimi = gelirDegisimi - giderDegisimi;

  const ayEtiketi = new Intl.DateTimeFormat("tr-TR", {
    month: "long",
    year: "numeric",
  }).format(new Date(Number(ay.slice(0, 4)), Number(ay.slice(5, 7)) - 1, 1));

  return (
    <div className="flex flex-col gap-7">
      <section className="relative isolate flex flex-col justify-between gap-5 overflow-hidden rounded-[30px] border border-emerald-300/15 bg-[#0b211d] p-6 text-white shadow-[0_24px_70px_rgba(4,30,24,.22)] sm:flex-row sm:items-end sm:p-9">
        <div className="relative z-10">
          <p className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-accent" />
            PAMUK ELLER · FİNANSAL KONTROL MERKEZİ
          </p>
          <h1 className="max-w-2xl text-3xl font-black leading-tight tracking-tight sm:text-5xl">Paranın kontrolü <span className="text-emerald-300">sende.</span></h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/65 sm:text-base">Gelirini, harcamalarını ve finansal hedeflerini tek bir akıllı merkezden yönet.</p>
          <div className="mt-6 flex flex-wrap gap-2"><a href="/panel/islemler" className="rounded-xl bg-emerald-300 px-4 py-2.5 text-xs font-extrabold text-emerald-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5">+ Yeni işlem</a><a href="/panel/butce" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10">Bütçemi planla ↗</a></div>
        </div>
        <div className="pointer-events-none absolute -right-16 -top-28 -z-0 h-80 w-80 rounded-full border border-emerald-200/10 bg-emerald-300/10 blur-3xl"/><div className="pointer-events-none absolute right-1/4 top-0 -z-0 h-48 w-48 rounded-full bg-teal-300/10 blur-3xl"/>
        <label className="relative z-10 flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white shadow-xl backdrop-blur-xl">
          <CalendarDays size={17} className="text-accent" />
          <span className="sr-only">Rapor ayı</span>
          <input
            type="month"
            value={ay}
            onChange={(e) => e.target.value && setAy(e.target.value)}
            className="w-auto border-0 bg-transparent text-sm font-semibold text-white outline-none"
          />
        </label>
      </section>

      {hata && (
        <div role="alert" className="rounded-2xl border border-down/30 bg-down/5 px-4 py-3 text-sm text-down">
          Veriler yüklenirken bir sorun oluştu: {hata}
        </div>
      )}

      {yukleniyor ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((n) => (
            <div key={n} className={kart + " h-32 animate-pulse"}>
              <div className="h-3 w-24 rounded bg-inner" />
              <div className="mt-5 h-7 w-32 rounded bg-inner" />
              <div className="mt-3 h-3 w-20 rounded bg-inner" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Toplam varlık"
              value={tl(toplamVarlik)}
              note={`${bakiyeler.length} aktif hesap`}
              icon={CircleDollarSign}
            />
            <StatCard
              title="Aylık gelir"
              value={tl(gelir)}
              note={`${islemler.filter((x) => x.kind === "gelir").length} gelir kaydı`}
              icon={ArrowDownLeft}
              tone="positive"
            />
            <StatCard
              title="Aylık gider"
              value={tl(gider)}
              note={`${islemler.filter((x) => x.kind === "gider").length} gider kaydı`}
              icon={ArrowUpRight}
              tone="negative"
            />
            <StatCard
              title="Net nakit akışı"
              value={tl(net)}
              note={net >= 0 ? "Gelirin giderinden yüksek" : "Giderin gelirini aşmış"}
              icon={Activity}
              tone={net >= 0 ? "positive" : "negative"}
            />
          </section>

          {(butceDurumlari.length > 0 || butceHata) && (
            <section className={kart + " space-y-4"}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h2 className="flex items-center gap-2 font-bold text-fg"><Gauge size={18} className="text-accent"/> Kategori bütçe kontrolü</h2><p className="mt-1 text-xs text-muted">{ayEtiketi} için limit kullanımın</p></div>
                <a href="/panel/butce-limitleri" className="text-xs font-bold text-accent hover:underline">Tüm bütçeleri yönet →</a>
              </div>
              {butceHata && <p className="text-xs text-down">{butceHata}</p>}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {butceDurumlari.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-xl bg-inner p-3">
                    <div className="flex items-center justify-between gap-2"><b className="truncate text-sm">{item.name}</b>{item.pct >= 80 && <AlertTriangle size={15} className={item.pct >= 100 ? "shrink-0 text-down" : "shrink-0 text-amber-500"}/>}</div>
                    <p className="mt-2 text-xs text-muted">{tl(item.spent)} / {tl(item.limit)}</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-line"><div className={"h-full rounded-full " + (item.pct >= 100 ? "bg-down" : item.pct >= 80 ? "bg-amber-500" : "bg-up")} style={{width: Math.min(100, item.pct) + "%"}}/></div>
                    <p className={"mt-1 text-[11px] font-semibold " + (item.pct >= 100 ? "text-down" : item.pct >= 80 ? "text-amber-600" : "text-muted")}>%{item.pct.toFixed(0)} kullanıldı{item.pct >= 100 ? " · Limit aşıldı" : item.pct >= 80 ? " · Limite yaklaşıyor" : ""}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-[26px] border border-line bg-card p-5 shadow-[0_12px_35px_rgba(0,0,0,.055)] sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-fg">Aylık nakit akışı</h2>
                  <p className="mt-1 text-xs text-muted">{ayEtiketi} özeti</p>
                </div>
                <span className="rounded-xl bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">
                  {islemler.length} işlem
                </span>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl bg-inner/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted">
                    <TrendingUp size={16} className="text-up" /> Gelir
                  </div>
                  <p className="text-xl font-black text-up">{tl(gelir)}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-up" style={{ width: `${gelir + gider > 0 ? (gelir / (gelir + gider)) * 100 : 0}%` }} />
                  </div>
                </div>
                <div className="rounded-2xl bg-inner/70 p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted">
                    <TrendingDown size={16} className="text-down" /> Gider
                  </div>
                  <p className="text-xl font-black text-down">{tl(gider)}</p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-down" style={{ width: `${gelir + gider > 0 ? (gider / (gelir + gider)) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <div>
                  <p className="text-xs text-muted">Bu ay elinde kalan</p>
                  <p className={"mt-1 text-2xl font-black " + (net >= 0 ? "text-up" : "text-down")}>{tl(net)}</p>
                </div>
                <div className="rounded-xl bg-accent/10 px-3 py-2 text-right">
                  <p className="text-[11px] text-muted">Tasarruf oranı</p>
                  <p className="font-bold text-accent">{gelir > 0 ? `%${tasarrufOrani.toFixed(1)}` : "—"}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-card p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Wallet size={18} className="text-accent" />
                <h2 className="font-bold text-fg">Hesap bakiyeleri</h2>
              </div>
              {bakiyeler.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
                  <CreditCard size={25} className="mx-auto mb-2 text-muted" />
                  <p className="text-sm font-semibold">Henüz hesap eklenmemiş</p>
                  <p className="mt-1 text-xs text-muted">Hesaplarım bölümünden ilk hesabını oluştur.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {bakiyeler.map((h) => (
                    <div key={h.account_id} className="flex items-center justify-between gap-3 rounded-xl bg-inner/70 px-3 py-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="rounded-xl bg-accent/10 p-2 text-accent"><Wallet size={16} /></span>
                        <span className="truncate text-sm font-medium">{h.name}</span>
                      </div>
                      <span className="shrink-0 text-sm font-bold">{tl(h.balance)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="text-muted">Toplam bakiye</span>
                <span className="font-black">{tl(toplamVarlik)}</span>
              </div>
            </div>
          </section>

          <section className={kart}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="font-bold">6 aylık finansal eğilim</h2><p className="mt-1 text-xs text-muted">Seçili ay ve önceki beş ayın gelir-gider karşılaştırması</p></div>
              <span className="rounded-xl bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">6 ay</span>
            </div>
            {trendHata && <p className="mb-3 text-xs text-muted">{trendHata}</p>}
            {guncelTrend && oncekiTrend && (
              <div className="mb-5 grid gap-3 sm:grid-cols-3">
                <article className="rounded-2xl border border-line bg-inner/60 p-4">
                  <p className="text-xs font-semibold text-muted">Gelir değişimi</p>
                  <p className={"mt-2 text-lg font-black " + (gelirDegisimi >= 0 ? "text-up" : "text-down")}>{gelirDegisimi > 0 ? "+" : ""}{tl(gelirDegisimi)}</p>
                  <p className="mt-1 text-[11px] text-muted">{degisimMetni(guncelTrend.gelir, oncekiTrend.gelir)}</p>
                </article>
                <article className="rounded-2xl border border-line bg-inner/60 p-4">
                  <p className="text-xs font-semibold text-muted">Gider değişimi</p>
                  <p className={"mt-2 text-lg font-black " + (giderDegisimi <= 0 ? "text-up" : "text-down")}>{giderDegisimi > 0 ? "+" : ""}{tl(giderDegisimi)}</p>
                  <p className="mt-1 text-[11px] text-muted">{degisimMetni(guncelTrend.gider, oncekiTrend.gider)}</p>
                </article>
                <article className="rounded-2xl border border-line bg-inner/60 p-4">
                  <p className="text-xs font-semibold text-muted">Net gelir farkı</p>
                  <p className={"mt-2 text-lg font-black " + (netDegisimi >= 0 ? "text-up" : "text-down")}>{netDegisimi > 0 ? "+" : ""}{tl(netDegisimi)}</p>
                  <p className="mt-1 text-[11px] text-muted">Gelir artışı eksi gider artışı</p>
                </article>
              </div>
            )}
            {(() => {
              const maxValue = Math.max(1, ...aylikTrend.flatMap((x) => [x.gelir, x.gider]));
              const xAt = (index: number) => 28 + (index * 664) / Math.max(1, aylikTrend.length - 1);
              const yAt = (value: number) => 194 - (value / maxValue) * 158;
              const incomePoints = aylikTrend.map((x, i) => `${xAt(i)},${yAt(x.gelir)}`).join(" ");
              const expensePoints = aylikTrend.map((x, i) => `${xAt(i)},${yAt(x.gider)}`).join(" ");
              const incomeArea = aylikTrend.length ? `M ${xAt(0)} 194 L ${aylikTrend.map((x, i) => `${xAt(i)} ${yAt(x.gelir)}`).join(" L ")} L ${xAt(aylikTrend.length - 1)} 194 Z` : "";
              const expenseArea = aylikTrend.length ? `M ${xAt(0)} 194 L ${aylikTrend.map((x, i) => `${xAt(i)} ${yAt(x.gider)}`).join(" L ")} L ${xAt(aylikTrend.length - 1)} 194 Z` : "";
              return (
                <div className="overflow-hidden rounded-2xl border border-line bg-inner/35 p-3 sm:p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div><p className="text-sm font-bold">Gelir ve gider rotası</p><p className="mt-1 text-[11px] text-muted">Son altı ayın gerçek işlem kayıtları · TRY hesapları</p></div>
                    <div className="flex gap-3 text-[11px] font-semibold"><span className="flex items-center gap-1.5 text-up"><i className="h-2 w-2 rounded-full bg-up"/> Gelir</span><span className="flex items-center gap-1.5 text-down"><i className="h-2 w-2 rounded-full bg-down"/> Gider</span></div>
                  </div>
                  {aylikTrend.every((x) => x.gelir === 0 && x.gider === 0) ? (
                    <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-line text-center text-sm text-muted">Grafiği oluşturmak için henüz yeterli işlem kaydı yok.</div>
                  ) : (
                    <>
                      <svg viewBox="0 0 720 224" role="img" aria-label="Son altı ayın gelir ve gider çizgi grafiği" className="h-48 w-full overflow-visible sm:h-64">
                        <defs>
                          <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--up)" stopOpacity=".28"/><stop offset="100%" stopColor="var(--up)" stopOpacity="0"/></linearGradient>
                          <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--down)" stopOpacity=".2"/><stop offset="100%" stopColor="var(--down)" stopOpacity="0"/></linearGradient>
                        </defs>
                        {[36, 88, 141, 194].map((y) => <line key={y} x1="18" x2="702" y1={y} y2={y} stroke="var(--line)" strokeDasharray="4 7" />)}
                        <path d={incomeArea} fill="url(#incomeFill)"/>
                        <path d={expenseArea} fill="url(#expenseFill)"/>
                        <polyline points={incomePoints} fill="none" stroke="var(--up)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points={expensePoints} fill="none" stroke="var(--down)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                        {aylikTrend.map((item, i) => <g key={i}>
                          <circle cx={xAt(i)} cy={yAt(item.gelir)} r="6" fill="var(--up)" stroke="var(--card)" strokeWidth="3"><title>{item.ay} gelir: {tl(item.gelir)}</title></circle>
                          <circle cx={xAt(i)} cy={yAt(item.gider)} r="6" fill="var(--down)" stroke="var(--card)" strokeWidth="3"><title>{item.ay} gider: {tl(item.gider)}</title></circle>
                        </g>)}
                      </svg>
                      <div className="grid grid-cols-6 gap-1">
                        {aylikTrend.map((item, i) => <div key={i} className="min-w-0 text-center"><p className="truncate text-[10px] font-semibold capitalize text-muted sm:text-xs">{item.ay}</p><p className="mt-1 truncate text-[9px] text-up sm:text-[10px]">{tl(item.gelir)}</p><p className="truncate text-[9px] text-down sm:text-[10px]">{tl(item.gider)}</p></div>)}
                      </div>
                    </>
                  )}
                </div>
              );
            })()}
            <p className="mt-3 text-[10px] text-muted">Noktaların üzerine gelerek ilgili ayın tutarını görebilirsin. Grafik, işlem kayıtlarından hesaplanır; örnek veri kullanılmaz.</p>
          </section>

          {yabanciBakiyeler.length>0&&<p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-muted">Yabancı para hesapları TL toplamına katılmadı; kur dönüşümü yapılmıyor. {Object.entries(yabanciBakiyeler.reduce<Record<string,number>>((acc,x)=>{const cur=String(x.currency||"TRY").toUpperCase();acc[cur]=(acc[cur]||0)+x.balance;return acc;},{})).map(([cur,v])=>v.toLocaleString("tr-TR",{maximumFractionDigits:2})+" "+cur).join(" · ")}</p>}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[["Borçlarım","/panel/borclar","Kredi ve kart borçlarını izle"],["Ödemeler","/panel/odemeler","Yaklaşan taksit ve faturalar"],["Hedefler","/panel/hedefler","Birikim hedeflerini takip et"],["Yatırımlar","/panel/yatirim","Varlık portföyünü yönet"],["Ekonomi","/panel/ekonomi","Piyasa göstergelerine bak"],["Gelecek Planı","/panel/gelecek","Gelir ve gider senaryoları"],["Finans Akademisi","/panel/akademi","Finansal okuryazarlık dersleri"],["Fiş Tara","/tarama","Fotoğraftan gider oluştur"]].map(([title,href,desc])=><a key={href} href={href} className={kart+" transition hover:-translate-y-0.5 hover:border-accent/50"}><p className="font-bold">{title} <span className="text-accent">↗</span></p><p className="mt-1 text-xs text-muted">{desc}</p></a>)}
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className={kart}>
              <div className="mb-4 flex items-center gap-2">
                <PiggyBank size={18} className="text-accent" />
                <h2 className="font-bold text-fg">Gider dağılımı</h2>
              </div>
              {giderDagilimi.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">Bu ay henüz gider kaydı yok.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {giderDagilimi.slice(0, 6).map(([ad, tutar]) => {
                    const oran = gider > 0 ? (tutar / gider) * 100 : 0;
                    return (
                      <div key={ad}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{ad}</span>
                          <span className="shrink-0 text-muted">{tl(tutar)} · %{oran.toFixed(0)}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-inner">
                          <div className="h-full rounded-full bg-accent" style={{ width: `${oran}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {giderDagilimi.length > 6 && (
                <p className="mt-3 text-xs text-muted">En yüksek 6 kategori gösteriliyor.</p>
              )}
            </div>

            <div className={kart}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ReceiptText size={18} className="text-accent" />
                  <h2 className="font-bold text-fg">Son işlemler</h2>
                </div>
                <span className="text-xs text-muted">En yeni 8 kayıt</span>
              </div>
              {islemler.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line px-4 py-8 text-center">
                  <ReceiptText size={25} className="mx-auto mb-2 text-muted" />
                  <p className="text-sm font-semibold">Henüz işlem yok</p>
                  <p className="mt-1 text-xs text-muted">İşlemler bölümünden gelir veya gider ekleyebilirsin.</p>
                </div>
              ) : (
                <div className="flex flex-col">
                  {islemler.slice(0, 8).map((x) => (
                    <div key={x.id} className="flex items-center justify-between gap-3 border-b border-line/70 py-3 last:border-0">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className={"rounded-xl p-2 " + (x.kind === "gelir" ? "bg-up/10 text-up" : x.kind === "gider" ? "bg-down/10 text-down" : "bg-accent/10 text-accent")}>
                          {x.kind === "gelir" ? <ArrowDownLeft size={16} /> : x.kind === "gider" ? <ArrowUpRight size={16} /> : <ArrowRight size={16} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {x.description ||
                              (x.kind === "transfer"
                                ? `Transfer: ${hesapAdi(x.account_id)} → ${hesapAdi(x.to_account_id)}`
                                : kategoriAdi(x.category_id))}
                          </p>
                          <p className="mt-0.5 text-xs text-muted">{tarihTR(x.tx_date)} · {hesapAdi(x.account_id)}</p>
                        </div>
                      </div>
                      <p className={"shrink-0 text-sm font-bold " + (x.kind === "gelir" ? "text-up" : x.kind === "gider" ? "text-down" : "text-muted")}>
                        {x.kind === "gelir" ? "+" : x.kind === "gider" ? "−" : ""}{tl(x.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
