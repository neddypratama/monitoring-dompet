# Design Document: Sistem Monitoring Dompet & Split Bill Multi-AI (DompetKu)

**Tanggal:** 19 November 2026  
**Status:** Siap Disetujui (Approved candidate)  
**Penulis:** Antigravity (bersama Pengguna)  

---

## 1. Intent & The Why

### Latar Belakang
Pengguna sering menghadapi kendala saat mencatat keuangan harian, terutama ketika berbelanja di minimarket (seperti Alfamart/Indomaret) atau memesan makanan bersama teman melalui platform pesan antar (seperti ShopeeFood/GoFood). Masalah utama yang dialami:
1. **Perhitungan Split Bill yang Rumit:** Struk ShopeeFood atau minimarket kerap memiliki diskon gabungan, promo voucher, ongkos kirim, dan biaya layanan/pajak. Menghitung harga bersih per item secara manual membutuhkan waktu dan rentan keliru. Sebelumnya pengguna memotret struk lalu meminta bantuan AI di luar aplikasi untuk menghitung harga bersih per barang.
2. **Keterpisahan Pencatatan Piutang & Dompet:** Saat menalangi pesanan teman, saldo dompet pengguna terpotong penuh, tetapi bagian teman harus dicatat terpisah secara manual.
3. **Kebutuhan Pengingat Hutang vs Piutang:** Hutang ke pihak lain memerlukan tanggal jatuh tempo dan peringatan agar tidak terlambat bayar, sedangkan piutang teman lebih fleksibel tanpa tanggal jatuh tempo namun butuh pelacakan status pembayaran yang transparan.
4. **Multi-Dompet (Tunai & Bank):** Kebutuhan memisahkan uang fisik (cash), beberapa rekening bank (BCA, Mandiri, dll.), dan e-wallet (GoPay, ShopeePay), termasuk mutasi/transfer antar-dompet tanpa mengacaukan arus kas.

### Visi Produk
Sistem web **Monitoring Dompet & Split Bill** yang menggabungkan pembukuan keuangan pribadi multi-dompet dengan pemindai struk cerdas berbasis Multi-AI (Gemini, Groq, OpenRouter, OpenAI) yang secara otomatis memecah tagihan, membagi diskon/pajak secara proporsional, serta mengalirkan data ke pengeluaran pribadi dan piutang teman secara instan, dilengkapi sistem autentikasi akun (*login*).

---

## 2. Goals, Non-Goals, & Anti-Goals

### Goals
- **Sistem Akun & Autentikasi Pengguna:** Sistem memiliki autentikasi aman (Registrasi, Login, Manajemen Sesi berbasis token/cookie, isolasi data per `user_id`) mengikuti pola `AuthService` pada `monitoring-kalori`.
- **Multi-Wallet Management:** Mendukung pembuatan akun dompet (Tunai, Bank, E-Wallet) tanpa batas dengan pencatatan saldo riil dan transfer antar-dompet.
- **Smart Receipt OCR & Split Bill (Multi-AI):** 
  - Pengguna mengunggah foto struk minimarket atau screenshot ShopeeFood.
  - Multi-AI (Gemini / Groq / OpenRouter / OpenAI) mendeteksi nama item, harga kotor, diskon, ongkir, pajak/biaya penanganan, dan menghitung harga bersih per item secara proporsional.
  - Pengguna dapat menandai item milik sendiri (masuk pengeluaran) dan item milik teman (masuk piutang).
  - Riwayat gambar struk dan rincian itemnya disimpan permanen di database sehingga dapat diaudit kembali.
  - Tombol praktis untuk salin rincian tagihan siap kirim ke WhatsApp teman.
- **Pengingat Hutang & Piutang Terintegrasi:**
  - *Hutang (Payables):* Wajib memiliki tanggal jatuh tempo, indikator urgensi (aman, mendekati jatuh tempo $\le$ 3 hari, lewat jatuh tempo), dan pemotongan saldo saat dilunasi.
  - *Piutang (Receivables):* Melacak nama teman, sisa nominal, item pesanan, dan penambahan saldo saat teman melunasi.
- **Buku Besar (Ledger) & Arus Kas Bersih yang Akurat:**
  - Pemasukan dan pengeluaran operasional dipisahkan dari mutasi pinjaman/piutang agar kartu *Net Cashflow* dan grafik pemasukan/pengeluaran bulanan tidak terdistorsi.
- **Dashboard Finansial Komprehensif:**
  - Header personal & pemilih periode (Hari Ini, Minggu Ini, Bulan Ini, Bulan Lalu, Tahun Ini, Kustom).
  - 4 kartu ringkasan keuangan (Total Saldo/Kekayaan Bersih, Total Pemasukan, Total Pengeluaran, Net Cashflow).
  - Grafik Pemasukan vs Pengeluaran (bar chart) & Tren Saldo Harian (line chart).
  - Grafik Distribusi Pengeluaran per Kategori (donut/pie chart).
  - Pemantau Anggaran vs Realisasi per kategori dengan batas peringatan visual.
  - Widget Hutang/Piutang & Progres Target Tabungan (*savings goals*).
  - Tabel Transaksi Terbaru dengan filter cepat.
