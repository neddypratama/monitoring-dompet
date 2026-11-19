# Panduan Lengkap Hosting DompetKu di cPanel Menggunakan Git Pull

Panduan ini menjelaskan langkah demi langkah cara men-deploy aplikasi **DompetKu** ke server hosting berbasis **cPanel** menggunakan fitur bawaan **Git™ Version Control**.

---

## 1. Keunggulan Metode Git Pull di cPanel
- **Otomatis & Cepat:** Tidak perlu upload file `.zip` manual lewat File Manager atau FTP berulang kali.
- **Zero-Config Database:** Menggunakan SQLite WAL (`storage/monitoring_dompet.sqlite`), tidak perlu membuat database MySQL/phpMyAdmin.
- **Produksi Siap Pakai:** Folder `dist/` (antarmuka React) sudah dibuild dan dilacak oleh Git, sehingga cPanel tidak memerlukan instalasi Node.js atau `npm`.

---

## 2. Persiapan di Komputer Lokal (GitHub / GitLab)

Pastikan seluruh kode proyek Anda sudah di-push ke repository Git privat Anda (misalnya di GitHub):

```bash
# Di terminal folder proyek monitoring-dompet Anda:
git status
git add .
git commit -m "feat: ready for cPanel production deployment"

# Jika belum menghubungkan remote repository GitHub:
git remote add origin https://github.com/USERNAME/monitoring-dompet.git
git branch -M main
git push -u origin main
```

---

## 3. Langkah-Langkah Deployment di cPanel

### Langkah 1: Pengaturan Versi PHP di cPanel
1. Login ke akun **cPanel** hosting Anda.
2. Cari dan klik menu **Select PHP Version** (atau **MultiPHP Manager**).
3. Pilih versi **PHP 8.2** atau **PHP 8.3**.
4. Di tab **Extensions**, pastikan ekstensi berikut tercentang aktif:
   - `pdo_sqlite` *(wajib untuk database)*
   - `sqlite3` *(wajib untuk database)*
   - `curl` *(wajib untuk scan struk Multi-AI)*
   - `fileinfo` *(wajib untuk deteksi format gambar struk)*
   - `json`, `mbstring`, `openssl`

---

### Langkah 2: Setup Kunci SSH di cPanel (Untuk Repository Private)
*Jika repository GitHub Anda bertipe **Private**, cPanel butuh izin baca:*

1. Di cPanel, buka menu **SSH Access** -> klik **Manage SSH Keys**.
2. Klik **Generate a New Key**:
   - Berikan nama key (misal: `github_dompetku`).
   - Buat password / passphrase (atau kosongkan).
   - Klik **Generate Key**.
3. Di daftar kunci, cari `github_dompetku` di bagian *Public Keys* -> klik **Manage** -> klik **Authorize**.
4. Klik **View/Download** pada public key tersebut, lalu **Salin (Copy)** seluruh isi kuncinya.
5. Buka GitHub Anda -> masuk ke **Settings Repository** -> pilih menu **Deploy Keys** -> klik **Add deploy key**:
   - Judul: `cPanel Hosting`
   - Key: *Tempel (Paste) kunci yang disalin tadi*
   - Biarkan opsi *Allow write access* tidak tercentang (hanya butuh izin baca/pull).
   - Klik **Add key**.

---

### Langkah 3: Clone Repository Melalui Git™ Version Control
1. Kembali ke cPanel, cari dan buka menu **Git™ Version Control**.
2. Klik tombol **Create** di pojok kanan atas.
3. Isi formulir pembuatan repository:
   - **Clone URL:** Masukkan URL repository Anda:
     - Jika SSH: `git@github.com:USERNAME/monitoring-dompet.git` *(direkomendasikan untuk private repo)*
     - Jika HTTPS: `https://github.com/USERNAME/monitoring-dompet.git`
   - **Repository Path:** 
     - Jika untuk domain utama: masukkan `public_html` *(pastikan folder public_html kosong terlebih dahulu)*.
     - Jika untuk subdomain / subfolder: masukkan misalnya `public_html/dompetku` atau `dompet.domainanda.com`.
   - **Repository Name:** `dompetku`
4. Klik tombol **Create**. Tunggu beberapa detik hingga proses clone selesai 100%.

---

### Langkah 4: Pengaturan Izin Folder (*Folder Permissions*)
Database SQLite dan file upload foto struk membutuhkan izin tulis oleh server web:
1. Buka menu **File Manager** di cPanel.
2. Masuk ke folder instalasi DompetKu (misal `public_html`).
3. Cari folder `storage/`:
   - Klik kanan folder `storage/` -> pilih **Change Permissions**.
   - Atur menjadi **755** (atau **775** jika server menggunakan suPHP/CGI).
   - Pastikan subfolder `storage/receipts/` juga berizin **755**.

---

### Langkah 5: Inisialisasi Database Bawaan
Buka browser Anda dan akses domain Anda:
- Contoh: `https://domainanda.com/` (atau `https://domainanda.com/dompetku/`).
- Saat pertama kali diakses, sistem secara otomatis:
  1. Membuat database SQLite di `storage/monitoring_dompet.sqlite`.
  2. Menerapkan seluruh migrasi tabel terbaru.
  3. Menginisialisasi akun bawaan Administrator:
     - **Username:** `admin`
     - **Password:** `admin123`

---

## 4. Cara Update Aplikasi di Masa Depan (Hanya 1 Klik!)

Setiap kali Anda selesai memperbarui fitur di komputer lokal dan telah melakukan `git push` ke GitHub:

1. Buka cPanel -> menu **Git™ Version Control**.
2. Cari repository `dompetku` -> klik **Manage**.
3. Di tab **Pull or Deploy**, klik tombol **Update from Remote**.
4. Selesai! Kode di cPanel akan langsung ter-update ke versi terbaru seketika tanpa downtime.

---

## 5. Tips Keamanan Tambahan di cPanel
- File [`.htaccess`](file:///c:/laragon/www/monitoring-dompet/.htaccess) bawaan DompetKu sudah otomatis memblokir akses langsung pengunjung ke file database `.sqlite` dan folder sensitif.
- Sangat disarankan untuk langsung **mengubah password akun admin** atau membuat akun admin pribadi baru setelah instalasi selesai, lalu menonaktifkan atau mengubah password default `admin123` melalui halaman Panel Admin.
