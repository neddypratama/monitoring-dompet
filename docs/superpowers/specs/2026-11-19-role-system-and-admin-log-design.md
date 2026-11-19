# Design Document: Role System (Admin vs User) & Admin Audit Activity Logs

## 1. Executive Summary
Sistem peran (*Role System*) membagi hak akses platform DompetKu menjadi dua peran:
- **Admin (Pengatur):** Mengelola pengguna platform (aktivasi/nonaktivasi, penugasan role), memantau statistik metrik platform global, dan mengaudit riwayat aktivitas sistem (*Activity/Audit Logs*).
- **User (Pelaku):** Pengguna operasional pencatatan keuangan pribadi (dompet, transaksi, scan struk AI, hutang/piutang, anggaran, target tabungan). Data keuangan pribadi tetap terisolasi dan rahasia.

## 2. Goals & Non-Goals
### Goals
- Memperkenalkan kolom `role` (`'admin' | 'user'`) dan `is_active` (`1 | 0`) pada tabel `users`.
- Pengguna pertama yang terdaftar otomatis menjadi `admin`, atau akun bawaan `admin` tersedia.
- Middleware / Route Guard untuk memverifikasi hak akses admin pada endpoint `/api/admin/*`.
- Melacak aktivitas penting sistem dalam tabel `activity_logs`:
  - Login & Registrasi pengguna
  - Perubahan role pengguna oleh admin
  - Pengubahan status aktif/nonaktif pengguna oleh admin
- Menyediakan endpoint REST API Admin:
  - `GET /api/admin/stats`: Metrik agregat platform (total pengguna, pengguna aktif, total dompet, total transaksi, total perputaran volume).
  - `GET /api/admin/users`: Daftar pengguna beserta jumlah dompet, transaksi, status, dan role.
  - `PUT /api/admin/users/{id}/role`: Mengubah role pengguna (`admin` <-> `user`). Mencegah admin mendegradasi dirinya sendiri jika ia adalah satu-satunya admin aktif.
  - `PUT /api/admin/users/{id}/status`: Mengaktifkan/menonaktifkan akun. Pengguna nonaktif tidak dapat login. Mencegah admin menonaktifkan akunnya sendiri.
  - `GET /api/admin/logs`: Daftar log aktivitas dengan informasi waktu, username, aksi, detail pesan, dan IP/User-Agent.
- Menyediakan halaman **Panel Admin** di frontend yang hanya bisa diakses oleh akun `admin`, dengan 3 tab/seksi:
  1. Ringkasan Metrik Platform
  2. Manajemen Pengguna (Tabel pengguna, tombol ubah role, tombol aktif/nonaktifkan)
  3. Log Aktivitas Sistem (Tabel riwayat audit dengan filter/pencarian)

### Non-Goals
- Tidak mengizinkan admin membaca detail rincian transaksi privat personal user lain demi menjaga privasi finansial.
- Tidak mengubah alur pencatatan keuangan pengguna reguler.

## 3. Database Schema Changes
1. **Tabel `users`:**
   - Tambah kolom `role TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin', 'user'))`
   - Tambah kolom `is_active INTEGER NOT NULL DEFAULT 1`
2. **Tabel `activity_logs`:**
   ```sql
   CREATE TABLE IF NOT EXISTS activity_logs (
       id INTEGER PRIMARY KEY AUTOINCREMENT,
       user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
       action TEXT NOT NULL,
       details TEXT NOT NULL DEFAULT '',
       ip_address TEXT NOT NULL DEFAULT '',
       user_agent TEXT NOT NULL DEFAULT '',
       created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
   );
   ```

## 4. Security & Business Rules
1. Hanya user dengan `role === 'admin'` yang dapat memanggil endpoint `/api/admin/*`.
2. Jika akun `is_active === 0`:
   - Gagal login dengan pesan "Akun Anda telah dinonaktifkan oleh Administrator."
   - Token sesi yang masih ada otomatis ditolak oleh `validateToken()`.
3. Admin tidak dapat menonaktifkan akunnya sendiri (`cannot deactivate own account`).
4. Admin tidak dapat mendegradasi akunnya sendiri jika dia admin terakhir (`cannot demote last remaining admin`).
5. Setiap aksi admin (ubah role, ubah status) dicatat otomatis di `activity_logs`.
