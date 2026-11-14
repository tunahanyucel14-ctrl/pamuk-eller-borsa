"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardCopy, FileImage, FileText, LoaderCircle, ScanLine, Trash2, Upload } from "lucide-react";

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/tiff"];

export default function MetinTaraPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [copied, setCopied] = useState(false);
  const workerRef = useRef<{ terminate: () => Promise<unknown> } | null>(null);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
    void workerRef.current?.terminate();
  }, [preview]);

  const choose = useCallback((next?: File) => {
    if (!next) return;
    if (!ACCEPTED.includes(next.type) || next.size > MAX_BYTES) {
      setStatus("JPG, PNG, WEBP, BMP veya TIFF seç. En fazla 12 MB.");
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
    setText("");
    setProgress(0);
    setCopied(false);
    setStatus("Görsel hazır. Metne dönüştürmeye başlayabilirsin.");
  }, []);

  useEffect(() => {
    const onPaste = (event: ClipboardEvent) => {
      const image = Array.from(event.clipboardData?.items ?? []).find(item => item.type.startsWith("image/"));
      const pasted = image?.getAsFile();
      if (pasted) { event.preventDefault(); choose(pasted); }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [choose]);

  async function convert() {
    if (!file || busy) return;
    setBusy(true);
    setProgress(0);
    setText("");
    setStatus("OCR motoru hazırlanıyor… İlk kullanımda Türkçe dil dosyası indirilebilir.");
    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("tur+eng", 1, {
        logger: (message: { status?: string; progress?: number }) => {
          if (typeof message.progress === "number") setProgress(Math.round(message.progress * 100));
          if (message.status) setStatus(message.status === "recognizing text" ? "Görüntü okunuyor…" : "OCR hazırlanıyor…");
        },
      });
      workerRef.current = worker;
      const result = await worker.recognize(file);
      const extracted = result.data.text?.trim() ?? "";
      setText(extracted);
      setStatus(extracted ? "Metin çıkarıldı. Düzenleyebilir veya kopyalayabilirsin." : "Bu görüntüde okunabilir metin bulunamadı. Daha net bir görsel dene.");
      await worker.terminate();
      workerRef.current = null;
    } catch (error) {
      setStatus("Metin çıkarılamadı: " + (error instanceof Error ? error.message : "Bilinmeyen hata"));
    } finally {
      setBusy(false);
    }
  }

  async function copyText() {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setStatus("Metin panoya kopyalandı.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setStatus("Tarayıcı kopyalamaya izin vermedi. Metin kutusuna dokunup tümünü seçerek kopyalayabilirsin.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-5 bg-bg p-4 text-fg md:p-8">
      <Link href="/panel" className="flex items-center gap-2 text-sm text-muted hover:text-accent"><ArrowLeft size={16}/> Finans paneline dön</Link>
      <header>
        <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-accent"><FileText size={16}/> Görüntüden metne</p>
        <h1 className="text-3xl font-black">Resimdeki yazıyı çıkar</h1>
        <p className="mt-2 text-sm text-muted">Ekran görüntüsü, fotoğraf veya belgeyi yükle ya da panodan Ctrl+V ile yapıştır. Türkçe ve İngilizce metni tarayıcında oku, düzenle ve kopyala.</p>
      </header>

      <section
        className="rounded-2xl border border-line bg-card p-5"
        onDragOver={event => event.preventDefault()}
        onDrop={event => { event.preventDefault(); choose(event.dataTransfer.files?.[0]); }}
      >
        <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-line bg-inner p-5 text-center hover:border-accent">
          {preview ? <img src={preview} alt="Metne dönüştürülecek görsel" className="max-h-80 max-w-full rounded-lg object-contain"/> : <>
            <span className="rounded-2xl bg-accent/10 p-4 text-accent"><FileImage size={32}/></span>
            <b>Görsel seç veya buraya sürükle</b>
            <span className="text-xs text-muted">Ctrl+V ile ekran görüntüsü yapıştırabilirsin · JPG, PNG, WEBP, BMP, TIFF · 12 MB</span>
          </>}
          <input type="file" accept="image/*" className="sr-only" onChange={event => { choose(event.target.files?.[0]); event.currentTarget.value = ""; }}/>
        </label>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={convert} disabled={!file || busy} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 font-bold text-accent-fg disabled:opacity-40">
            {busy ? <LoaderCircle className="animate-spin" size={18}/> : <ScanLine size={18}/>}
            {busy ? "Metin okunuyor…" : "Görüntüyü metne çevir"}
          </button>
          <button onClick={() => { setFile(null); setPreview(""); setText(""); setProgress(0); setStatus(""); }} disabled={busy || (!file && !text)} className="flex items-center justify-center gap-2 rounded-xl border border-line px-4 py-3 text-sm font-semibold disabled:opacity-40"><Trash2 size={16}/> Temizle</button>
        </div>
        {busy && <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-muted"><span>{status}</span><span>%{progress}</span></div><div className="h-2 overflow-hidden rounded-full bg-inner"><div className="h-full rounded-full bg-accent transition-all" style={{width: progress + "%"}}/></div></div>}
        {!busy && status && <p role="status" className="mt-3 text-sm text-muted">{status}</p>}
      </section>

      <section className="rounded-2xl border border-line bg-card p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div><h2 className="font-bold">Çıkarılan metin</h2><p className="text-xs text-muted">Metni burada düzeltebilir, seçebilir ve kopyalayabilirsin.</p></div>
          <button onClick={copyText} disabled={!text} className="flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-sm font-semibold text-accent disabled:opacity-40"><ClipboardCopy size={16}/>{copied ? "Kopyalandı" : "Metni kopyala"}</button>
        </div>
        <textarea value={text} onChange={event => setText(event.target.value)} placeholder="Görseldeki yazı burada görünecek…" className="min-h-72 w-full resize-y rounded-xl border border-line bg-inner p-4 text-sm leading-7 text-fg outline-none focus:border-accent" spellCheck={false}/>
        <p className="mt-2 text-right text-xs text-muted">{text.length.toLocaleString("tr-TR")} karakter</p>
      </section>
      <p className="text-xs text-muted">Gizlilik: Görsel OCR işlemi için tarayıcında işlenir; bu araç görüntüyü Pamuk Eller sunucusuna yüklemez. İlk kullanımda OCR motoru ve Türkçe dil verisi indirilir, sonraki kullanımlarda tarayıcı önbelleğinden yararlanılır.</p>
    </main>
  );
}
