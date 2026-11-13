"use client";

import { createContext, useContext } from "react";
import type { Rol } from "./tipler";

export type AileBaglami = {
  aileId: string;
  aileAdi: string;
  rol: Rol;
  kullaniciId: string;
  yazabilir: boolean;
  yonetebilir: boolean;
  yenile: () => Promise<void>;
};

const Baglam = createContext<AileBaglami | null>(null);

export const AileSaglayici = Baglam.Provider;

export function useAile(): AileBaglami {
  const v = useContext(Baglam);
  if (!v) throw new Error("AileSaglayici bulunamadı");
  return v;
}
