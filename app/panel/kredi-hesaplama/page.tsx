"use client";

import { useMemo, useState } from "react";
import { Calculator, Home, CarFront, Wallet, ArrowDownUp, Info, TrendingDown } from "lucide-react";
import { tl } from "../../../lib/finans";
import { kart, girdi, etiket, baslik } from "../../../lib/ui";

type KrediTuru = "konut" | "ihtiyac" | "tasit" | "borc";
type Teklif = { banka: string; aylikFaiz: string; tahsis: string; sigorta: string; bsmv: string; kkdf: string };
type Sonuc = { taksit: number; faiz: number; vergi: number; masraf: number; toplam: number; oran: number };

const TURLER: { id: KrediTuru; ad: string; aciklama: string; ikon: typeof Home; vade: number }[] = [
  { id: "konut", ad: "Konut", aciklama: "Ev finansmanı", ikon: Home, vade: 120 },
  { id: "ihtiyac", ad: "İhtiyaç", aciklama: "Bireysel ihtiyaç kredisi", ikon: Wallet, vade: 36 },
  { id: "tasit", ad: "Taşıt", aciklama: "Araç finansmanı", ikon: CarFront, vade: 48 },
  { id: "borc", ad: "Borç transferi", aciklama: "Borç kapatma / yapılandırma", ikon: ArrowDownUp, vade: 36 },
];

const ilkTeklif = (banka: string): Teklif => ({ banka, aylikFaiz: "3,00", tahsis: "0,5", sigorta: "0", bsmv: "0", kkdf: "0" });
const sayi = (v: string) => {
  const s = v.trim().replace(/\s/g, "");
  if (s.includes(",") && s.includes(".")) return Number(s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, ""));
  if (s.includes(",")) return Number(s.replace(",", "."));
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) return Number(s.replace(/\./g, ""));
  return Number(s);
};
function teklifGecerli(teklif: Teklif): boolean {
  const faiz = sayi(teklif.aylikFaiz), tahsis = sayi(teklif.tahsis), sigorta = sayi(teklif.sigorta), bsmv = sayi(teklif.bsmv), kkdf = sayi(teklif.kkdf);
  return Number.isFinite(faiz) && faiz >= 0 && faiz <= 20 && Number.isFinite(tahsis) && tahsis >= 0 && tahsis <= 10 && Number.isFinite(sigorta) && sigorta >= 0 && sigorta <= 10000000 && Number.isFinite(bsmv) && bsmv >= 0 && bsmv <= 100 && Number.isFinite(kkdf) && kkdf >= 0 && kkdf <= 100;
}
function hesapla(anapara: number, vade: number, teklif: Teklif): Sonuc {
  const nominal = Math.max(0, sayi(teklif.aylikFaiz) || 0) / 100;
  const bsmv = Math.max(0, sayi(teklif.bsmv) || 0) / 100;
  const kkdf = Math.max(0, sayi(teklif.kkdf) || 0) / 100;
  const aylik = nominal * (1 + bsmv + kkdf);
  const taksit = aylik === 0 ? anapara / vade : anapara * aylik / (1 - Math.pow(1 + aylik, -vade));
  const toplamTaksit = taksit * vade;
  const tahsis = anapara * Math.max(0, sayi(teklif.tahsis) || 0) / 100;
  const sigorta = Math.max(0, sayi(teklif.sigorta) || 0);
  const toplamFinansmanMaliyeti = toplamTaksit - anapara;
  const vergi = toplamFinansmanMaliyeti * (bsmv + kkdf) / (1 + bsmv + kkdf);
  const faiz = toplamFinansmanMaliyeti - vergi;
  return { taksit, faiz, vergi, masraf: tahsis + sigorta, toplam: toplamTaksit + tahsis + sigorta, oran: aylik };
}

