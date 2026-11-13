"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import type { Kategori } from "../../../lib/tipler";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";

export default function Kategoriler() {
  const { aileId, yazabilir } = useAile();
  const [liste, setListe] = useState<Kategori[]>([]);
  const [ad, setAd] = useState("");
  const [tur, setTur] = useState<"gelir" | "gider">("gider");
  const [hata, setHata] = useState("");

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("family_id", aileId)
      .order("name");
    if (error) setHata(error.message);
    else setListe((data ?? []) as Kategori[]);
  }, [aileId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    if (!ad.trim()) {
      setHata("Kategori adı yaz.");
      return;
    }
    const { error } = await supabase
      .from("categories")
      .insert({ family_id: aileId, name: ad.trim(), kind: tur });
    if (error) setHata(error.message);
    else {
      setAd("");
      await yukle();
    }
  }

  async function sil(id: string, isim: string) {
    if (!window.confirm(`"${isim}" kategorisi silinsin mi? Bu kategorideki işlemler "Kategorisiz" olur.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) setHata(error.message);
    else await yukle();
  }

  const grup = (k: "gelir" | "gider", baslikMetni: string) => (
    <div className={kart}>
      <h2 className="mb-3 font-semibold">{baslikMetni}</h2>
      <div className="flex flex-wrap gap-2">
        {liste
          .filter((x) => x.kind === k)
          .map((x) => (
            <span key={x.id} className="flex items-center gap-2 rounded-full bg-inner px-4 py-2 text-sm">
              {x.name}
              {yazabilir && (
                <button onClick={() => sil(x.id, x.name)} className="text-muted hover:text-down" aria-label={`${x.name} sil`}>
                  ×
                </button>
              )}
            </span>
          ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className={baslik}>Kategoriler</h1>
      {hata && <p className="text-sm text-down">{hata}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {grup("gelir", "Gelir kategorileri")}
        {grup("gider", "Gider kategorileri")}
      </div>

      {yazabilir && (
        <form onSubmit={ekle} className={kart + " grid gap-3 md:grid-cols-3"}>
          <div className="md:col-span-2">
            <label className={etiket}>Yeni kategori adı</label>
            <input className={girdi} value={ad} onChange={(e) => setAd(e.target.value)} placeholder="Örn: Abonelikler" />
          </div>
          <div>
            <label className={etiket}>Tür</label>
            <select className={girdi} value={tur} onChange={(e) => setTur(e.target.value as "gelir" | "gider")}>
              <option value="gider">Gider</option>
              <option value="gelir">Gelir</option>
            </select>
          </div>
          <button type="submit" className={dugme + " md:col-span-3"}>
            Kategori Ekle
          </button>
        </form>
      )}
    </div>
  );
}
