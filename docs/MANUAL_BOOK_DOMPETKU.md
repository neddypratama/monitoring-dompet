# Buku Panduan Pengguna (Manual Book) — DompetKu

Aplikasi Manajemen Keuangan Pribadi, Pengingat Hutang/Piutang & Split Bill Struk Berbasis Multi-AI.

---

## 1. Mengenal DompetKu

**DompetKu** adalah platform pencatatan finansial cerdas yang dirancang untuk memudahkan individu, keluarga, maupun komunitas dalam:
1. Memantau saldo riil di berbagai dompet (Tunai, Rekening Bank, e-Wallet).
2. Memisahkan pengeluaran operasional pribadi dari talangan belanja bareng teman (*split bill*).
3. Mengingatkan tanggal jatuh tempo hutang dan mempermudah penagihan piutang teman lewat pesan WhatsApp ramah dalam 1 klik.
4. Memindai foto struk kertas belanjaan (minimarket, cafe, resto, ShopeeFood) menggunakan kecerdasan buatan (Multi-AI Vision) dengan kalkulasi pembagian proporsional yang presisi sampai selisih Rp 0,-.

---

## 2. Akses & Autentikasi

### 2.1. Kredensial Default Administrator
Saat database pertama kali diinisialisasi, sistem menyediakan satu akun Administrator bawaan:
- **Username:** `admin`
- **Password:** `admin123`
- **Wewenang:** Memiliki akses ke seluruh fitur pengguna + menu khusus **Panel Admin**.

### 2.2. Mendaftar Akun Baru (*User*)
1. Pada halaman login, klik **"Daftar Akun Baru"**.
2. Masukkan **Nama Lengkap**, **Username** (huruf kecil & angka, 3-32 karakter), dan **Password** (minimal 6 karakter).
3. Klik **Daftar Akun**.
4. Akun baru Anda otomatis aktif dengan peran **User** (pelaku operasional keuangan pribadi yang terisolasi dan rahasia).

---

## 3. Panduan Penggunaan Modul

### Modul 1: Dashboard Finansial
- **Pemilihan Periode:** Gunakan filter di sudut kanan atas untuk memilih rentang waktu (*Hari Ini*, *Minggu Ini*, *Bulan Ini*, *Bulan Lalu*, *Tahun Ini*, atau rentang tanggal *Kustom*).
- **4 Kartu Ringkasan (KPI):**
  - **Total Saldo Dompet:** Akumulasi saldo riil seluruh dompet aktif Anda.
  - **Total Pemasukan:** Pendapatan operasional pada periode terpilih (gaji, bonus, investasi).
  - **Total Pengeluaran:** Belanja operasional pribadi Anda pada periode terpilih. *(Catatan: pembayaran hutang atau talangan teman tidak mendistorsi angka ini)*.
  - **Arus Kas Bersih (*Net Cashflow*):** Selisih pemasukan dikurangi pengeluaran. Hijau menandakan Anda hemat (*surplus*).
- **Grafik Interaktif:**
  - *Pemasukan vs Pengeluaran*: Tren bar harian.
  - *Pengeluaran per Kategori*: Diagram donat komposisi belanja.
  - *Tren Arus Kas Kumulatif*: Garis pergerakan saldo dari waktu ke waktu.
- **Widget Cepat:** Menampilkan daftar hutang yang paling mendesak, piutang teman yang belum lunas, dan progres target tabungan Anda.

---

### Modul 2: Dompet Saya (*Wallets*)
- **Menambah Dompet Baru:**
  1. Klik tombol **Tambah Dompet**.
  2. Isi nama (contoh: *BCA Utama*, *Dompet Fisik*, *GoPay*, *ShopeePay*).
  3. Pilih tipe (*Tunai*, *Bank*, atau *e-Wallet*).
  4. Masukkan nomor rekening/nomor HP (opsional) dan saldo awal.
  5. Pilih warna kartu dompet dan klik **Simpan Dompet**.
- **Transfer Antar Dompet:**
  1. Klik tombol **Transfer Saldo**.
  2. Pilih dompet asal dan dompet tujuan.
  3. Masukkan nominal transfer dan biaya admin (jika ada, misalnya transfer antar bank Rp 2.500 atau top up e-wallet Rp 1.000).
  4. Saldo dompet asal akan terpotong (nominal + admin), dompet tujuan bertambah, dan biaya admin otomatis tercatat sebagai pengeluaran terpisah.

---

### Modul 3: Riwayat Transaksi (*Transactions*)
- **Mencatat Transaksi Manual:**
  1. Klik **Catat Transaksi**.
  2. Pilih jenis (*Pengeluaran* atau *Pemasukan*).
  3. Pilih dompet yang digunakan dan kategori (misal: *Makanan*, *Transportasi*, *Belanja*).
  4. Masukkan nominal, tanggal, dan catatan tambahan.
- **Pencarian & Filter Transaksi:**
  - Anda dapat menyaring riwayat berdasarkan kata kunci catatan, jenis transaksi, dompet, atau rentang tanggal tertentu.

---

### Modul 4: Pengingat Hutang & Piutang Teman (*Debts & Receivables*)
Terdapat dua tab utama:

