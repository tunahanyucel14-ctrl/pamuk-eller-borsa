"use client";

import { useEffect, useMemo, useState } from "react";
import ExcelJS from "exceljs-hardened/dist/exceljs.min.js";
import { PDFDocument, degrees } from "pdf-lib";
import { FileText, FileImage, Files, FileSpreadsheet, FileType, Scissors, RotateCw, Minimize2, ScanText, Download, Eye, ShieldCheck, AlertCircle, LoaderCircle } from "lucide-react";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";
import { parseCreditPlan, type ParsedCreditPlan } from "../../../lib/credit-plan-parser";

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_PDF_PAGES = 100;
type PdfLine = { page: number; text: string };

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
function safeName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 70) || "pamuk-eller";
}
function checkFiles(files: File[]) {
  if (!files.length) throw new Error("Önce dosya seç.");
  if (files.some((f) => f.size > MAX_FILE_BYTES)) throw new Error("Her dosya en fazla 25 MB olabilir.");
  if (files.reduce((sum, f) => sum + f.size, 0) > 60 * 1024 * 1024) throw new Error("Toplam dosya boyutu 60 MB sınırını aşamaz.");
}
async function readPdfLines(file: File): Promise<PdfLine[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes }).promise;
  if (doc.numPages > MAX_PDF_PAGES) throw new Error("En fazla 100 sayfalık PDF işlenebilir.");
  const lines: PdfLine[] = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();
    const grouped = new Map<number, string[]>();
    for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
      if (!item.str?.trim() || !item.transform) continue;
      const y = Math.round(item.transform[5] / 3) * 3;
      const current = grouped.get(y) || [];
      current.push(item.str.trim());
      grouped.set(y, current);
    }
    const pageLines = [...grouped.entries()].sort((a, b) => b[0] - a[0]).map(([, parts]) => parts.join(" ").replace(/\s+/g, " ").trim()).filter(Boolean);
    for (const text of pageLines) lines.push({ page: pageNo, text });
    page.cleanup();
  }
  return lines;
}
function textHtml(lines: PdfLine[]) {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return "<!doctype html><html><head><meta charset=\"utf-8\"><title>Pamuk Eller PDF aktarımı</title></head><body><h1>PDF'den aktarılan metin</h1>" +
    lines.map((line) => "<p><b>Sayfa " + line.page + ":</b> " + esc(line.text) + "</p>").join("") +
    "</body></html>";
}

