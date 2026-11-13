"use client";

import { useState } from "react";
import { Bot, Send, X, Sparkles } from "lucide-react";
import { supabase } from "../../lib/supabase";

type ChatLine = { role: "user" | "assistant"; text: string };

export default function AssistantBubble() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    { role: "assistant", text: "Merhaba! Ben Pamuk Eller finans asistanıyım. Bütçe, gelir-gider, tasarruf ve yatırım kavramlarında yardımcı olabilirim. Ne öğrenmek istersin?" }
  ]);

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
        body: JSON.stringify({ message, history: lines.slice(-8) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Asistan şu anda yanıt veremiyor.");
      setLines((old) => [...old, { role: "assistant", text: result.reply }]);
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
          <div className="flex items-center gap-2"><span className="rounded-xl bg-accent/15 p-2 text-accent"><Bot size={20}/></span><div><b className="text-sm">Pamuk Eller AI</b><p className="text-xs text-muted">Finans yol arkadaşın</p></div></div>
          <button onClick={() => setOpen(false)} aria-label="Kapat" className="rounded-lg p-2 text-muted hover:bg-inner"><X size={18}/></button>
        </header>
        <div className="flex-1 space-y-3 overflow-y-auto p-3">
          {lines.map((line, i) => <div key={i} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${line.role === "user" ? "ml-auto bg-accent text-accent-fg" : "bg-inner text-fg"}`}>{line.text}</div>)}
          {busy && <p className="text-xs text-muted">Asistan düşünüyor...</p>}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Bir şey sor..." className="min-w-0 flex-1 rounded-xl border border-line bg-inner px-3 py-2 text-sm text-fg outline-none" />
          <button disabled={busy || !input.trim()} className="rounded-xl bg-accent p-3 text-accent-fg disabled:opacity-40" aria-label="Gönder"><Send size={17}/></button>
        </form>
      </section>}
    </>
  );
}
