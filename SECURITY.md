# Güvenlik notları

## React Router — GHSA-qwww-vcr4-c8h2

- Kayıt tarihi: 1 Ağustos 2026
- Etkilenen paket: `react-router` / `react-router-dom` 7.12.0–8.2.x
- Resmî düzeltme sürümü: 8.3.0
- Mevcut durum: npm `latest` etiketi hâlen 7.18.2 ve 8.3.0 npm kayıt
  defterinde yayımlanmış değil.
- Uygulanabilirlik: Bildirim yalnızca deneysel React Server Components API'lerini
  etkiler. Bu uygulama Vite üzerinde istemci taraflı `BrowserRouter` SPA'dır ve
  RSC/action API'lerini kullanmaz.

`npm run audit:security`, yalnızca bu bildirimi ve yalnızca RSC API'leri kaynak
kodda yokken geçici olarak kabul eder. Başka bir yüksek/kritik bulgu veya RSC
kullanımı kontrolü başarısız yapar.

Düzeltilmiş kararlı sürüm npm'de yayımlandığında:

1. React Router yükseltilir.
2. Rol yönlendirmeleri ve tüm korumalı rotalar yeniden test edilir.
3. Bu geçici kabul ve denetim betiğindeki allowlist kaldırılır.

Kaynak: https://github.com/advisories/GHSA-qwww-vcr4-c8h2
