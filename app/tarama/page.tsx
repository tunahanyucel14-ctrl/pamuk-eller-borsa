"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, FileImage, ScanLine, ArrowLeft, CheckCircle2 } from "lucide-react";
import { supabase } from "../../lib/supabase";

type Receipt = { merchant: string; date: string; total: number; currency: string; category: string; description: string; items: string[] };

export default function TaramaPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function choose(f?: File) {
    if (!f) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 6 * 1024 * 1024) {
      setMessage("JPG, PNG veya WEBP biçiminde en fazla 6 MB fotoğraf seç.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setReceipt(null);
    setMessage("");
  }

  async function scan() {
    if (!file) return;
    setBusy(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Oturumun sona ermiş. Yeniden giriş yap.");
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(new Error("Fotoğraf okunamadı."));
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/receipt", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ image: base64, mimeType: file.type }) });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Tarama başarısız.");
      setReceipt(result.receipt);
      const path = `${data.session!.user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file, { contentType: file.type, upsert: false });
      if (error) setMessage("Fiş okundu; ancak arşive kaydedilemedi: " + error.message);
      else setMessage("Fiş okundu ve özel dosya alanına kaydedildi. İşlem kaydından önce bilgileri kontrol et.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Bir hata oluştu.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-5 bg-bg p-4 text-fg md:p-8">
    <Link href="/panel" className="flex items-center gap-2 text-sm text-muted hover:text-accent"><ArrowLeft size={16}/> Finans paneline dön</Link>
    <header><p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><ScanLine size={16}/> Akıllı belge tarama</p><h1 className="text-3xl font-black">Fişini fotoğrafla, hesabını kolaylaştır</h1><p className="mt-2 text-sm text-muted">Market fişi veya faturanın fotoğrafını yükle. Yapay zekâ tutar, tarih ve işletme adını çıkarsın. Kaydetmeden önce sen kontrol et.</p></header>
    <section className="rounded-2xl border border-line bg-card p-5">
      <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-inner p-5 text-center hover:border-accent">
        {preview ? <img src={preview} alt="Seçilen fiş" className="max-h-72 max-w-full rounded-lg object-contain"/> : <><span className="rounded-2xl bg-accent/10 p-4 text-accent"><Camera size={30}/></span><b>Fotoğraf çek veya dosya seç</b><span className="text-xs text-muted">Telefon kamerası veya bilgisayar · JPG, PNG, WEBP · 6 MB</span></>}
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => choose(e.target.files?.[0])}/>
      </label>
      <button onClick={scan} disabled={!file || busy} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-bold text-accent-fg disabled:opacity-40"><ScanLine size={18}/>{busy ? "Fiş okunuyor..." : "Fişi Tara ve Bilgileri Çıkar"}</button>
      {message && <p className="mt-3 text-sm text-muted">{message}</p>}
    </section>
    {receipt && <section className="rounded-2xl border border-line bg-card p-5"><h2 className="mb-4 flex items-center gap-2 font-bold"><CheckCircle2 className="text-up"/> Okunan bilgiler · Kontrol et</h2><div className="grid gap-3 sm:grid-cols-2">{[["İşletme",receipt.merchant],["Tarih",receipt.date],["Toplam",`${receipt.total} ${receipt.currency}`],["Kategori önerisi",receipt.category],["Açıklama",receipt.description]].map(([k,v])=><div key={k} className="rounded-xl bg-inner p-3"><p className="text-xs text-muted">{k}</p><p className="mt-1 font-semibold">{v || "Belirlenemedi"}</p></div>)}</div><p className="mt-3 text-xs text-muted">Bu aşamada yalnızca okuma ve güvenli dosya arşivleme yapılır. Finans hareketine otomatik eklenmez; yanlış tutar oluşmaması için sonraki adımda onaylı kayıt formu bağlanacak.</p></section>}
    <div className="flex items-center gap-2 text-xs text-muted"><FileImage size={15}/> Belgeler yalnızca giriş yapan hesabın özel alanına yüklenir.</div>
  </main>;
}
