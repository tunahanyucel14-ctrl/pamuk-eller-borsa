"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { girdi, dugme } from "../../lib/ui";

function hataCevir(mesaj: string) {
  const m = mesaj.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid_credentials")) return "E-posta veya şifre hatalı.";
  if (m.includes("already registered")) return "Bu e-posta ile zaten kayıt var.";
  if (m.includes("password")) return "Şifre en az 6 karakter olmalı.";
  if (m.includes("valid email")) return "Geçerli bir e-posta yaz.";
  if (m.includes("fetch") || m.includes("network")) return "Sunucuya bağlanılamadı. İnternet bağlantını kontrol edip tekrar dene.";
  return "Bir hata oluştu: " + mesaj;
}

export default function GirisSayfasi() {
  const router = useRouter();
  const [mod, setMod] = useState<"giris" | "kayit">("giris");
  const [email, setEmail] = useState("");
  const [sifre, setSifre] = useState("");
  const [kullanici, setKullanici] = useState("");
  const [mesaj, setMesaj] = useState("");
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(false);

  async function gonder(e: React.FormEvent) {
    e.preventDefault();
    if (yukleniyor) return;
    setHata("");
    setMesaj("");
    if (sifre.length < 6) {
      setHata("Şifre en az 6 karakter olmalı.");
      return;
    }
    if (mod === "kayit" && kullanici.trim().length < 3) {
      setHata("Kullanıcı adı en az 3 karakter olmalı.");
      return;
    }
    setYukleniyor(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (mod === "kayit") {
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: sifre,
          options: { data: { username: kullanici.trim() } },
        });
        if (error) throw error;
        if (data.session) router.replace("/panel");
        else setMesaj("Kayıt oluşturuldu. E-postana gelen onay bağlantısına tıkla, sonra giriş yap.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: sifre,
        });
        if (error) throw error;
        router.replace("/panel");
      }
    } catch (error) {
      setHata(hataCevir(error instanceof Error ? error.message : "Beklenmeyen bağlantı hatası."));
    } finally {
      setYukleniyor(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bg p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-card p-8">
        <h1 className="mb-1 text-2xl font-bold text-fg">PAMUK ELLER</h1>
        <p className="mb-6 text-sm text-muted">
          {mod === "giris" ? "Hesabına giriş yap" : "Yeni hesap oluştur"}
        </p>
        <form onSubmit={gonder} className="flex flex-col gap-3">
          {mod === "kayit" && (
            <input className={girdi} placeholder="Kullanıcı adı" value={kullanici}
              onChange={(e) => setKullanici(e.target.value)} minLength={3} maxLength={40} required />
          )}
          <input className={girdi} type="email" placeholder="E-posta" value={email}
            onChange={(e) => setEmail(e.target.value)} autoComplete="email" maxLength={254} required />
          <input className={girdi} type="password" placeholder="Şifre (en az 6 karakter)" value={sifre}
            onChange={(e) => setSifre(e.target.value)} autoComplete={mod === "giris" ? "current-password" : "new-password"}
            minLength={6} maxLength={128} required />
          {hata && <p role="alert" className="text-sm text-down">{hata}</p>}
          {mesaj && <p role="status" className="text-sm text-up">{mesaj}</p>}
          <button type="submit" disabled={yukleniyor} className={dugme + " mt-2"}>
            {yukleniyor ? "Bekle..." : mod === "giris" ? "Giriş Yap" : "Kayıt Ol"}
          </button>
        </form>
        <button type="button" disabled={yukleniyor}
          onClick={() => { setMod(mod === "giris" ? "kayit" : "giris"); setHata(""); setMesaj(""); }}
          className="mt-5 w-full text-center text-sm text-muted hover:text-fg disabled:opacity-50">
          {mod === "giris" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
        </button>
      </div>
    </main>
  );
}