- **Zero-Config Database (SQLite):** Berjalan langsung di Laragon tanpa konfigurasi manual database server maupun `.env`, dengan migrasi tabel otomatis saat aplikasi dibuka.

### Non-Goals
- Tidak ada integrasi Open Banking API resmi ke m-Banking bank (karena keamanan dan izin regulasi).
- Tidak menggunakan SMS/WhatsApp gateway berbayar otomatis (menggunakan tombol salin teks rekap tagihan yang siap ditempel ke chat WhatsApp).

### Anti-Goals
- Jangan mengharuskan pengguna menyetel database server / phpMyAdmin secara rumit.
- Jangan mencampurkan pelunasan hutang/piutang sebagai pendapatan operasional yang mendistorsi statistik keuangan bulanan.
- Jangan membuat alur scan struk menjadi sekali pakai; riwayat item struk harus tetap dapat dilihat kembali.

---

## 3. Constraints & Tech Stack

### Environment & Runtimes
- **Host OS:** Windows (Laragon environment)
- **PHP Version:** 8.3+ (CLI & Web)
- **Node.js Version:** 22.x
- **Workspace Path:** `c:\laragon\www\monitoring-dompet`
- **Database:** SQLite (default zero-config lokal tersimpan di `storage/monitoring_dompet.sqlite`) via PHP PDO dengan mode WAL (*Write-Ahead Logging*) untuk performa tinggi.

### Tech Stack Architecture
- **Backend:** PHP 8.3 native structured services (Database PDO, AuthService, GeminiReceiptService, TransactionService, DashboardService, Router REST API).
- **Frontend:** SPA modern menggunakan React 19 + TypeScript + Vite + Tailwind CSS v4 + Lucide React + Recharts.
- **AI Vision Providers:**
  1. Google Gemini (e.g. `gemini-3.8-flash`, `gemini-2.5-flash`)
  2. Groq Vision (e.g. `meta-llama/llama-4-scout-17b-16e-instruct`)
  3. OpenRouter (e.g. `google/gemini-2.5-flash`, multimodal open models)
  4. OpenAI (e.g. `gpt-4o-mini`, `gpt-4.1-mini`)

---

## 4. Detailed Functional Specifications & Decisions

### 4.1. Autentikasi & Akun Pengguna
- **Tabel:** `users` (`id`, `username`, `full_name`, `password_hash`, `created_at`), `user_sessions` (`token`, `user_id`, `expires_at`).
- **Fitur:** Halaman Login & Registrasi yang ramah pengguna. Sesi tersimpan aman (token Bearer / HttpOnly session).
- **Isolasi Data:** Setiap transaksi, dompet, hutang, piutang, anggaran, dan riwayat struk terhubung ke `user_id`.

### 4.2. Manajemen Dompet & Buku Besar (Ledger)
- **Tipe Dompet:** `cash` (Tunai Fisik), `bank` (Rekening Bank BCA, Mandiri, dll.), `ewallet` (GoPay, ShopeePay, OVO, dll.).
- **Tipe Mutasi Transaksi (`type`):**
  1. `income`: Pemasukan riil (gaji, bonus, penjualan) -> menambah saldo dompet & masuk total pemasukan dashboard.
  2. `expense`: Pengeluaran belanja riil -> mengurangi saldo dompet & masuk total pengeluaran dashboard serta anggaran kategori.
  3. `transfer`: Pindah saldo antar-dompet (misal tarik tunai) -> mutasi dompet asal & tujuan, tidak mempengaruhi total arus kas.
  4. `split_receivable`: Dana yang dibayarkan untuk porsi teman saat split bill -> mengurangi saldo dompet riil pembuat transaksi, namun **tidak** dihitung sebagai pengeluaran belanja pribadi.
  5. `receivable_settlement`: Pelunasan uang oleh teman -> menambah saldo dompet penerima, namun **tidak** dihitung sebagai pemasukan baru (karena hanya pengembalian dana talangan).
  6. `debt_receipt`: Uang pinjaman masuk -> menambah saldo dompet tanpa menggelembungkan pos pendapatan.
  7. `debt_payment`: Pembayaran cicilan/lunas hutang -> mengurangi saldo dompet tanpa dihitung sebagai pengeluaran belanja harian.

### 4.3. Scan Struk & Split Bill Cerdas (Multi-AI)
1. **Upload Struk:** Unggah foto struk minimarket atau screenshot ShopeeFood.
2. **Analisis AI Multimodal:** AI mengekstrak:
   - Nama resto/toko, tanggal, daftar item (`nama`, `qty`, `harga_katalog_total`).
   - Diskon toko / voucher promo, ongkos kirim, biaya penanganan / kemasan, pajak resto (PB1), total akhir yang dibayar.
