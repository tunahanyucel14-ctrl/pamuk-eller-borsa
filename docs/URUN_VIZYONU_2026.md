# Pamuk Eller — Ürün Vizyonu ve Geliştirme Yol Haritası

> Hedef: Türkiye'de bireylerin ve ailelerin parasını yalnızca kaydetmeyen; yaklaşan nakit ihtiyacını öngören, seçenekleri simüle eden ve finansal kararlarını anlaşılır hale getiren bir finans platformu.

## Ürün ilkeleri
1. Önce doğruluk ve güven: tahminler gerçek kayıtlarla karıştırılmaz; her tahmin varsayımlarını gösterir.
2. Kullanıcı kontrolü: banka entegrasyonu salt-okunur olmalı; hiçbir ödeme/transfer kullanıcı onayı olmadan yapılmamalı.
3. Türkiye'ye uyum: TL, maaş/ek ödeme/nöbet, kredi kartı ekstre-kesim/son ödeme, resmi tatil ve enflasyon etkileri.
4. Aile mahremiyeti: ortak, kişisel ve gizli kalemler rol bazlı ayrılmalı.
5. Kademeli teslimat: mevcut Supabase tabloları, kullanıcı oturumları ve çalışan rotalar korunmalı; şema değişiklikleri migration ve geri dönüş planıyla yapılmalı.

## Ürün modülleri

### 1. Pamuk Eller Finans — günlük para yönetimi
- Gelir, gider, transfer, hesap ve kategori takibi.
- Tekrarlayan gelir/gider kuralları; değişken tutarlı faturalar.
- Fiş/fatura OCR: satır kalemleri, tarih, satıcı, KDV, kategori; kaydetmeden önce kullanıcı onayı.
- CSV/XLSX içe aktarma, sütun eşleme, mükerrer işlem tespiti ve geri alma.
- İşlem açıklamasından kategori önerisi; güven skoru düşükse otomatik kaydetme yok.

### 2. Pamuk Eller Aile — ortak ve kişisel bütçe
- Ortak kasa, kişisel cüzdanlar ve ortak hedefler.
- Üye/rol bazlı görünürlük: ortak, yalnızca bana ait ve aile yöneticisine açık alanlar.
- Gider paylaşımı: eşit, gelir oranına göre veya özel oran.
- Ay sonu uzlaşma: kimin ne kadar ortak gider karşıladığı.
- Aile hedefleri ve ortak karar notları; finansal tartışma yerine şeffaf kayıt.

### 3. Pamuk Eller Akıl — finans koçu
- Soru-cevap yalnızca kullanıcının izin verdiği finansal veriye dayanır.
- Her yanıtın altında kullanılan dönem, veri kapsamı ve hesaplama açıklaması.
- “Bu ay neden daha fazla harcadım?”, “maaşa kadar günlük limitim?” ve “hangi borcu önce kapatmalıyım?” gibi eyleme dönük yanıtlar.
- Haftalık özet: değişen harcama kalemleri, yaklaşan yükümlülükler, olası açık.
- Asistan işlem eklemeden önce taslak gösterir; kullanıcının onayı olmadan veri yazmaz.

### 4. Pamuk Eller Gelecek — nakit akışı ve senaryo laboratuvarı
- 7/30/90/365 günlük nakit akışı tahmini.
- Maaş günü, ek ödeme, nöbet, kira, taksit, kart ekstresi ve değişken faturaları takvime yerleştirme.
- İyimser/temel/stres senaryoları; gelir gecikmesi, beklenmedik masraf ve faiz artışı etkisi.
- Kredi erken kapama, yapılandırma ve ara ödeme karşılaştırması.
- Ev alma/kirada kalma, peşinat biriktirme ve kira artışı senaryoları.
- Reel getiri: nominal kazanç ile enflasyon sonrası satın alma gücünü ayrı gösterme.

