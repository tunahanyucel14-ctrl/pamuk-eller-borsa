"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAile } from "../../lib/aile-baglami";
import { ayAraligi, bugunAy, tarihTR, tl } from "../../lib/finans";
import type { Bakiye, Islem, Kategori } from "../../lib/tipler";
import { kart, girdi, baslik } from "../../lib/ui";

export default function GenelBakis() {
  const { aileId } = useAile();
  const [ay, setAy] = useState(bugunAy());
  const [bakiyeler, setBakiyeler] = useState<Bakiye[]>([]);
  const [islemler, setIslemler] = useState<Islem[]>([]);
  const [kategoriler, setKategoriler] = useState<Kategori[]>([]);
  const [hata, setHata] = useState("");
  const [yukleniyor, setYukleniyor] = useState(true);

  useEffect(() => {
    let iptal = false;
    async function yukle() {
      setYukleniyor(true);
      const { bas, sonraki } = ayAraligi(ay);
      const [b, i, k] = await Promise.all([
        supabase.from("account_balances").select("*").eq("family_id", aileId),
        supabase
          .from("fin_transactions")
          .select("*")
          .eq("family_id", aileId)
          .gte("tx_date", bas)
          .lt("tx_date", sonraki)
          .order("tx_date", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("categories").select("*").eq("family_id", aileId),
      ]);
      if (iptal) return;
      const h = b.error || i.error || k.error;
      if (h) {
        setHata(h.message);
      } else {
        setHata("");
        setBakiyeler(
          ((b.data ?? []) as Bakiye[]).map((x) => ({
            ...x,
            balance: Number(x.balance),
            opening_balance: Number(x.opening_balance),
          }))
        );
        setIslemler(
          ((i.data ?? []) as Islem[]).map((x) => ({ ...x, amount: Number(x.amount) }))
        );
        setKategoriler((k.data ?? []) as Kategori[]);
      }
      setYukleniyor(false);
    }
    yukle();
    return () => {
      iptal = true;
    };
  }, [aileId, ay]);

  const gelir = islemler.filter((x) => x.kind === "gelir").reduce((t, x) => t + x.amount, 0);
  const gider = islemler.filter((x) => x.kind === "gider").reduce((t, x) => t + x.amount, 0);
  const net = gelir - gider;
  const toplamVarlik = bakiyeler.reduce((t, x) => t + x.balance, 0);

  const kategoriAdi = (id: string | null) =>
    kategoriler.find((k) => k.id === id)?.name ?? "Kategorisiz";
  const hesapAdi = (id: string | null) => bakiyeler.find((h) => h.account_id === id)?.name ?? "-";

  const giderDagilimi = Object.entries(
    islemler
      .filter((x) => x.kind === "gider")
      .reduce<Record<string, number>>((acc, x) => {
        const ad = kategoriAdi(x.category_id);
        acc[ad] = (acc[ad] ?? 0) + x.amount;
        return acc;
      }, {})
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className={baslik}>Genel Bakış</h1>
        <input
          type="month"
          value={ay}
          onChange={(e) => e.target.value && setAy(e.target.value)}
          className={girdi + " !w-auto"}
        />
      </div>

      {hata && <p className="text-sm text-down">{hata}</p>}
      {yukleniyor && <p className="text-sm text-muted">Yükleniyor...</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className={kart}>
          <p className="text-xs text-muted">Toplam varlık</p>
          <p className="mt-1 text-lg font-bold">{tl(toplamVarlik)}</p>
        </div>
        <div className={kart}>
          <p className="text-xs text-muted">Aylık gelir</p>
          <p className="mt-1 text-lg font-bold text-up">{tl(gelir)}</p>
        </div>
        <div className={kart}>
          <p className="text-xs text-muted">Aylık gider</p>
          <p className="mt-1 text-lg font-bold text-down">{tl(gider)}</p>
        </div>
        <div className={kart}>
          <p className="text-xs text-muted">Net nakit akışı</p>
          <p className={"mt-1 text-lg font-bold " + (net >= 0 ? "text-up" : "text-down")}>
            {tl(net)}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className={kart}>
          <h2 className="mb-3 font-semibold">Hesap bakiyeleri</h2>
          {bakiyeler.length === 0 && (
            <p className="text-sm text-muted">Henüz hesap yok. Hesaplarım sayfasından ekle.</p>
          )}
          <div className="flex flex-col gap-2">
            {bakiyeler.map((h) => (
              <div key={h.account_id} className="flex justify-between rounded-xl bg-inner px-4 py-3">
                <span>{h.name}</span>
                <span className="font-semibold">{tl(h.balance)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={kart}>
          <h2 className="mb-3 font-semibold">Gider dağılımı</h2>
          {giderDagilimi.length === 0 && (
            <p className="text-sm text-muted">Bu ay gider kaydı yok.</p>
          )}
          <div className="flex flex-col gap-3">
            {giderDagilimi.map(([ad, tutar]) => (
              <div key={ad}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{ad}</span>
                  <span className="text-muted">
                    {tl(tutar)} · %{gider > 0 ? Math.round((tutar / gider) * 100) : 0}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-inner">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${gider > 0 ? (tutar / gider) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={kart}>
        <h2 className="mb-3 font-semibold">Son işlemler</h2>
        {islemler.length === 0 && (
          <p className="text-sm text-muted">Bu ay işlem yok. İşlemler sayfasından ilkini ekle.</p>
        )}
        <div className="flex flex-col gap-2">
          {islemler.slice(0, 8).map((x) => (
            <div key={x.id} className="flex items-center justify-between rounded-xl bg-inner px-4 py-3">
              <div>
                <p className="text-sm font-medium">
                  {x.description ||
                    (x.kind === "transfer"
                      ? `Transfer: ${hesapAdi(x.account_id)} → ${hesapAdi(x.to_account_id)}`
                      : kategoriAdi(x.category_id))}
                </p>
                <p className="text-xs text-muted">
                  {tarihTR(x.tx_date)} · {hesapAdi(x.account_id)}
                </p>
              </div>
              <p
                className={
                  "font-semibold " +
                  (x.kind === "gelir" ? "text-up" : x.kind === "gider" ? "text-down" : "text-muted")
                }
              >
                {x.kind === "gelir" ? "+" : x.kind === "gider" ? "-" : ""}
                {tl(x.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
