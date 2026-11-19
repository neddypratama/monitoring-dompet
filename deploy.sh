#!/usr/bin/env bash
set -e

echo "=== Memulai Build & Deploy DompetKu ==="

# 1. Update composer autoload
composer dump-autoload -o

# 2. Build Frontend
cd frontend
npm run build
cd ..

# 3. Jalankan migrasi database
php backend/migrate.php

echo "=== Deploy Selesai! Aplikasi siap dibuka di Laragon ==="
