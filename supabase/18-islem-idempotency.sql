-- Pamuk Eller: gelir/gider/transfer kayıtlarında tekrar gönderim koruması
-- Ağ zaman aşımı veya çift tıklama sonrasında aynı istek anahtarı ikinci kez bakiye değiştiremez.
-- Eski kayıtlar NULL kalır; mevcut finans geçmişine dokunulmaz.

alter table public.fin_transactions
  add column if not exists idempotency_key uuid;

create unique index if not exists fin_transactions_family_idempotency_key_uidx
  on public.fin_transactions (family_id, idempotency_key)
  where idempotency_key is not null;

comment on column public.fin_transactions.idempotency_key is
  'İstemci isteği için tekil UUID. Aynı ailede aynı anahtar ikinci bir finans kaydı oluşturamaz.';