export default function BelgeMerkeziPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState("");
  const [pageRange, setPageRange] = useState("1-1");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pdfLines, setPdfLines] = useState<PdfLine[]>([]);
  const [ocrText, setOcrText] = useState("");
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [creditPlan, setCreditPlan] = useState<ParsedCreditPlan | null>(null);

  useEffect(() => {
    if (!files[0] || files[0].type !== "application/pdf") { setPreviewUrl(""); setPageCount(null); return; }
    const url = URL.createObjectURL(files[0]);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [files]);

  const isPdfSet = files.length > 0 && files.every((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
  const totalSize = useMemo(() => files.reduce((sum, f) => sum + f.size, 0), [files]);

  function selectFiles(list: FileList | null) {
    const chosen = Array.from(list || []);
    setError(""); setStatus(""); setPdfLines([]); setOcrText(""); setCreditPlan(null);
    try {
      if (chosen.length) checkFiles(chosen);
      setFiles(chosen);
      setPageRange("1-1");
    } catch (e) { setError(e instanceof Error ? e.message : "Dosya seçilemedi."); }
  }
  async function run(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError(""); setStatus("");
    try { await task(); }
    catch (e) { setError(e instanceof Error ? e.message : "İşlem tamamlanamadı."); }
    finally { setBusy(false); }
  }
  async function loadPdfText() {
    if (!files[0] || !isPdfSet || files.length !== 1) throw new Error("Metin çıkarma için tek bir PDF seç.");
    const lines = await readPdfLines(files[0]);
    if (!lines.length) throw new Error("Bu PDF'de seçilebilir metin bulunamadı. Belge taranmış olabilir; OCR aracını kullan.");
    setPdfLines(lines); setPageCount(new Set(lines.map((x) => x.page)).size);
    setStatus(lines.length + " metin satırı çıkarıldı. Tabloya aktarabilirsin.");
  }
  async function analyzeCreditPlan() {
    if (!files[0] || !isPdfSet || files.length !== 1) throw new Error("Kredi planı analizi için tek PDF seç.");
    let lines = pdfLines;
    if (!lines.length) {
      try { lines = await readPdfLines(files[0]); }
      catch { lines = []; }
    }
    const sourceText = lines.length ? lines.map((line) => line.text).join("\n") : ocrText;
    if (!sourceText.trim()) throw new Error("Önce PDF metnini çıkar veya taranmış belge için OCR çalıştır.");
    const parsed = parseCreditPlan(sourceText);
    if (!parsed.installments.length && !parsed.principal && !parsed.bank) {
      throw new Error("Belgeden yeterli kredi bilgisi çıkarılamadı. OCR sonucunu kontrol et.");
    }
    setPdfLines(lines);
    setCreditPlan(parsed);
    setStatus("Kredi planı taslağı oluşturuldu. Tutarları kaynak PDF ile karşılaştırmadan kaydetme.");
  }

  function sendCreditPlanToKrediPlanlari() {
    if (!creditPlan) return;
    const rows = creditPlan.installments
      .filter((item) => item.dueDate && item.payment !== null && Number.isFinite(item.payment) && item.payment > 0)
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
    if (!rows.length) {
      setError("Aktarılabilecek geçerli taksit bulunamadı. Önce PDF metnini veya OCR sonucunu kontrol et.");
      return;
    }
    const schedule = rows.map((item, index) => ({
      installment_no: index + 1,
      due_date: item.dueDate!,
      installment_amount: String(item.payment),
      status: "pending" as const,
      principal_amount: item.principal === null ? "" : String(item.principal),
      interest_amount: item.interest === null ? "" : String(item.interest),
      fees_amount: "",
      remaining_principal: item.remainingDebt === null ? "" : String(item.remainingDebt),
    }));
    const loanType = creditPlan.creditType === "Konut Kredisi" ? "konut"
      : creditPlan.creditType === "Taşıt Kredisi" ? "tasit"
      : creditPlan.creditType === "İhtiyaç Kredisi" ? "ihtiyac"
      : creditPlan.creditType === "Ticari Kredi" ? "ticari" : "diger";
    const draft = {
      bank_name: creditPlan.bank || "",
      loan_type: loanType,
      currency: "TRY",
      principal_amount: creditPlan.principal === null ? "" : String(creditPlan.principal),
      remaining_amount: "",
      annual_interest_rate: "",
      monthly_interest_rate: creditPlan.monthlyInterestRate === null ? "" : String(creditPlan.monthlyInterestRate),
      schedule,
      warnings: [
        ...creditPlan.warnings,
        "Belge Merkezi aktarımı: banka, kredi anaparası, güncel kalan borç ve tüm taksitleri kaynak PDF ile karşılaştır.",
        "Güncel kalan borç güvenli olması için otomatik doldurulmaz; bankanın güncel bakiye ekranından doğrulayarak gir.",
      ],
      fileName: files[0]?.name || "Belge Merkezi PDF aktarımı",
    };
    window.sessionStorage.setItem("pamuk-credit-plan-draft", JSON.stringify(draft));
    window.location.assign("/panel/kredi-planlari");
  }

  async function exportExcel() {
    let lines = pdfLines;
    if (!lines.length) lines = await readPdfLines(files[0]);
    if (!lines.length) throw new Error("PDF'de metin bulunamadı. Taranmış PDF için OCR kullan.");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("PDF Metni");
    sheet.columns = [{ header: "Sayfa", key: "page", width: 12 }, { header: "Satır", key: "line", width: 12 }, { header: "Metin", key: "text", width: 90 }];
    lines.forEach((line, index) => sheet.addRow({ page: line.page, line: index + 1, text: line.text }));
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    if (creditPlan) {
      const planSheet = workbook.addWorksheet("Kredi Planı");
      planSheet.columns = [
        { header: "Taksit", key: "number", width: 10 },
        { header: "Vade Tarihi", key: "date", width: 16 },
        { header: "Taksit Tutarı (TL)", key: "payment", width: 20 },
        { header: "Anapara (TL)", key: "principal", width: 18 },
        { header: "Faiz (TL)", key: "interest", width: 18 },
        { header: "Kalan Borç (TL)", key: "remaining", width: 20 },
        { header: "Kaynak Satır", key: "source", width: 70 },
      ];
      creditPlan.installments.forEach((item) => planSheet.addRow({
        number: item.number, date: item.dueDate, payment: item.payment,
        principal: item.principal, interest: item.interest,
        remaining: item.remainingDebt, source: item.sourceLine,
      }));
      planSheet.getRow(1).font = { bold: true };
      planSheet.views = [{ state: "frozen", ySplit: 1 }];
      planSheet.getColumn(3).numFmt = '#,##0.00';
      planSheet.getColumn(4).numFmt = '#,##0.00';
      planSheet.getColumn(5).numFmt = '#,##0.00';
      planSheet.getColumn(6).numFmt = '#,##0.00';
    }
    const bytes = await workbook.xlsx.writeBuffer();
    downloadBlob(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), safeName(files[0].name) + "-tablo.xlsx");
    setPdfLines(lines); setStatus("Excel dosyası hazır. PDF'den çıkarılabilen metin satırları tabloya aktarıldı.");
  }
  async function exportWord() {
    const lines = pdfLines.length ? pdfLines : await readPdfLines(files[0]);
    if (!lines.length) throw new Error("PDF'de metin bulunamadı. Taranmış PDF için OCR kullan.");
    downloadBlob(new Blob(["\ufeff", textHtml(lines)], { type: "application/msword;charset=utf-8" }), safeName(files[0].name) + "-aktarim.doc");
    setPdfLines(lines); setStatus("Word ile açılabilen belge oluşturuldu.");
  }
  async function imagesToPdf() {
    checkFiles(files);
    const doc = await PDFDocument.create();
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      let image;
      if (file.type === "image/jpeg" || /\.jpe?g$/i.test(file.name)) image = await doc.embedJpg(bytes);
      else if (file.type === "image/png" || /\.png$/i.test(file.name)) image = await doc.embedPng(bytes);
      else throw new Error("Resimden PDF için JPG veya PNG seç. HEIC önce JPG/PNG'ye çevrilmeli.");
      const scale = Math.min(1, 1200 / Math.max(image.width, image.height));
      const width = image.width * scale, height = image.height * scale;
      const page = doc.addPage([width, height]);
      page.drawImage(image, { x: 0, y: 0, width, height });
    }
    const bytes = await doc.save({ useObjectStreams: true });
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "pamuk-eller-resimler.pdf");
    setStatus(files.length + " görsel tek PDF dosyasında birleştirildi.");
  }
  async function mergePdfs() {
    if (!isPdfSet || files.length < 2) throw new Error("Birleştirmek için en az iki PDF seç.");
    const merged = await PDFDocument.create();
    for (const file of files) {
      const source = await PDFDocument.load(await file.arrayBuffer());
      if (source.getPageCount() > MAX_PDF_PAGES || merged.getPageCount() + source.getPageCount() > MAX_PDF_PAGES) throw new Error("Birleştirilmiş belge en fazla 100 sayfa olabilir.");
      const copied = await merged.copyPages(source, source.getPageIndices());
      copied.forEach((page) => merged.addPage(page));
    }
    const bytes = await merged.save({ useObjectStreams: true });
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), "pamuk-eller-birlestirilmis.pdf");
    setStatus(files.length + " PDF birleştirildi.");
  }
  async function splitPdf() {
    if (!files[0] || !isPdfSet || files.length !== 1) throw new Error("Sayfa ayırmak için tek PDF seç.");
    const source = await PDFDocument.load(await files[0].arrayBuffer());
    const match = pageRange.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error("Sayfa aralığını 2-5 veya tek sayfa için 3 şeklinde yaz.");
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (start < 1 || end < start || end > source.getPageCount() || end - start > 49) throw new Error("Sayfa aralığı PDF sınırları içinde ve en fazla 50 sayfa olmalı.");
    const output = await PDFDocument.create();
    const copied = await output.copyPages(source, Array.from({ length: end - start + 1 }, (_, i) => start - 1 + i));
    copied.forEach((page) => output.addPage(page));
    const bytes = await output.save({ useObjectStreams: true });
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), safeName(files[0].name) + "-sayfa-" + start + "-" + end + ".pdf");
    setStatus(start + "–" + end + ". sayfalar ayrı PDF olarak kaydedildi.");
  }
  async function rotatePdf() {
    if (!files[0] || !isPdfSet || files.length !== 1) throw new Error("Döndürmek için tek PDF seç.");
    const doc = await PDFDocument.load(await files[0].arrayBuffer());
    doc.getPages().forEach((page) => page.setRotation(degrees((page.getRotation().angle + 90) % 360)));
    const bytes = await doc.save({ useObjectStreams: true });
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), safeName(files[0].name) + "-dondurulmus.pdf");
    setStatus("PDF sayfaları saat yönünde 90° döndürüldü.");
  }
  async function optimizePdf() {
    if (!files[0] || !isPdfSet || files.length !== 1) throw new Error("Optimize etmek için tek PDF seç.");
    const doc = await PDFDocument.load(await files[0].arrayBuffer());
    const bytes = await doc.save({ useObjectStreams: true, objectsPerTick: 50 });
    downloadBlob(new Blob([bytes], { type: "application/pdf" }), safeName(files[0].name) + "-optimize.pdf");
    setStatus("PDF yeniden yazıldı. Sıkıştırma miktarı belgenin yapısına göre değişebilir; çıktı boyutunu kontrol et.");
  }
  async function runOcr() {
    if (!files[0] || !isPdfSet || files.length !== 1) throw new Error("OCR için tek PDF seç.");
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await files[0].arrayBuffer()) }).promise;
    if (doc.numPages > 20) throw new Error("OCR güvenli işlem sınırı 20 sayfadır. Büyük belgeleri bölerek işle.");
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("tur+eng");
    try {
      let result = "";
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Belge sayfası görüntülenemedi.");
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        const recognized = await worker.recognize(canvas);
        result += "\n--- Sayfa " + i + " ---\n" + recognized.data.text;
        canvas.width = 0; canvas.height = 0; page.cleanup();
      }
      setOcrText(result.trim());
      if (!result.trim()) throw new Error("OCR metin bulamadı.");
      setStatus("Taranmış PDF'den metin çıkarıldı. Metni kontrol etmeden finansal kayda dönüştürme.");
    } finally { await worker.terminate(); }
  }

  const hasFiles = files.length > 0;
  return <main className="mx-auto w-full max-w-6xl space-y-5 p-4 pb-24 sm:p-6">
    <header className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-accent">Pamuk Eller • Belge araçları</p>
      <h1 className={baslik}>Belge Merkezi</h1>
      <p className="max-w-2xl text-sm text-muted">PDF ve görsellerini uygulamadan çıkmadan görüntüle, dönüştür, birleştir ve metinlerini tabloya aktar.</p>
    </header>
    <section className={kart + " space-y-3"}>
      <div className="flex items-center gap-2"><FileUpIcon /><h2 className="font-bold">Dosya seç</h2></div>
      <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-inner p-5 text-center hover:border-accent">
        <FileText size={30} className="mb-2 text-accent" />
        <span className="font-semibold">PDF veya JPG/PNG dosyalarını seç</span>
        <span className="mt-1 text-xs text-muted">Birleştirme ve resimden PDF için birden fazla dosya seçebilirsin</span>
        <input className="sr-only" type="file" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" multiple onChange={(e) => selectFiles(e.target.files)} />
      </label>
      {hasFiles && <div className="space-y-2">
        {files.map((file, i) => <div key={file.name + i} className="flex items-center justify-between gap-2 rounded-xl bg-inner p-3 text-sm"><span className="min-w-0 truncate">{file.name}</span><span className="shrink-0 text-xs text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</span></div>)}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted"><span>{files.length} dosya seçildi • {(totalSize / 1024 / 1024).toFixed(2)} MB</span><button className="text-accent underline" onClick={() => selectFiles(null)}>Seçimi temizle</button></div>
      </div>}
      <p className="flex items-start gap-2 text-xs text-muted"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-up" /> Dosyalar bu araçlarda tarayıcı içinde işlenir; bu sayfa dosyaları kendi başına sunucuya yüklemez veya kalıcı olarak saklamaz.</p>
    </section>
    {error && <div role="alert" className="flex gap-2 rounded-xl border border-down/30 bg-down/10 p-3 text-sm text-down"><AlertCircle size={18} className="shrink-0"/>{error}</div>}
    {status && <div role="status" className="rounded-xl border border-up/30 bg-up/10 p-3 text-sm text-up">{status}</div>}
    <section className={kart + " space-y-3"}>
      <div className="flex items-center gap-2"><CalculatorIcon /><h2 className="font-bold">Akıllı kredi planı okuyucu</h2></div>
      <p className="text-sm text-muted">Yüklediğin kredi ödeme planından banka, kredi tutarı ve taksit satırlarını çıkarmayı dener. Sonuçlar taslaktır; banka belgesiyle karşılaştırılmadan finansal kayda aktarılmaz.</p>
      <button type="button" disabled={!isPdfSet || files.length !== 1 || busy} onClick={() => run(analyzeCreditPlan)} className={dugme + " w-full disabled:opacity-40"}>
        {busy ? "Analiz ediliyor..." : "Kredi planını analiz et"}
      </button>
      {creditPlan && <div className="space-y-3 rounded-xl border border-line bg-inner p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">Analiz taslağı</h3>
          <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold">Güven göstergesi: %{creditPlan.confidence}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <div><p className="text-xs text-muted">Banka</p><p className="font-semibold">{creditPlan.bank || "Bulunamadı"}</p></div>
          <div><p className="text-xs text-muted">Kredi türü</p><p className="font-semibold">{creditPlan.creditType || "Bulunamadı"}</p></div>
          <div><p className="text-xs text-muted">Kredi tutarı</p><p className="font-semibold">{creditPlan.principal === null ? "Bulunamadı" : creditPlan.principal.toLocaleString("tr-TR") + " TL"}</p></div>
          <div><p className="text-xs text-muted">Aylık faiz</p><p className="font-semibold">{creditPlan.monthlyInterestRate === null ? "Bulunamadı" : "%" + creditPlan.monthlyInterestRate}</p></div>
          <div><p className="text-xs text-muted">Bulunan taksit</p><p className="font-semibold">{creditPlan.installmentCount}</p></div>
          <div><p className="text-xs text-muted">Bulunan toplam ödeme</p><p className="font-semibold">{creditPlan.totalPayment.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL</p></div>
        </div>
        {creditPlan.totalInterest !== null && <p className="text-sm">Tahmini toplam faiz farkı: <b>{creditPlan.totalInterest.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} TL</b> <span className="text-xs text-muted">(masraf ve sigortalar ayrıştırılmamış olabilir)</span></p>}
        {creditPlan.warnings.length > 0 && <div className="rounded-lg border border-down/30 bg-down/5 p-3 text-xs text-down"><b>Kontrol edilmesi gerekenler</b><ul className="mt-1 list-disc pl-4">{creditPlan.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
        {creditPlan.installments.length > 0 && <div className="max-h-72 overflow-auto rounded-lg border border-line">
          <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-card"><tr><th className="p-2">No</th><th className="p-2">Vade</th><th className="p-2">Taksit</th><th className="p-2">Anapara</th><th className="p-2">Faiz</th><th className="p-2">Kalan borç</th></tr></thead><tbody>{creditPlan.installments.map((item, index) => <tr key={item.number + "-" + index} className="border-t border-line"><td className="p-2">{item.number}</td><td className="p-2 whitespace-nowrap">{item.dueDate || "—"}</td><td className="p-2 whitespace-nowrap">{item.payment?.toLocaleString("tr-TR") ?? "—"}</td><td className="p-2 whitespace-nowrap">{item.principal?.toLocaleString("tr-TR") ?? "—"}</td><td className="p-2 whitespace-nowrap">{item.interest?.toLocaleString("tr-TR") ?? "—"}</td><td className="p-2 whitespace-nowrap">{item.remainingDebt?.toLocaleString("tr-TR") ?? "—"}</td></tr>)}</tbody></table>
        </div>}
        <p className="text-xs text-muted">Bu bir otomatik okuma taslağıdır. Tablodaki sütun eşleştirmeleri bankaya göre değişebilir. Henüz Kredi Merkezi'ne otomatik kayıt yapılmaz.</p>
        <button type="button" onClick={() => run(exportExcel)} disabled={busy} className={dugme + " w-full"}>Analiz ve taksitleri Excel'e aktar</button>
        <button type="button" onClick={sendCreditPlanToKrediPlanlari} disabled={busy || !creditPlan.installments.some((item) => item.dueDate && item.payment !== null && item.payment > 0)} className={dugme + " w-full"}>
          Taksitleri Kredi Planlarım'a aktar
        </button>
        <p className="text-xs text-muted">Aktarım bir taslak oluşturur. Kredi Planlarım'da banka ve borç bilgilerini kontrol edip kaydetmeden önce onaylayacaksın.</p>
      </div>}
    </section>
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <Tool title="Resim → PDF" detail="JPG ve PNG dosyalarını tek PDF yap." icon={<FileImage/>} disabled={!hasFiles || busy} loading={busy} onClick={() => run(imagesToPdf)}/>
      <Tool title="PDF'leri birleştir" detail="Seçtiğin PDF'leri sırayla birleştir." icon={<Files/>} disabled={!isPdfSet || files.length < 2 || busy} loading={busy} onClick={() => run(mergePdfs)}/>
      <Tool title="PDF → Excel" detail="PDF metin satırlarını Excel tablosuna aktar." icon={<FileSpreadsheet/>} disabled={!isPdfSet || files.length !== 1 || busy} loading={busy} onClick={() => run(exportExcel)}/>
      <Tool title="PDF → Word" detail="Çıkarılabilir metni Word'de açılabilir belgeye dönüştür." icon={<FileType/>} disabled={!isPdfSet || files.length !== 1 || busy} loading={busy} onClick={() => run(exportWord)}/>
      <Tool title="PDF sayfalarını ayır" detail="İstediğin sayfa aralığını ayrı PDF kaydet." icon={<Scissors/>} disabled={!isPdfSet || files.length !== 1 || busy} loading={busy} onClick={() => run(splitPdf)}>
        <div className="mt-2"><label className={etiket}>Sayfa aralığı</label><input className={girdi} value={pageRange} onChange={(e) => setPageRange(e.target.value)} placeholder="Örn. 2-5" onClick={(e) => e.stopPropagation()}/></div>
      </Tool>
      <Tool title="PDF döndür" detail="Tüm sayfaları saat yönünde 90° çevir." icon={<RotateCw/>} disabled={!isPdfSet || files.length !== 1 || busy} loading={busy} onClick={() => run(rotatePdf)}/>
      <Tool title="PDF optimize et" detail="PDF'yi yeniden yazar; boyut azalması garanti değildir." icon={<Minimize2/>} disabled={!isPdfSet || files.length !== 1 || busy} loading={busy} onClick={() => run(optimizePdf)}/>
      <Tool title="Taranmış PDF • OCR" detail="Türkçe ve İngilizce metni sayfalardan tanı." icon={<ScanText/>} disabled={!isPdfSet || files.length !== 1 || busy} loading={busy} onClick={() => run(runOcr)}/>
      <Tool title="PDF metnini çıkar" detail="Seçilebilir metni sayfa sırasıyla oku." icon={<FileText/>} disabled={!isPdfSet || files.length !== 1 || busy} loading={busy} onClick={() => run(loadPdfText)}/>
    </section>
    {previewUrl && <section className={kart + " space-y-3"}>
      <div className="flex items-center gap-2"><Eye size={18}/><h2 className="font-bold">PDF görüntüleyici</h2></div>
      <iframe title="PDF önizleme" src={previewUrl} className="h-[65vh] min-h-80 w-full rounded-xl border border-line bg-white"/>
    </section>}
    {pdfLines.length > 0 && <section className={kart + " space-y-3"}>
      <h2 className="font-bold">Çıkarılan metin tablosu</h2>
      <div className="max-h-96 overflow-auto rounded-xl border border-line">
        <table className="w-full text-left text-sm"><thead className="sticky top-0 bg-inner"><tr><th className="p-2">Sayfa</th><th className="p-2">Metin</th></tr></thead><tbody>{pdfLines.slice(0, 500).map((line, i) => <tr key={i} className="border-t border-line"><td className="p-2 align-top">{line.page}</td><td className="p-2">{line.text}</td></tr>)}</tbody></table>
      </div>
      {pdfLines.length > 500 && <p className="text-xs text-muted">Önizlemede ilk 500 satır gösteriliyor; Excel çıktısında tüm çıkarılan satırlar bulunur.</p>}
    </section>}
    {ocrText && <section className={kart + " space-y-2"}><div className="flex items-center justify-between gap-2"><h2 className="font-bold">OCR sonucu</h2><button className="text-xs text-accent underline" onClick={() => downloadBlob(new Blob([ocrText], {type:"text/plain;charset=utf-8"}), "pamuk-eller-ocr.txt")}>Metni indir</button></div><textarea readOnly value={ocrText} className="min-h-64 w-full rounded-xl border border-line bg-inner p-3 text-sm"/></section>}
    <p className="text-xs text-muted">Not: PDF → Excel, PDF'de metin olarak bulunan satırları aktarır; karmaşık tablo düzenlerinde sütunları otomatik ve kusursuz ayırma garantisi yoktur. Banka ekstresi ve kredi planı gibi finansal belgelerde, ilgili aktarım ekranındaki kontrol ve onay adımlarını kullan.</p>
  </main>;
}

function FileUpIcon() { return <Download size={18} className="text-accent"/>; }
function CalculatorIcon() { return <FileSpreadsheet size={18} className="text-accent"/>; }
function Tool({ title, detail, icon, disabled, loading, onClick, children }: { title: string; detail: string; icon: React.ReactNode; disabled: boolean; loading: boolean; onClick: () => void; children?: React.ReactNode }) {
  return <article className={kart + " flex flex-col gap-2"}>
    <div className="flex items-center gap-2 text-accent">{icon}<h2 className="font-bold text-fg">{title}</h2></div>
    <p className="min-h-10 text-xs text-muted">{detail}</p>
    {children}
    <button type="button" disabled={disabled} onClick={onClick} className={dugme + " mt-auto w-full disabled:cursor-not-allowed disabled:opacity-40"}>
      {loading ? <><LoaderCircle size={15} className="mr-2 inline animate-spin"/>İşleniyor...</> : "Uygula ve indir"}
    </button>
  </article>;
}