### 5. Pamuk Eller Piyasalar — yatırım görünümü
- Altın, döviz, BIST, fon, kripto ve küresel endeks panosu.
- Her veri için kaynak, zaman damgası, gecikme ve veri bulunamadı durumu.
- Portföy dağılımı, maliyet, gerçekleşen/gerçekleşmemiş kâr-zarar.
- Kur ve fiyat değişimlerinin toplam varlığa etkisi.
- Getiri tahmini değil, senaryo ve risk görünümü; kişiye özel al/sat emri veya garanti getiri vaadi yok.

### 6. Pamuk Eller Akademi — davranışsal finans
- Kullanıcının gerçek bütçesinden anonimleştirilmiş örneklerle mini dersler.
- Borç faizi, enflasyon, bileşik getiri, risk ve dolandırıcılık farkındalığı.
- 3-5 dakikalık görevler, bilgi kontrolü ve ilerleme rozeti.
- Reklam veya ürün satışıyla yönlendirilmeyen eğitim içeriği.

### 7. Pamuk Eller Borsa Arenası — sanal yatırım eğitimi
- 100.000 TL sanal başlangıç bakiyesi, 30 günlük sezon.
- Gecikmesi ve kaynağı açıklanan gerçek piyasa verisi; işlem maliyeti/slippage varsayımı.
- Ligler, rozetler, günlük görevler ve sezon raporu.
- Sıralama sadece getiriye göre değil; risk, çeşitlendirme ve öğrenme puanıyla da değerlendirilir.
- Gerçek para, gerçek emir veya kazanç garantisi içermez.

### 8. Pamuk Eller Akıllı Takvim — hatırlatma ve yaşam olayları
- Maaş, ek ödeme, fatura, kredi kartı kesim/son ödeme, kredi taksidi ve abonelik takvimi.
- Kullanıcı bazlı bildirim tercihleri ve tekrar sıklığı.
- Uygulama kapalıyken bildirim için servis çalışanı + Web Push + sunucu zamanlayıcısı gerekir; mevcut sayfa açıkken çalışan hatırlatıcı bunun yerine geçmez.
- Bildirimlerde hassas tutarları kilit ekranında gizleme seçeneği.

## Fark yaratabilecek yeni fikirler

### A. Finansal Dijital İkiz
Kullanıcının gelir, gider, borç, varlık ve tarihlerini birleştirerek “bugünkü planınla 3 ay sonra nerede olacaksın?” sorusuna senaryolu cevap verir. Tahminin yanında güven aralığı ve eksik veri uyarısı gösterir.

### B. Finansal Şok Testi
“Bu ay maaşım 10 gün gecikirse?”, “20.000 TL acil masraf çıkarsa?”, “faiz 3 puan artarsa?” gibi şokları tek dokunuşla uygular; nakit açığının hangi tarihte oluşacağını ve hangi giderlerin etkili olduğunu gösterir.

### C. Harcama Sızıntısı Dedektörü
Aynı satıcıya tekrar eden küçük ödemeleri, unutulan abonelikleri, olağandışı fiyat artışlarını ve mükerrer kayıtları bulur. İptal işlemi yapmaz; kanıt ve kullanıcı onayı ister.

### D. Fiyat Hafızası / Sepet Enflasyonu
Kullanıcının fişlerinden kendi market sepetinin zaman içindeki maliyetini hesaplar. Resmi enflasyonla kişisel sepet enflasyonunu karıştırmadan yan yana gösterir.

### E. Maaş Ritmi Profili
Sabit maaş, ek ödeme, nöbet, fazla mesai ve kesintileri ayrı modelleyerek düzenli gelir ile değişken geliri ayırır. Kullanıcı kendi kurum/meslek şablonunu oluşturabilir; bordro yüklemesiyle tutarları kontrol edebilir.

### F. Borç Karar İkizi
Borçları faiz, kalan vade, taksit, erken kapama tutarı ve nakit tamponuna göre karşılaştırır. Kartopu, çığ ve karma yöntemleri; toplam maliyet ve kapanış tarihiyle açıklar.

### G. Finansal Hedefe Göre Otomatik Zarflar
Maaş geldiğinde kullanıcı tanımlı sıraya göre kira, faturalar, borç, acil durum fonu ve hedefler için sanal zarflar oluşturur. Para transferi yapmaz; yalnızca plan ve ayırma önerisi üretir.

