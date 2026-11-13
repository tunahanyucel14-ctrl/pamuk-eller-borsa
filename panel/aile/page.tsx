"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAile } from "../../../lib/aile-baglami";
import { ROL_ADI } from "../../../lib/tipler";
import type { Rol } from "../../../lib/tipler";
import { kart, girdi, dugme, etiket, baslik } from "../../../lib/ui";

type Uye = { user_id: string; role: Rol; username: string };

export default function Aile() {
  const { aileId, aileAdi, kullaniciId, yonetebilir } = useAile();
  const [uyeler, setUyeler] = useState<Uye[]>([]);
  const [email, setEmail] = useState("");
  const [rol, setRol] = useState<"admin" | "editor" | "viewer">("editor");
  const [hata, setHata] = useState("");
  const [mesaj, setMesaj] = useState("");

  const yukle = useCallback(async () => {
    const { data, error } = await supabase
      .from("family_members")
      .select("user_id, role")
      .eq("family_id", aileId);
    if (error) {
      setHata(error.message);
      return;
    }
    const satirlar = (data ?? []) as { user_id: string; role: Rol }[];
    const idler = satirlar.map((s) => s.user_id);
    const { data: profiller } = await supabase.from("profiles").select("id, username").in("id", idler);
    const adlar = new Map(
      ((profiller ?? []) as { id: string; username: string | null }[]).map((p) => [p.id, p.username ?? ""])
    );
    setUyeler(
      satirlar.map((s) => ({
        ...s,
        username: adlar.get(s.user_id) || "Kullanıcı " + s.user_id.slice(0, 6),
      }))
    );
  }, [aileId]);

  useEffect(() => {
    yukle();
  }, [yukle]);

  async function ekle(e: React.FormEvent) {
    e.preventDefault();
    setHata("");
    setMesaj("");
    const { error } = await supabase.rpc("add_family_member", {
      p_family: aileId,
      p_email: email,
      p_role: rol,
    });
    if (error) setHata(error.message);
    else {
      setMesaj("Üye eklendi.");
      setEmail("");
      await yukle();
    }
  }

  async function rolDegistir(uid: string, yeni: Rol) {
    setHata("");
    const { error } = await supabase
      .from("family_members")
      .update({ role: yeni })
      .eq("family_id", aileId)
      .eq("user_id", uid);
    if (error) setHata(error.message);
    else await yukle();
  }

  async function cikar(uid: string, isim: string) {
    if (!window.confirm(`${isim} aileden çıkarılsın mı?`)) return;
    const { error } = await supabase
      .from("family_members")
      .delete()
      .eq("family_id", aileId)
      .eq("user_id", uid);
    if (error) setHata(error.message);
    else await yukle();
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className={baslik}>Aile: {aileAdi}</h1>
      {hata && <p className="text-sm text-down">{hata}</p>}
      {mesaj && <p className="text-sm text-up">{mesaj}</p>}

      <div className={kart}>
        <h2 className="mb-3 font-semibold">Üyeler</h2>
        <div className="flex flex-col gap-2">
          {uyeler.map((u) => (
            <div key={u.user_id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-inner px-4 py-3">
              <div>
                <p className="font-medium">
                  {u.username}
                  {u.user_id === kullaniciId && <span className="text-xs text-muted"> (sen)</span>}
                </p>
                <p className="text-xs text-muted">{ROL_ADI[u.role]}</p>
              </div>
              {yonetebilir && u.role !== "owner" && u.user_id !== kullaniciId && (
                <div className="flex items-center gap-2">
                  <select
                    className="rounded-lg border border-line bg-card px-2 py-1 text-sm"
                    value={u.role}
                    onChange={(e) => rolDegistir(u.user_id, e.target.value as Rol)}
                  >
                    <option value="admin">Yönetici</option>
                    <option value="editor">Düzenleyici</option>
                    <option value="viewer">İzleyici</option>
                  </select>
                  <button onClick={() => cikar(u.user_id, u.username)} className="text-xs text-muted hover:text-down">
                    Çıkar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {yonetebilir && (
        <form onSubmit={ekle} className={kart + " grid gap-3 md:grid-cols-3"}>
          <div className="md:col-span-2">
            <label className={etiket}>Üyenin kayıtlı e-postası</label>
            <input type="email" className={girdi} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@mail.com" required />
          </div>
          <div>
            <label className={etiket}>Rol</label>
            <select className={girdi} value={rol} onChange={(e) => setRol(e.target.value as "admin" | "editor" | "viewer")}>
              <option value="admin">Yönetici</option>
              <option value="editor">Düzenleyici</option>
              <option value="viewer">İzleyici</option>
            </select>
          </div>
          <button type="submit" className={dugme + " md:col-span-3"}>
            Aileye Ekle
          </button>
          <p className="text-xs text-muted md:col-span-3">
            Eklemek istediğin kişi önce siteye kayıt olmuş olmalı.
          </p>
        </form>
      )}

      <div className={kart}>
        <h2 className="mb-3 font-semibold">Roller ne yapabilir?</h2>
        <div className="flex flex-col gap-2 text-sm">
          <p><b>Sahip:</b> her şey, aileyi kuran kişidir, çıkarılamaz.</p>
          <p><b>Yönetici:</b> işlem ekler/siler, üye ekler, rol değiştirir.</p>
          <p><b>Düzenleyici:</b> hesap, kategori ve işlem ekler/siler.</p>
          <p><b>İzleyici:</b> sadece görüntüler.</p>
        </div>
      </div>
    </div>
  );
}
