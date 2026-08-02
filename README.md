# Web Arayüzü

React 19 ve Vite tabanlı Atık Yönetimi web istemcisidir. Yönetici, çavuş, şoför
ve şirket rolleri için ayrı paneller; vatandaşlar için konteyner haritası ve
şikâyet formu sunar.

## Kurulum ve komutlar

```bash
npm ci
npm run dev
```

- `npm run dev`: `http://localhost:5180` geliştirme sunucusu
- `npm run lint`: statik analiz
- `npm run build`: üretim paketi
- `npm run preview`: yerel üretim paketi önizlemesi

Geliştirmede Vite `/api` ve `/uploads` yollarını varsayılan olarak
`http://localhost:5001` adresine proxy eder. Üretim Docker imajında aynı işi
Nginx yapar. HttpOnly oturum cookie'si nedeniyle önerilen kurulum same-origin
proxy'dir. Aynı site kapsamındaki alternatif bir API tabanı gerekirse:

```env
VITE_API_BASE_URL=https://api.example.com/api
```

Uygulama gerçek API verilerini kullanır. Araç konumu takibi backend tarafından
sağlanmadığı için arayüz sahte hareketli araç veya "canlı radar" verisi
üretmez.

## Önemli istemci davranışları

- API ve fotoğraf adresleri same-origin olarak çözülür.
- JWT tarayıcı depolamasına yazılmaz; uygulama açılışında HttpOnly cookie oturumu
  backend üzerinden doğrulanır.
- Yazma isteklerine CSRF cookie değeri otomatik olarak başlıkta eklenir.
- Service worker API ve upload cevaplarını önbelleğe almaz; harita tile cevaplarını
  en fazla 180 kayıt ve 7 gün sınırıyla `StaleWhileRevalidate` stratejisinde saklar.
- Yönetici, çavuş, şoför ve şirket haritaları ortak Sokak/Uydu/Gece katman
  kontrolünü kullanır; kullanıcının son seçimi cihazda korunur.
- Şikâyet fotoğrafları gönderilmeden önce tür ve 5 MB boyut sınırı kontrol edilir.
- Modal bileşenleri klavye ile kapatma ve dialog semantiği içerir.
