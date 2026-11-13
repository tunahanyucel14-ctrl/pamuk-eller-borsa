# Pamuk Eller

Türkiye'deki bireyler ve aileler için gelir-gider, hesap, borç, abonelik, yatırım ve finansal planlama platformu.

## Teknoloji
- Next.js 15 App Router, React 19, TypeScript
- Tailwind CSS 4, lucide-react
- Supabase Auth, PostgreSQL ve Row Level Security
- Vercel AI Gateway (AI asistanı ve fiş okuma)
- Harici veri kaynakları: TCMB, Dünya Bankası, Binance, CoinGecko ve Yahoo Finance

## Geliştirme
```bash
npm install
npm run dev
``
Tarayıcıda http://localhost:3000 adresini aç.

## Kalite kontrolü
```bash
npm run typecheck
npm run build
``
Her GitHub push ve pull request işleminde `.github/workflows/quality.yml` TypeScript kontrolünü ve üretim derlemesini çalıştırır.

## Ortam değişkenleri
Aşağıdaki değerleri Vercel veya yerel `.env.local` ortamında tanımla:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase publishable/anon anahtarı)
- `AI_GATEWAY_API_KEY` (AI asistanı ve fiş tarama için)

Supabase anahtarları yalnızca public/publishable türünde olmalıdır. Service-role anahtarı tarayıcıya veya `NEXT_PUBLIC_*` değişkenine konulmamalıdır.

## Veritabanı
SQL dosyaları `supabase/` altında sıralıdır. Şema değişikliklerini mümkün olduğunda Supabase migration sistemiyle uygula ve canlı veritabanında doğrula. Mevcut finans kayıtlarını silen veya yeniden oluşturan komutları kullanıcı onayı olmadan çalıştırma.

## Ürün güvenliği ve doğruluk ilkeleri
- Aile verileri Supabase RLS ile korunur; istemci tarafındaki rol kontrolü tek başına güvenlik sınırı değildir.
- Banka bağlantısı salt-okunur tasarlanmalıdır; kullanıcının onayı olmadan para transferi/ödeme yapılmaz.
- Piyasa ve enflasyon verileri kaynak ve güncelleme zamanı ile sunulur; eksik veri uydurulmaz.
- Finansal tahminler garanti değildir; kullanılan varsayımlar görünür olmalıdır.
- Fiş OCR sonucu kullanıcı onayı olmadan finansal işlem olarak kaydedilmemelidir.
- Bildirimlerin mevcut tarayıcı tabanlı sürümü, tarayıcı/uygulama açıkken çalışır; arka plan push için ayrıca Web Push ve zamanlayıcı altyapısı gerekir.

## Geliştirme sırası
1. Mevcut özelliklerde doğruluk, güvenlik ve derleme kontrolü.
2. Veri modelinin ve finansal işlem ilişkilerinin sağlamlaştırılması.
3. Maaş, ek ödeme, nöbet ve nakit akışı planlama.
4. Yapay zekâ asistanı ve fiş OCR güvenilirliği.
5. Piyasa verisi, yatırım portföyü ve Borsa Arenası.
6. Bildirim altyapısı, mobil deneyim ve tasarım sistemi.

## Dikkat
Bu uygulama finansal kayıt ve eğitim aracıdır; yatırım tavsiyesi veya kazanç garantisi sunmaz.
