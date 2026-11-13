"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { sayiyaCevir, tl } from "../../../lib/finans";
import { HESAP_TURU_ADI } from "../../../lib/tipler";
import type { Bakiye } from "../../../lib/tipler";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";
import { BANKALAR } from "../../../lib/kataloglar";

export default function Hesaplar() {
  const { aileId, yazabilir } = useAile();
  const [liste, setListe] = useState<Bakiye[]>([]);
  const [ad, setAd] = useState("");
  const [banka, setBanka] = useState("Ziraat Bankası");
  const [tur, setTur] = useState("banka");
  const [acilis, setAcilis] = useState("");
  const [hata, setHata] = useState("");
  const [bekle, setBekle] = useState(false);

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from("account_balances")
      .select("*")
      .eq("family_id", aileId)
      .order("name");
    if (error) {
      setHata(error.message);
      return;
    }
    setListe(
      ((data ?? []) as Bakiye[]).map((x) => ({
        ...x,
        balance: Number(x.balance),
        opening_balance: Number(x.opening_balance),
      }))
    );
  }, [aileId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    const tutar = acilis.trim() === "" ? 0 : sayiyaCevir(acilis);
    if (!ad.trim()) {
      setHata("Hesap adı yaz.");
      return;
    }
    if (Number.isNaN(tutar)) {
      setHata("Açılış bakiyesi geçerli bir sayı olmalı.");
      return;
    }
    setBekle(true);
    const { error } = await supabase.from("accounts").insert({
      family_id: aileId,
      name: tur === "banka" ? banka + " · " + ad.trim() : ad.trim(),
      type: tur,
      currency: "TRY",
      opening_balance: tutar,
    });
    if (error) {
      setHata(error.message);
    } else {
      setAd("");
      setAcilis("");
      await yukle();
    }
    setBekle(false);
  }

  async function sil(id: string, isim: string) {
    if (!window.confirm(`"${isim}" hesabı silinsin mi?`)) return;
    setHata("");
    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) {
      setHata(
        error.message.includes("violates foreign key")
          ? "Bu hesapta işlem kayıtları var, önce işlemleri sil."
          : error.message
      );
    } else {
      await yukle();
    }
  }

  const toplam = liste.reduce((t, x) => t + x.balance, 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className={baslik}>Hesaplarım</h1>
      {hata && <p className="text-sm text-down">{hata}</p>}

      <div className={kart}>
        <div className="mb-3 flex justify-between">
          <h2 className="font-semibold">Hesap listesi</h2>
          <p className="font-semibold text-accent">{tl(toplam)}</p>
        </div>
        {liste.length === 0 && <p className="text-sm text-muted">Henüz hesap yok.</p>}
        <div className="flex flex-col gap-2">
          {liste.map((h) => (
            <div key={h.account_id} className="flex items-center justify-between rounded-xl bg-inner px-4 py-3">
              <div>
                <p className="font-medium">{h.name}</p>
                <p className="text-xs text-muted">
                  {HESAP_TURU_ADI[h.type] ?? h.type} · açılış {tl(h.opening_balance)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-semibold">{tl(h.balance)}</p>
                {yazabilir && (
                  <button
                    onClick={() => sil(h.account_id, h.name)}
                    className="text-xs text-muted hover:text-down"
                  >
                    Sil
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {yazabilir ? (
        <form onSubmit={ekle} className={kart + " grid gap-3 md:grid-cols-4"}>
          <div className="md:col-span-2">
            <label className={etiket}>Banka / finans kuruluşu</label>
            <select className={girdi} value={banka} onChange={(e) => setBanka(e.target.value)} disabled={tur !== "banka"}>
              {["Ziraat Bankası", "Akbank", "Garanti BBVA", "İş Bankası", "Yapı Kredi", "QNB", "Enpara Bank", "Halkbank", "VakıfBank", "DenizBank", "TEB", "ING", "Fibabanka", "Diğer / listede yok"].map((x) => <option key={x} value={x}>{x}</option>)}
              <optgroup label="BDDK kayıtlı diğer bankalar">{BANKALAR.filter((b) => !["Ziraat Bankası", "Akbank", "Garanti BBVA", "İş Bankası", "Yapı Kredi", "QNB", "Enpara Bank", "Halkbank", "VakıfBank", "DenizBank", "TEB", "ING", "Fibabanka"].includes(b.name)).map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}</optgroup>
            </select>
            <label className={etiket}>Hesap adı</label>
            <input className={girdi} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Örn: Maaş hesabı / Birikim" />
          </div>
          <div>
            <label className={etiket}>Tür</label>
            <select className={girdi} value={tur} onChange={(e) => setTur(e.target.value)}>
              <option value="banka">Banka</option>
              <option value="nakit">Nakit</option>
              <option value="yatirim">Yatırım</option>
            </select>
          </div>
          <div>
            <label className={etiket}>Açılış bakiyesi (TL)</label>
            <input className={girdi} inputMode="decimal" value={acilis} onChange={(e) => setAcilis(e.target.value)} placeholder="0" />
          </div>
          <button type="submit" disabled={bekle} className={dugme + " md:col-span-4"}>
            {bekle ? "Ekleniyor..." : "Hesap Ekle"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-muted">İzleyici rolünde hesap ekleyemezsin.</p>
      )}
    </div>
  );
}
