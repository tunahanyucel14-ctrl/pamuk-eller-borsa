"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { ayAraligi, bugun, bugunAy, sayiyaCevir, tarihTR, tl } from "../../../lib/finans";
import type { Bakiye, Islem, IslemTuru, Kategori } from "../../../lib/tipler";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";

const TURLER: { id: IslemTuru; ad: string }[] = [
  { id: "gider", ad: "Gider" },
  { id: "gelir", ad: "Gelir" },
  { id: "transfer", ad: "Transfer" },
];

export default function Islemler() {
  const { aileId, yazabilir } = useAile();
  const [ay, setAy] = useState(bugunAy());
  const [hesaplar, setHesaplar] = useState<Bakiye[]>([]);
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [islemler, setIslemler] = useState<Islem[]>([]);

  const [tur, setTur] = useState<IslemTuru>("gider");
  const [tutar, setTutar] = useState("");
  const [hesapId, setHesapId] = useState("");
  const [hedefId, setHedefId] = useState("");
  const [kategoriId, setKategoriId] = useState("");
  const [tarih, setTarih] = useState(bugun());
  const [aciklama, setAciklama] = useState("");
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);
  const [arama, setArama] = useState("");
  const [filtre, setFiltre] = useState<"hepsi" | IslemTuru>("hepsi");

  const yukle = useCallback(async () => {
    const { bas, sonraki } = ayAraligi(ay);
    const [h, k, i] = await Promise.all([
      supabase.from("account_balances").select("*").eq("family_id", aileId).order("name"),
      supabase.from("categories").select("*").eq("family_id", aileId).order("name"),
      supabase
        .from("fin_transactions")
        .select("*")
        .eq("family_id", aileId)
        .gte("tx_date", bas)
        .lt("tx_date", sonraki)
        .order("tx_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);
    const e = h.error || k.error || i.error;
    if (e) {
      setHata(e.message);
      return;
    }
    const hs = (h.data ?? []) as Bakiye[];
    setHesaplar(hs);
    setKategoriler((k.data ?? []) as Kategori[]);
    setIslemler(((i.data ?? []) as Islem[]).map((x) => ({ ...x, amount: Number(x.amount) })));
    setHesapId((onceki) => onceki || hs[0]?.account_id || "");
  }, [aileId, ay]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  async function kaydet(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    const t = sayiyaCevir(tutar);
    if (!(t > 0)) {
      setHata("Tutar sıfırdan büyük bir sayı olmalı.");
      return;
    }
    if (!hesapId) {
      setHata("Önce Hesaplarım sayfasından bir hesap ekle.");
      return;
    }
    if (tur === "transfer" && (!hedefId || hedefId === hesapId)) {
      setHata("Transfer için farklı bir hedef hesap seç.");
      return;
    }
    setBekle(true);
    const { error } = await supabase.from("fin_transactions").insert({
      family_id: aileId,
      account_id: hesapId,
      to_account_id: tur === "transfer" ? hedefId : null,
      category_id: tur === "transfer" ? null : kategoriId || null,
      kind: tur,
      amount: Math.round(t * 100) / 100,
      description: aciklama.trim() || null,
      tx_date: tarih,
    });
    if (error) {
      setHata(error.message);
    } else {
      setTutar("");
      setAciklama("");
      await yukle();
    }
    setBekle(false);
  }

  async function sil(id: string) {
    if (!window.confirm("Bu işlem silinsin mi?")) return;
    const { error } = await supabase.from("fin_transactions").delete().eq("id", id);
    if (error) setHata(error.message);
    else await yukle();
  }

  const hesapAdi = (id: string | null) => hesaplar.find((h) => h.account_id === id)?.name ?? "-";
  const kategoriAdi = (id: string | null) => kategoriler.find((k) => k.id === id)?.name ?? "Kategorisiz";
  const uygunKategoriler = kategoriler.filter((k) => k.kind === tur);
  const gorunenIslemler = useMemo(() => islemler.filter((x) => {
    const metin = [x.description || "", kategoriAdi(x.category_id), hesapAdi(x.account_id), x.kind].join(" ").toLocaleLowerCase("tr-TR");
    return (filtre === "hepsi" || x.kind === filtre) && metin.includes(arama.trim().toLocaleLowerCase("tr-TR"));
  }), [islemler, filtre, arama, kategoriler, hesaplar]);
  const toplamGelir = islemler.filter((x) => x.kind === "gelir").reduce((s, x) => s + x.amount, 0);
  const toplamGider = islemler.filter((x) => x.kind === "gider").reduce((s, x) => s + x.amount, 0);
  function csvIndir() {
    const satirlar = [["Tarih", "Tür", "Açıklama", "Kategori", "Hesap", "Tutar (TL)"],
      ...gorunenIslemler.map((x) => [x.tx_date, x.kind, x.description || "", kategoriAdi(x.category_id), hesapAdi(x.account_id), String(x.amount)])];
    const csv = "\uFEFF" + satirlar.map((row) => row.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = "pamuk-eller-islemler-" + ay + ".csv"; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={baslik}>İşlemler</h1>
        <input
          type="month"
          value={ay}
          onChange={(e) => e.target.value && setAy(e.target.value)}
          className={girdi + " !w-auto"}
        />
      </div>

      {yazabilir ? (
        <form onSubmit={kaydet} className={kart + " flex flex-col gap-3"}>
          <div className="flex gap-2">
            {TURLER.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTur(t.id);
                  setKategoriId("");
                }}
                className={
                  "flex-1 rounded-xl px-4 py-2 text-sm font-semibold " +
                  (tur === t.id ? "bg-accent text-accent-fg" : "border border-line text-muted")
                }
              >
                {t.ad}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <label className={etiket}>Tutar (TL)</label>
              <input className={girdi} inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} placeholder="Örn: 1250,50" />
            </div>
            <div>
              <label className={etiket}>{tur === "transfer" ? "Çıkış hesabı" : "Hesap"}</label>
              <select className={girdi} value={hesapId} onChange={(e) => setHesapId(e.target.value)}>
                {hesaplar.map((h) => (
                  <option key={h.account_id} value={h.account_id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            {tur === "transfer" ? (
              <div>
                <label className={etiket}>Hedef hesap</label>
                <select className={girdi} value={hedefId} onChange={(e) => setHedefId(e.target.value)}>
                  <option value="">Seç</option>
                  {hesaplar
                    .filter((h) => h.account_id !== hesapId)
                    .map((h) => (
                      <option key={h.account_id} value={h.account_id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className={etiket}>Kategori</label>
                <select className={girdi} value={kategoriId} onChange={(e) => setKategoriId(e.target.value)}>
                  <option value="">Kategorisiz</option>
                  {uygunKategoriler.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className={etiket}>Tarih</label>
              <input type="date" className={girdi} value={tarih} onChange={(e) => setTarih(e.target.value)} required />
            </div>
            <div className="md:col-span-2">
              <label className={etiket}>Açıklama (isteğe bağlı)</label>
              <input className={girdi} value={aciklama} onChange={(e) => setAciklama(e.target.value)} placeholder="Örn: Kasım kirası" />
            </div>
          </div>

          {hata && <p className="text-sm text-down">{hata}</p>}
          <button type="submit" disabled={bekle} className={dugme}>
            {bekle ? "Kaydediliyor..." : "İşlemi Kaydet"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">İzleyici rolünde işlem ekleyemezsin, sadece görüntüleyebilirsin.</p>
      )}

      {!yazabilir && hata && <p className="text-sm text-down">{hata}</p>}

      <section className="grid gap-3 sm:grid-cols-3">
        <div className={kart}><p className="text-xs text-muted">Aylık gelir</p><p className="mt-2 text-xl font-black text-up">{tl(toplamGelir)}</p></div>
        <div className={kart}><p className="text-xs text-muted">Aylık gider</p><p className="mt-2 text-xl font-black text-down">{tl(toplamGider)}</p></div>
        <div className={kart}><p className="text-xs text-muted">Net nakit akışı</p><p className={"mt-2 text-xl font-black " + (toplamGelir-toplamGider >= 0 ? "text-up" : "text-down")}>{tl(toplamGelir-toplamGider)}</p></div>
      </section>
      <div className={kart}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">İşlem geçmişi</h2><p className="mt-1 text-xs text-muted">{gorunenIslemler.length} / {islemler.length} kayıt gösteriliyor</p></div>
          <button type="button" onClick={csvIndir} disabled={gorunenIslemler.length === 0} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-semibold hover:border-accent disabled:opacity-40"><Download size={15}/> CSV indir</button>
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"/><input className={girdi + " pl-9"} value={arama} onChange={(e) => setArama(e.target.value)} placeholder="Açıklama, kategori veya hesap ara..."/></label>
          <select className={girdi + " sm:!w-40"} value={filtre} onChange={(e) => setFiltre(e.target.value as "hepsi" | IslemTuru)}><option value="hepsi">Tüm türler</option><option value="gelir">Gelirler</option><option value="gider">Giderler</option><option value="transfer">Transferler</option></select>
        </div>
        {islemler.length === 0 && <p className="text-sm text-muted">Bu ay işlem yok.</p>}
        {islemler.length > 0 && gorunenIslemler.length === 0 && <p className="rounded-xl bg-inner p-5 text-center text-sm text-muted">Aramana uygun işlem bulunamadı.</p>}
        <div className="flex flex-col gap-2">
          {gorunenIslemler.map((x) => (
            <div key={x.id} className="flex items-center justify-between gap-3 rounded-xl bg-inner px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {x.description ||
                    (x.kind === "transfer"
                      ? `Transfer: ${hesapAdi(x.account_id)} → ${hesapAdi(x.to_account_id)}`
                      : kategoriAdi(x.category_id))}
                </p>
                <p className="text-xs text-muted">
                  {tarihTR(x.tx_date)} · {hesapAdi(x.account_id)}
                  {x.kind !== "transfer" && ` · ${kategoriAdi(x.category_id)}`}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p
                  className={
                    "whitespace-nowrap font-semibold " +
                    (x.kind === "gelir" ? "text-up" : x.kind === "gider" ? "text-down" : "text-muted")
                  }
                >
                  {x.kind === "gelir" ? "+" : x.kind === "gider" ? "-" : ""}
                  {tl(x.amount)}
                </p>
                {yazabilir && (
                  <button onClick={() => sil(x.id)} className="text-xs text-muted hover:text-down">
                    Sil
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
