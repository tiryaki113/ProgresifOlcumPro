# ProgresifOlcumPro – Web/PWA

Android, iPhone ve iPad tarayıcılarında çalışacak tek kod tabanlı web uygulaması.

## GitHub Pages ile yayınlama
1. ZIP'i açın; içindeki `ProgresifOlcumPro-Web` klasöründeki dosyaları GitHub deposunun kök dizinine yükleyin.
2. GitHub deposunda **Settings → Pages** bölümüne girin.
3. **Deploy from a branch** seçin, `main` ve `/ (root)` seçip kaydedin.
4. Yayınlanan HTTPS adresini Android Chrome, iPhone/iPad Safari ile açın.
5. iPhone/iPad'de Paylaş → Ana Ekrana Ekle; Android'de Chrome menüsü → Ana ekrana ekle.

## Kullanım
- Fotoğraf çek veya galeriden seç.
- Dört köşe kalibrasyon işaretinin merkezlerini sırayla işaretle.
- Aparatın üst orta merkezini, sağ/sol göz bebeği merkezlerini ve iki montaj yüksekliği alt noktasını işaretle.
- Noktaları sürükleyerek düzelt; yakınlaştırma kontrollerini kullan.
- Hesapla.

## Kalibrasyon ve sınırlar
Kod 170 × 60 mm dikdörtgen üzerinden dört noktalı projektif dönüşüm uygular. Manuel nokta işaretleme kullanır; otomatik pupil algılama, lens yüzeyi/derinlik düzeltmesi veya klinik doğrulama içermez. Aparat ve gözlerin farklı derinlikte olması paralaks hatasına neden olabilir. Sıfır hata garanti edilmez; sipariş öncesi kalibre edilmiş fiziksel ölçüm cihazıyla doğrulayın.

## Kamera
Dosya girişi `capture="environment"` ile mobil cihazlarda kamera açmayı talep eder. Tarayıcı/cihaz davranışı değişebilir; galeri seçimi her zaman alternatif olarak sunulur. HTTPS gereklidir (GitHub Pages HTTPS sağlar).
