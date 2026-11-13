export type Rol = "owner" | "admin" | "editor" | "viewer";
export type IslemTuru = "gelir" | "gider" | "transfer";

export type Hesap = {
  id: string;
  family_id: string;
  name: string;
  type: string;
  currency: string;
  opening_balance: number;
};

export type Bakiye = {
  account_id: string;
  family_id: string;
  name: string;
  type: string;
  currency: string;
  opening_balance: number;
  balance: number;
};

export type Kategori = {
  id: string;
  family_id: string;
  name: string;
  kind: "gelir" | "gider";
};

export type Islem = {
  id: string;
  family_id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  kind: IslemTuru;
  amount: number;
  description: string | null;
  tx_date: string;
  created_at: string;
};

export const ROL_ADI: Record<Rol, string> = {
  owner: "Sahip",
  admin: "Yönetici",
  editor: "Düzenleyici",
  viewer: "İzleyici",
};

export const HESAP_TURU_ADI: Record<string, string> = {
  banka: "Banka",
  nakit: "Nakit",
  yatirim: "Yatırım",
};