export default function KrediHesaplamaPage() {
  const [tur, setTur] = useState<KrediTuru>("konut");
  const [tutar, setTutar] = useState("2500000");
  const [vade, setVade] = useState("120");
  const [teklifler, setTeklifler] = useState<Teklif[]>([ilkTeklif("Banka A"), ilkTeklif("Banka B")]);
  const [aktif, setAktif] = useState(0);
  const [tabloAcik, setTabloAcik] = useState(false);
  const anapara = sayi(tutar);
  const ay = Number(vade);
  const temelGecerli = Number.isFinite(anapara) && anapara > 0 && Number.isInteger(ay) && ay > 0 && ay <= 240;
  const gecerli = temelGecerli && teklifler.every(teklifGecerli);
  const sonuclar = useMemo(() => teklifler.map((t) => hesapla(anapara, ay, t)), [anapara, ay, teklifler]);
  const guncelle = (index: number, alan: keyof Teklif, deger: string) => setTeklifler((onceki) => onceki.map((t, i) => i === index ? { ...t, [alan]: deger } : t));
  const seciliTur = TURLER.find((x) => x.id === tur)!;
  const seciliSonuc = sonuclar[aktif];
  const taksitler = useMemo(() => {
    if (!gecerli || !seciliSonuc) return [];
    let bakiye = anapara;
    const faizOrani = seciliSonuc.oran;
    return Array.from({ length: Math.min(ay, 240) }, (_, i) => {
      const faiz = bakiye * faizOrani;
      const anaparaPayi = Math.min(bakiye, Math.max(0, seciliSonuc.taksit - faiz));
      bakiye = Math.max(0, bakiye - anaparaPayi);
      return { ay: i + 1, taksit: anaparaPayi + faiz, anapara: anaparaPayi, faiz, bakiye };
    });
  }, [gecerli, seciliSonuc, anapara, ay]);

  return <div className="space-y-5">
    <header><p className="text-xs font-bold uppercase tracking-widest text-accent">Finansman laboratuvarı</p><h1 className={baslik}>Kredi Hesaplama Merkezi</h1><p className="mt-1 text-sm text-muted">Konut, ihtiyaç, taşıt ve borç transferi kredilerini hesapla; banka tekliflerini aynı koşullarda karşılaştır.</p></header>
    <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {TURLER.map((x) => { const Icon = x.ikon; return <button key={x.id} onClick={() => { setTur(x.id); setVade(String(x.vade)); }} className={"rounded-2xl border p-3 text-left transition " + (tur === x.id ? "border-accent bg-accent/10" : "border-line bg-card hover:border-accent")}><Icon size={20} className={tur === x.id ? "text-accent" : "text-muted"}/><b className="mt-2 block text-sm">{x.ad}</b><span className="text-xs text-muted">{x.aciklama}</span></button>; })}
    </section>
    <section className={kart + " grid gap-4 sm:grid-cols-2"}>
      <div className="sm:col-span-2"><h2 className="font-bold">Kredi bilgileri</h2><p className="mt-1 text-xs text-muted">Aynı kredi tutarı ve vade, tüm banka tekliflerine uygulanır.</p></div>
      <div><label className={etiket}>Kredi tutarı (TL)</label><input className={girdi} inputMode="decimal" value={tutar} onChange={(e) => setTutar(e.target.value)} placeholder="2.500.000"/></div>
      <div><label className={etiket}>Vade (ay)</label><input className={girdi} type="number" min="1" max="240" value={vade} onChange={(e) => setVade(e.target.value)}/><p className="mt-1 text-xs text-muted">{seciliTur.ad} için seçili başlangıç vadesi: {seciliTur.vade} ay. Banka koşullarını ayrıca kontrol et.</p></div>
    </section>
    {!temelGecerli && <p className="text-sm text-down">Geçerli bir kredi tutarı ve 1–240 ay arasında vade gir.</p>}
    {temelGecerli && !gecerli && <p className="text-sm text-down">Faiz, vergi ve masraf alanlarına geçerli değerler gir. Aylık faiz en fazla %20, tahsis ücreti en fazla %10 olmalı.</p>}
    <section className="grid gap-4 xl:grid-cols-2">
      {teklifler.map((t, index) => <article key={index} className={kart + " space-y-3"}>
        <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wider text-accent">Teklif {index + 1}</p><input aria-label="Banka adı" className="mt-1 w-full border-b border-line bg-transparent py-1 text-lg font-bold outline-none focus:border-accent" value={t.banka} onChange={(e) => guncelle(index, "banka", e.target.value)} /></div><button onClick={() => setAktif(index)} className={"rounded-lg px-3 py-2 text-xs font-semibold " + (aktif === index ? "bg-accent text-accent-fg" : "bg-inner text-muted")}>{aktif === index ? "Detay seçili" : "Detayları gör"}</button></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={etiket}>Aylık faiz (%)</label><input className={girdi} inputMode="decimal" value={t.aylikFaiz} onChange={(e) => guncelle(index, "aylikFaiz", e.target.value)}/></div>
          <div><label className={etiket}>Tahsis ücreti (%)</label><input className={girdi} inputMode="decimal" value={t.tahsis} onChange={(e) => guncelle(index, "tahsis", e.target.value)}/></div>
          <div><label className={etiket}>Sigorta / diğer (TL)</label><input className={girdi} inputMode="decimal" value={t.sigorta} onChange={(e) => guncelle(index, "sigorta", e.target.value)}/></div>
          <div><label className={etiket}>BSMV (%)</label><input className={girdi} inputMode="decimal" value={t.bsmv} onChange={(e) => guncelle(index, "bsmv", e.target.value)}/></div>
          <div><label className={etiket}>KKDF (%)</label><input className={girdi} inputMode="decimal" value={t.kkdf} onChange={(e) => guncelle(index, "kkdf", e.target.value)}/></div>
        </div>
        {gecerli && sonuclar[index] && <div className="rounded-xl bg-inner p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted">Aylık taksit</span><b className="text-xl">{tl(sonuclar[index].taksit)}</b></div><div className="mt-2 grid grid-cols-2 gap-2 text-xs"><div><span className="text-muted">Toplam geri ödeme</span><b className="mt-1 block">{tl(sonuclar[index].toplam)}</b></div><div><span className="text-muted">Faiz + vergi + masraf</span><b className="mt-1 block">{tl(sonuclar[index].toplam - anapara)}</b></div></div></div>}
      </article>)}
    </section>
    {gecerli && <section className={kart + " space-y-4"}>
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-bold">Banka teklif karşılaştırması</h2><p className="text-xs text-muted">Aynı tutar ve vade üzerinden tahmini maliyet</p></div><span className="rounded-full bg-up/10 px-3 py-1 text-xs font-semibold text-up"><TrendingDown size={14} className="mr-1 inline"/> En düşük toplam maliyet: {teklifler[sonuclar[0].toplam <= sonuclar[1].toplam ? 0 : 1].banka || "Banka"}</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b border-line text-left text-xs text-muted"><th className="py-2">Karşılaştırma</th>{teklifler.map((t, i) => <th key={i} className="py-2 text-right">{t.banka || "Banka " + (i+1)}</th>)}</tr></thead><tbody>
        {([["Aylık taksit", "taksit"], ["Toplam faiz", "faiz"], ["Vergi tahmini", "vergi"], ["Tahsis + sigorta", "masraf"], ["Toplam geri ödeme", "toplam"]] as const).map(([label, key]) => <tr key={key} className="border-b border-line/70"><td className="py-3 text-muted">{label}</td>{sonuclar.map((s, i) => <td key={i} className="py-3 text-right font-semibold">{tl(s[key])}</td>)}</tr>)}
      </tbody></table></div>
      <div className="flex flex-wrap items-center justify-between gap-3"><button onClick={() => setTabloAcik(!tabloAcik)} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold hover:border-accent">{tabloAcik ? "Ödeme planını gizle" : "Aylık ödeme planını göster"}</button><p className="text-xs text-muted">Detay: {teklifler[aktif].banka || "Banka"} · {ay} ay</p></div>
      {tabloAcik && <div className="max-h-[420px] overflow-auto rounded-xl border border-line"><table className="w-full min-w-[460px] text-xs"><thead className="sticky top-0 bg-inner"><tr className="text-left text-muted"><th className="p-3">Ay</th><th className="p-3 text-right">Taksit</th><th className="p-3 text-right">Anapara</th><th className="p-3 text-right">Faiz + vergi</th><th className="p-3 text-right">Kalan anapara</th></tr></thead><tbody>{taksitler.map((x) => <tr key={x.ay} className="border-t border-line/70"><td className="p-3">{x.ay}</td><td className="p-3 text-right">{tl(x.taksit)}</td><td className="p-3 text-right">{tl(x.anapara)}</td><td className="p-3 text-right">{tl(x.faiz)}</td><td className="p-3 text-right">{tl(x.bakiye)}</td></tr>)}</tbody></table></div>}
    </section>}
    <aside className="rounded-2xl border border-line bg-inner/70 p-4 text-xs leading-6 text-muted"><Info size={16} className="mr-2 inline text-accent"/><b className="text-fg">Hesaplama notu:</b> Bu araç eşit taksitli (anüite) ödeme varsayımıyla tahmini hesap yapar. Aylık faiz, kullanıcı tarafından girilen nominal orana BSMV ve KKDF oranları eklenerek modellenir; bu vergi alanları varsayılan olarak %0'dır. Tahsis ücreti kredi tutarının yüzdesi, sigorta/diğer masraflar peşin TL olarak toplam maliyete eklenir; krediye eklenip taksitlendirildiği varsayılmaz. Bankaların güncel kampanyaları, kredi tahsis sınırları, ekspertiz, ipotek, hayat sigortası, efektif yıllık maliyet, değişken faiz, ara ödeme ve erken kapama koşulları bu tahmine dahil değildir. Bankanın resmi ödeme planı ve sözleşmesi esas alınmalıdır.</aside>
  </div>;
}
