# html2video

Tempel kode HTML (boleh sekalian ada `<style>` dan `<script>` di dalamnya), klik
**Generate video**, dan halaman akan merekam pratinjau itu jadi file `.webm` yang
bisa langsung diputar dan didownload — semua diproses di browser, tanpa upload
kode ke server manapun.

## Cara kerja tool-nya

1. Kode yang ditempel dirender di `<iframe>` sebagai pratinjau langsung.
2. Saat "Generate" ditekan, `html2canvas` mengambil screenshot iframe berkali-kali
   per detik (sesuai FPS yang diatur).
3. Tiap screenshot digambar ke `<canvas>`, lalu `canvas.captureStream()` +
   `MediaRecorder` merekamnya jadi video WebM.
4. Video hasil rekaman muncul di `<video>` player plus tombol download.

Gambar dari domain lain kadang gagal ter-capture karena batasan CORS canvas di
browser — pakai gambar base64/data-URI kalau perlu hasil yang pasti muncul di
video.

## Struktur proyek (2 HTML terpisah, sesuai yang diminta)

```
index.html      <- HALAMAN PROTEKSI. Ini yang kebaca kalau ada yang scrape/clone.
anti-clone.js    <- redirect browser asli dari index.html -> app.html
app.html         <- WEB ASLI (tool html2video sepenuhnya)
style.css        <- gaya tampilan app.html
app.js           <- logic app.html (render iframe + rekam video)
```

## Kenapa dipecah begini (anti-clone)

Tool "web-to-zip" biasanya cuma mengambil HTML mentah dari URL yang diberikan,
tanpa menjalankan JavaScript-nya. Dengan skema ini:

- Kalau URL yang dikasih ke tool clone adalah domain utama (`/` → `index.html`),
  yang didapat cuma halaman proteksi kosong.
- Aplikasi asli (`app.html`) baru terbuka setelah `anti-clone.js` dieksekusi
  oleh browser sungguhan dan melakukan redirect.

**Batasannya, biar jujur:**
- Nama file `app.html` tertulis jelas di dalam `anti-clone.js` (harus, karena
  browser perlu tahu ke mana redirect). Siapapun yang buka DevTools atau baca
  isi `anti-clone.js` bisa langsung tahu dan mengakses `/app.html` secara
  langsung — dan begitu diakses langsung, isinya sama persis dengan yang
  dilihat pengguna asli.
- Ini menghalangi scraper yang cuma "download index.html mentah-mentah",
  tapi tidak menghalangi orang yang niat menelusuri source/network request.
  Tidak ada teknik client-side yang benar-benar bisa menyembunyikan konten
  dari browser yang menjalankannya.

## Deploy ke Vercel

1. Push folder ini (semua file dalam satu root) ke repo GitHub.
2. Import repo di [vercel.com/new](https://vercel.com/new) — semua file di
   sini statis, tidak perlu konfigurasi build khusus.
3. Deploy. Domain utama akan otomatis membuka `index.html`.
