# Pamuk Eller — Tasarım ve Ürün Brief'i

## Ürün hedefi
Pamuk Eller; Türkiye'deki bireylerin ve ailelerin gelir-gider, bütçe, hesap, borç, ödeme ve yatırım planlarını tek yerde yönetebildiği; güvenli, anlaşılır ve mobil uyumlu bir finans platformudur.

## Mevcut proje — korunacak yapı
- Next.js 15 App Router, React 19, TypeScript ve Tailwind CSS 4.
- Supabase Auth ve veritabanı.
- Ana giriş yönlendirmesi: /panel.
- Finans paneli: /panel ve alt sayfaları.
- Borsa Arenası: /borsa.
- Fiş tarama: /tarama.
- Yapay zekâ asistanı mevcut AppShell içinde.
- Tema sistemi CSS değişkenleriyle yönetilir; varsayılan görünüm "Kaset Kulübü" retro temasıdır.

## Tasarım ilkeleri
1. Öncelik: güven, okunabilirlik, hızlı kullanım ve finansal verilerin anlaşılması.
2. Mobil öncelikli, masaüstünde geniş ve düzenli dashboard.
3. Türkçe arayüz; para birimi TL, tarih ve sayı biçimleri tr-TR.
4. Mevcut retro kimlik korunmalı; daha profesyonel tipografi, boşluk, hiyerarşi ve grafiklerle rafine edilmeli.
5. Renkler tek başına gelir/gider anlamı taşımamalı; ikon ve metin etiketleri de kullanılmalı.
6. Erişilebilir kontrast, klavye odağı, büyük dokunma alanları ve reduced-motion desteği.
7. Asla gerçek finansal veri veya kişisel kullanıcı bilgisi tasarım örneklerine gömülmemeli. Sahte örnek veriler kullanılmalı.

## Ana gezinme
- Genel Bakış
- İşlemler
- Hesaplarım
- Kategoriler
- Aile
- Bütçe Tablosu
- Borçlarım
- Ödemeler
- Hedefler
- Yatırımlar
- Ekonomi
- Gelecek Planı
- Finans Akademisi
- Fiş Tara
- Borsa Arenası (ayrı alan)

## Öncelikli ekran: Finans Genel Bakış
- Üst bölüm: selamlama, seçili dönem, hızlı işlem ekle.
- Özet kartları: toplam varlık, aylık gelir, aylık gider, net nakit akışı.
- Gelir-gider trend grafiği.
- Kategori bazında gider dağılımı.
- Son işlemler listesi.
- Yaklaşan ödemeler ve bütçe hedefi durumu.
- Mobilde kartlar tek sütun; masaüstünde dengeli grid.

## Tasarım sistemi çıktıları
- Renk tokenları: background, surface, elevated surface, border, text, muted text, accent, income, expense, warning, info.
- Tipografi ölçeği, spacing ölçeği, radius, gölge ve odak durumları.
- Buton, input, select, kart, tablo, grafik konteyneri, modal ve navigasyon bileşenleri.
- Desktop ve mobile varyantları.
- Boş durum, yükleniyor, hata ve başarı durumları.

## Google Stitch için başlangıç istemi
"Design a polished, mobile-first Turkish personal finance dashboard named Pamuk Eller. It is a trusted finance platform for individuals and families in Türkiye. Use Turkish labels and realistic but fictional TRY amounts formatted with tr-TR conventions. Preserve a warm retro editorial identity inspired by a refined cassette-club aesthetic, but make it feel premium, calm, modern and highly readable. Create a responsive dashboard with total assets, monthly income, expenses, net cash flow, income-vs-expense chart, category spending breakdown, recent transactions, upcoming bills and quick actions. Include accessible contrast, clear hierarchy, compact navigation and mobile layouts. Do not use real personal data. Deliver reusable UI patterns and desktop/mobile screens."

## Penpot çalışma akışı
1. Stitch'te yalnızca görsel fikir ve ekran taslağı üret.
2. Seçilen taslağı Penpot'ta bileşenlere ve tasarım tokenlarına dönüştür.
3. Önce yalnızca Genel Bakış ekranının görsel düzenini doğrula.
4. Onaylanan tasarımı mevcut Next.js bileşenlerine küçük parçalar halinde uygula.
5. Her değişiklikte mevcut rotaları, Supabase sorgularını, oturum akışını ve Borsa Arenası'nı koru.

## Güvenli geliştirme kuralları
- Büyük çaplı yeniden yazım yapma.
- Veritabanı şemasını tasarım değişikliği için değiştirme.
- Kimlik doğrulama, aile yetkileri ve RLS politikalarını gevşetme.
- API anahtarlarını istemci koduna koyma.
- Gerçek kullanıcı verilerini Stitch, Penpot, ekran görüntüsü veya analitik araçlarına aktarma.
- Her özellik küçük ve geri alınabilir bir Git commit'i olarak ilerlesin.
- Yayın başarılı sayılmadan önce Vercel build sonucu doğrulansın.