3. **Kalkulasi Proporsional:**
   - Menghitung rasio diskon dan beban biaya bersama secara adil per item.
   - Algoritma pembulatan presisi memastikan $\sum \text{Harga Bersih Item} = \text{Total Akhir Dibayar}$ tanpa selisih 1 rupiah pun.
4. **Penetapan Pemilik Item:**
   - Centang item milik sendiri (Pribadi) dan tentukan nama teman untuk masing-masing item lainnya.
   - Dukungan membagi 1 item ke beberapa orang jika dinikmati bersama.
5. **Penyimpanan Permanen:**
   - Disimpan di tabel `receipts` dan `receipt_items`. Pengguna dapat membuka kembali riwayat struk kapan saja.
   - Tombol instan *"Salin Rekap Tagihan WhatsApp"* dengan format pesan rapi:
     ```
     Tagihan ShopeeFood [Nama Resto]
     ------------------------------
     Budi:
     - Mie Gacoan Lv 2: Rp 13.500
     - Es Genderuwo: Rp 9.200
     Total: Rp 22.700
     ------------------------------
     Transfer ke BCA xxxx / GoPay xxxx
     ```

### 4.4. Pengingat Hutang & Piutang
- **Hutang (Kewajiban Pengguna ke Pihak Lain):**
  - Kolom: Nama pihak/kreditur, nominal awal, sisa nominal, **tanggal jatuh tempo (wajib)**, status, catatan.
  - Indikator Visual Dashboard:
    - *Aman:* Hijau (> 3 hari).
    - *Mendekati Jatuh Tempo:* Kuning/Oranye ($\le$ 3 hari, dengan badge hitung mundur hari).
    - *Lewat Jatuh Tempo:* Merah mencolok (terlambat).
  - Aksi Bayar: Form pelunasan yang memotong saldo dompet yang dipilih dan memperbarui sisa hutang.
- **Piutang (Hak Tagih Pengguna ke Teman):**
  - Kolom: Nama teman, nominal, sisa tagihan, rincian item struk terkait, status (`unpaid`, `partially_paid`, `paid`).
  - Tidak memerlukan tanggal jatuh tempo.
  - Aksi Pelunasan: Tombol *"Tandai Lunas"* atau terima cicilan dengan memilih dompet penerima (tunai/bank).

### 4.5. Anggaran Kategori & Target Tabungan
- **Anggaran Bulanan:** Batas pengeluaran per kategori (Makanan, Belanja, Hiburan, dll.) dengan indikator persentase realisasi warna hijau-kuning-merah.
- **Target Tabungan (*Savings Goals*):**
  - Target impian (misal: "Dana Darurat", "Beli HP").
  - Menampilkan nominal target, deadline, dan nominal terkumpul saat ini.
  - Jika dompet penampung dipilih, aksi setor tabungan mencatat mutasi `transfer` ke dompet tersebut. Jika tanpa dompet khusus, aksi setor tabungan mencatat progres tabungan secara visual.

### 4.6. Dashboard Utama
- **Header:** Sapaan nama pengguna, tanggal hari ini, selektor periode waktu (Bulan Ini, dsb).
- **4 Kartu Ringkasan:** Total Saldo Dompet, Total Pemasukan, Total Pengeluaran, Net Cashflow.
- **Grafik:**
  - Bar chart: Pemasukan vs Pengeluaran per hari/minggu.
  - Line chart: Tren saldo harian akumulatif.
  - Donut chart: Pengeluaran per kategori.
- **Modul Bawah:**
  - Anggaran vs Realisasi kategori teratas.
  - Widget Pengingat Hutang mendesak & Piutang aktif teman.
  - Widget Target Tabungan terdekat.
  - Tabel Transaksi Terbaru (5-10 baris dengan filter).

### 4.7. Pengaturan Sistem
- Input & kelola API Keys (Gemini, Groq, OpenRouter, OpenAI).
- Pilihan provider aktif dan model vision yang digunakan.
- Kelola dompet (tambah/edit bank, e-wallet, uang tunai).
- Kelola kategori pengeluaran dan pemasukan.
- Fitur Backup/Export data ke format JSON / CSV.

---

## 5. What's Left to the Builder
- Penulisan skema database SQLite `schema.sql` dan logika auto-migrasi di `Database.php`.
- Implementasi API endpoints di `Router.php` & service PHP yang terisolasi per pengguna.
- Formula penanganan selisih pembulatan diskon/pajak (*penny rounding algorithm*) di service kalkulator split bill.
- Penyusunan komponen React SPA, styling Tailwind CSS yang responsif, dan interaktivitas chart.
- Penulisan uji otomatis (*test suite*) untuk logika split bill dan endpoint API.

---