### H. Aile Finans Toplantısı
Haftalık 10 dakikalık ortak özet: hedef ilerlemesi, yaklaşan ödemeler, ortak gider dağılımı ve karar bekleyen kalemler. Kişisel/gizli hesapları izinsiz açığa çıkarmaz.

### I. Yaşam Olayı Planlayıcısı
Taşınma, araç alma, çocuk, tatil, iş değişikliği veya emeklilik gibi olayların tek seferlik ve aylık maliyetlerini hesaba katar; bütçe üzerindeki etkisini senaryolaştırır.

### J. Finansal Dayanıklılık Puanı
Tek bir “zenginlik puanı” yerine ayrı göstergeler: acil durum tamponu, borç ödeme yükü, gelir istikrarı, tasarruf eğilimi ve nakit akışı riski. Puanın nasıl hesaplandığı görünür olur.

## Öncelikli geliştirme sırası

### Faz 0 — güvenilir temel
- Mevcut rotaların, aile kapsamının ve veri izinlerinin envanteri.
- TypeScript/build kontrolü ve kritik akış testleri.
- Hata/boş durumları, veri yenileme ve mobil kullanılabilirlik.
- Bildirimlerin mevcut sınırlarını açıkça belirtme.

### Faz 1 — anında kullanıcı değeri
- Finansal Sağlık Merkezi: şeffaf göstergeler ve açıklanabilir skor.
- Maaşa kadar harcanabilir tutar: gelir ve yaklaşan zorunlu ödemelerden hesaplanan tahmini limit.
- 30 günlük nakit akışı takvimi.
- Borç kapatma senaryoları.
- Harcama sızıntısı ve mükerrer işlem uyarıları.

### Faz 2 — Türkiye'ye özgü derinlik
- Maaş/ek ödeme/nöbet profili ve bordro içe aktarma.
- Kredi kartı ekstre-kesim takvimi.
- Kişisel sepet enflasyonu ve fiyat hafızası.
- Yaşam olayı planlayıcısı.

### Faz 3 — aile ve otomasyon
- Gelişmiş aile rolleri ve gider uzlaşması.
- Web Push ve güvenilir sunucu zamanlayıcısı.
- İçe aktarma/OCR doğrulama hattı.
- AI taslak işlemleri ve onay akışı.

### Faz 4 — ekosistem
- Piyasa verisi kaynak/kalite katmanı.
- Akademi ve Arena ilerleme bağlantısı.
- Dışa aktarılabilir raporlar ve kullanıcı veri taşınabilirliği.

## Teknik ve güvenlik gereksinimleri
- Her finansal sorgu aile/üye yetkisiyle sınırlandırılmalı; yalnızca arayüzde gizlemek güvenlik değildir.
- RLS politikaları ve sunucu tarafı doğrulama kontrol edilmeden yeni finansal tablo açılmamalı.
- Hassas belgeler private storage alanında, süreli imzalı URL ile tutulmalı.
- Bildirim tokenları ve servis sırları istemciye gönderilmemeli.
- Tahminler için veri kaynağı, güncelleme tarihi ve varsayımlar görünür olmalı.
- Para hareketi, yatırım emri veya borç ödemesi otomatik yapılmamalı.
- Kullanıcı verisini silme/dışa aktarma akışları korunmalı.

## Başarı ölçütleri
- İlk 5 dakikada ilk gelir/gider ve yaklaşan ödeme kaydı tamamlanabiliyor mu?
- Kullanıcı bir sonraki maaşa kadar harcanabilir tahmini görebiliyor mu?
- Tahmin ile gerçekleşen nakit akışı arasındaki hata ölçülüyor mu?
- Mükerrer işlem ve yanlış kategori oranı azalıyor mu?
- Aile üyeleri ortak ve kişisel kalemleri doğru görebiliyor mu?
- Bildirim teslimatı ve başarısızlık oranı izleniyor mu?