#### Tab Hutang (Kewajiban Anda kepada Orang Lain)
- Wajib memiliki **Tanggal Jatuh Tempo**.
- Dilengkapi badge urgensi otomatis:
  - 🟢 **Aman:** Jatuh tempo masih lebih dari 3 hari lagi.
  - 🟡 **Segera:** Jatuh tempo dalam waktu 1 – 3 hari ke depan.
  - 🔴 **Hari Ini:** Harus dibayar hari ini juga.
  - ⚠️ **Terlewat:** Sudah melewati tanggal jatuh tempo.
- **Bayar Hutang:** Klik tombol **Bayar**, pilih dompet sumber dana, dan masukkan nominal cicilan atau pelunasan. Saldo dompet Anda akan terpotong secara tepat.

#### Tab Piutang (Uang Anda yang Dipinjam Teman / Patungan)
- Tidak memerlukan tanggal jatuh tempo.
- **Tombol Salin Pesan WhatsApp:** Klik ikon WhatsApp pada kartu teman. Sistem otomatis menyalin pesan tagihan sopan:
  > *"Halo [Nama Teman]! Mau ingetin patungan [Nama Pesanan] sebesar Rp [Nominal]. Bisa ditransfer ya, terima kasih banyak! 🙏"*
- **Pelunasan Piutang:** Ketika teman membayar, klik tombol **Pelunasan** dan pilih dompet mana yang menerima transfer teman tersebut.

---

### Modul 5: Scan Struk AI & Split Bill Cerdas (Fitur Unggulan)
Gunakan fitur ini ketika makan bersama teman atau membeli barang dengan promo/diskon:
1. Pastikan Anda sudah mengatur API Key AI di tab **Pengaturan** (lihat Modul 8).
2. Buka menu **Scan Struk AI**.
3. Unggah foto struk belanjaan (kamera HP atau galeri).
4. Pilih AI Provider (contoh: *Google Gemini* atau *Groq Vision*), lalu klik **Scan Struk dengan AI**.
5. AI akan membaca nama toko, tanggal, item belanjaan, harga satuan, diskon promo, biaya pengiriman/ongkir, serta pajak restoran.
6. **Penugasan Teman (*Friend Assign*):**
   - Di tabel rincian item, tandai siapa yang memesan masing-masing makanan/barang.
   - Pilihan: **Pribadi** (Anda sendiri) atau ketik nama teman (contoh: *Budi*, *Siti*).
7. **Kalkulasi Proporsional (Hamilton-Hare Penny Rounding):**
   - Diskon promo dan pajak restoran akan dibagi secara adil dan proporsional sesuai porsi makan masing-masing orang. Total tagihan dijamin **selisih Rp 0,-**.
8. **Eksekusi:**
   - Pilih dompet pembayaran Anda (misal kartu BCA yang dipakai gesek kasir).
   - Klik **Eksekusi & Simpan**:
     - Saldo dompet Anda terpotong sesuai total bayar di kasir.
     - Porsi makan Anda otomatis masuk ke riwayat pengeluaran pribadi.
     - Porsi makan teman otomatis masuk ke daftar **Piutang Teman** lengkap dengan rincian menunya.

---

### Modul 6: Anggaran & Target Tabungan (*Budgets & Goals*)
- **Anggaran Kategori (*Monthly Budgeting*):**
  - Pasang batas maksimal belanja bulanan untuk kategori tertentu (misalnya *Hiburan*: Rp 500.000/bulan).
  - Terdapat indikator progress bar warna: Hijau (aman), Kuning (mendekati batas), dan Merah (over budget).
- **Target Tabungan (*Savings Goals*):**
  - Pasang target finansial (contoh: *Dana Darurat*, *Beli Laptop Baru*).
  - Tentukan nominal target dan tanggal pencapaian.
  - Alokasikan setoran tabungan langsung dari dompet Anda.

---

### Modul 7: Panel Administrator (Khusus Akun Admin)
Akses menu ini melalui sidebar kiri:
1. **Statistik Sistem:** Melihat total perputaran dana platform, total transaksi global, dan jumlah user aktif.
2. **Kelola Pengguna:**
   - Melihat seluruh pengguna yang mendaftar.
   - Mengubah status akun (*Aktif* atau *Nonaktifkan*). Pengguna yang dinonaktifkan tidak dapat login.
   - Mengangkat pengguna menjadi *Admin* atau mengembalikan menjadi *User*.
3. **Audit Log Aktivitas:** Memeriksa seluruh riwayat aksi keamanan sistem (siapa yang login, kapan mendaftar, perubahan status, dan IP address).

---

### Modul 8: Pengaturan & Backup Data
- **Pengaturan API Key AI:**
  - Masukkan API Key Anda sendiri dari **Google Gemini** (dapat gratis dari [Google AI Studio](https://aistudio.google.com/)) atau **Groq** ([Groq Console](https://console.groq.com/)).
  - Klik **Simpan Pengaturan AI**.
- **Ekspor & Backup Data (JSON):**
  - Klik tombol **Ekspor Seluruh Data JSON**.
  - File cadangan berisi seluruh transaksi, dompet, hutang, piutang, dan struk belanja Anda akan otomatis terunduh ke perangkat Anda.
