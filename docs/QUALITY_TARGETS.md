# Frontend kalite hedefleri

## Mobil kullanıcı deneyimi

- LCP p75: en fazla 2,5 saniye
- INP p75: en fazla 200 ms
- CLS p75: en fazla 0,1
- Desteklenen temel genişlikler: 360, 390 ve 412 piksel
- Etkileşim hedefi: en az 44 × 44 piksel
- Kritik erişilebilirlik ihlali: 0

## Production paket bütçesi

- Tek JavaScript parçası: en fazla 125 KiB gzip
- Toplam JavaScript: en fazla 300 KiB gzip
- Tek CSS parçası: en fazla 15 KiB gzip
- Toplam CSS: en fazla 25 KiB gzip

`npm run check` lint, production build, paket bütçesi ve güvenlik denetimini
birlikte çalıştırır. Core Web Vitals değerleri Faz 5'te gerçek mobil tarayıcı
testleriyle ayrıca doğrulanacaktır.
