"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, Sparkles, RotateCcw, Activity } from "lucide-react";
import { supabase } from "../../lib/supabase";

type ChatLine = { role: "user" | "assistant"; text: string };

export default function AssistantBubble({ familyId, familyName }: { familyId: string; familyName: string }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [diagnosing, setDiagnosing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const welcomeMessage = `Merhaba! Ben EVREN, ${familyName} finans koçuyum. Bütçe, gelir-gider, tasarruf, borç ve yatırım kavramlarında yardımcı olabilirim. Ne öğrenmek istersin?`;
  const [lines, setLines] = useState<ChatLine[]>([{ role: "assistant", text: welcomeMessage }]);

  useEffect(() => {
    setLines([{ role: "assistant", text: welcomeMessage }]);
    setInput("");
  }, [familyId, familyName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines, busy, open]);

  function resetChat() {
    if (busy) return;
    setLines([{ role: "assistant", text: welcomeMessage }]);
    setInput("");
  }

  async function checkEvren() {
    if (diagnosing || busy) return;
    setDiagnosing(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Oturumun sona ermiş. Yeniden giriş yap.");
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ diagnostics: true, familyId }),
      });
      const result = await response.json().catch(() => null) as { message?: string; model?: string; termsAccepted?: boolean; httpStatus?: number } | null;
      const details = result?.message || "EVREN bağlantı kontrolü tamamlanamadı.";
      const model = result?.model ? ` Seçili yönlendirme: ${result.model}.` : "";
      const terms = result?.termsAccepted === false ? " Kullanım şartları EVREN sitesinden onaylanmalı." : "";
      setLines((old) => [...old, { role: "assistant", text: `EVREN bağlantı kontrolü: ${details}${model}${terms}` }]);
    } catch (error) {
      setLines((old) => [...old, { role: "assistant", text: error instanceof Error ? error.message : "EVREN bağlantısı kontrol edilemedi." }]);
    } finally {
      setDiagnosing(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setLines((old) => [...old, { role: "user", text: message }]);
    setBusy(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Oturumun sona ermiş. Yeniden giriş yap.");
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message, history: lines.slice(-8), familyId }),
      });
      const raw = await response.text();
      let result: { error?: string; reply?: string };
      try { result = JSON.parse(raw); }
      catch {
        const detail = raw.replace(/\s+/g, " ").trim().slice(0, 180);
        throw new Error(response.ok ? "Asistan geçerli bir yanıt döndürmedi." : `Sunucu hatası (${response.status}): ${detail || "Yanıt okunamadı."}`);
      }
      if (!response.ok) {
        throw new Error(result.error || `Asistan isteği başarısız (${response.status}).`);
      }
      if (typeof result.reply !== "string" || !result.reply.trim()) throw new Error("Asistan boş yanıt döndürdü.");
      const modelNote = result.model ? `\\n\\n<EVREN yönlendirmesi: ${result.model}>` : "";
      setLines((old) => [...old, { role: "assistant", text: (result.reply || "Asistan yanıt veremedi.") + modelNote }]);
    } catch (error) {
      setLines((old) => [...old, { role: "assistant", text: error instanceof Error ? error.message : "Bağlantı hatası." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label="Pamuk Eller yapay zekâ asistanını aç" className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 font-bold text-accent-fg shadow-xl hover:scale-[1.03]">
        <Sparkles size={18} /> Finans Asistanı
      </button>
      {open && <section className="fixed bottom-20 right-4 z-50 flex h-[min(620px,75vh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-line bg-card shadow-2xl">
        <header className="flex items-center justify-between bg-side px-4 py-3">
          <div className="flex items-center gap-2"><span className="rounded-xl bg-accent/15 p-2 text-accent"><Bot size={20}/></span><div><b className="text-sm">Pamuk Eller AI</b><p className="text-xs text-muted">{familyName} · EVREN finans koçu</p></div></div>
          <div className="flex items-center gap-1"><button onClick={checkEvren} disabled={diagnosing || busy} aria-label="EVREN bağlantısını test et" title="EVREN bağlantısını test et" className="rounded-lg p-2 text-muted hover:bg-inner disabled:opacity-40"><Activity size={16}/></button><button onClick={resetChat} disabled={busy} aria-label="Sohbeti temizle" title="Sohbeti temizle" className="rounded-lg p-2 text-muted hover:bg-inner disabled:opacity-40"><RotateCcw size={16}/></button><button onClick={() => setOpen(false)} aria-label="Kapat" className="rounded-lg p-2 text-muted hover:bg-inner"><X size={18}/></button></div>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {lines.map((line, i) => <div key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${line.role === "user" ? "ml-auto bg-accent text-accent-fg" : "bg-inner text-fg"}`}>{line.text}</div>)}
          {busy && <p className="text-xs text-muted" role="status">EVREN içindeki uygun model yanıt hazırlıyor...</p>}
          {diagnosing && <p className="text-xs text-muted" role="status">EVREN bağlantısı kontrol ediliyor...</p>}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
          <input value={input} maxLength={1500} onChange={(e) => setInput(e.target.value)} placeholder="Bir şey sor..." aria-label="Finans asistanına mesaj" className="min-w-0 flex-1 rounded-xl border border-line bg-inner px-3 py-2 text-sm text-fg outline-none" />
          <button disabled={busy || !input.trim()} className="rounded-xl bg-accent p-3 text-accent-fg disabled:opacity-40" aria-label="Gönder"><Send size={17}/></button>
        </form>
      </section>}
    </>
  );
}
