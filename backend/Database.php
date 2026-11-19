<?php
declare(strict_types=1);

final class Database
{
    public static function defaultPath(): string
    {
        return dirname(__DIR__) . DIRECTORY_SEPARATOR . 'storage' . DIRECTORY_SEPARATOR . 'monitoring_dompet.sqlite';
    }

    public static function connect(?string $dbPath = null): PDO
    {
        $path = $dbPath ?? self::defaultPath();
        if ($path !== ':memory:') {
            $dir = dirname($path);
            if (!is_dir($dir)) {
                mkdir($dir, 0775, true);
            }
        }

        $pdo = new PDO('sqlite:' . $path);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON;');
        if ($path !== ':memory:') {
            $pdo->exec('PRAGMA journal_mode = WAL;');
        }

        self::migrate($pdo);

        return $pdo;
    }

    public static function migrate(PDO $pdo): void
    {
        $pdo->exec(<<<'SQL'
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                full_name TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS user_sessions (
                token TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS wallets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('cash', 'bank', 'ewallet')),
                account_number TEXT NOT NULL DEFAULT '',
                balance REAL NOT NULL DEFAULT 0.0,
                color TEXT NOT NULL DEFAULT '#3b82f6',
                icon TEXT NOT NULL DEFAULT 'wallet',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                type TEXT NOT NULL CHECK(type IN ('expense', 'income')),
                icon TEXT NOT NULL DEFAULT 'tag',
                color TEXT NOT NULL DEFAULT '#64748b',
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS receipts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                merchant_name TEXT NOT NULL DEFAULT '',
                transaction_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
                image_path TEXT NOT NULL DEFAULT '',
                raw_subtotal REAL NOT NULL DEFAULT 0.0,
                discount_amount REAL NOT NULL DEFAULT 0.0,
                delivery_fee REAL NOT NULL DEFAULT 0.0,
                service_tax_fee REAL NOT NULL DEFAULT 0.0,
                total_paid REAL NOT NULL DEFAULT 0.0,
                wallet_id INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                wallet_id INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
                category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
                type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'transfer', 'split_receivable', 'receivable_settlement', 'debt_receipt', 'debt_payment')),
                amount REAL NOT NULL,
                date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
                notes TEXT NOT NULL DEFAULT '',
                receipt_id INTEGER REFERENCES receipts(id) ON DELETE SET NULL,
                transfer_to_wallet_id INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
                admin_fee REAL NOT NULL DEFAULT 0.0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS debts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                creditor_name TEXT NOT NULL,
                amount REAL NOT NULL,
                remaining_amount REAL NOT NULL,
                due_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partially_paid', 'paid')),
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS debt_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
                transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
                amount REAL NOT NULL,
                payment_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS receivables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                friend_name TEXT NOT NULL,
                amount REAL NOT NULL,
                remaining_amount REAL NOT NULL,
                receipt_id INTEGER REFERENCES receipts(id) ON DELETE SET NULL,
                status TEXT NOT NULL DEFAULT 'unpaid' CHECK(status IN ('unpaid', 'partially_paid', 'paid')),
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS receivable_payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receivable_id INTEGER NOT NULL REFERENCES receivables(id) ON DELETE CASCADE,
                transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
                amount REAL NOT NULL,
                payment_date TEXT NOT NULL DEFAULT (date('now', 'localtime')),
                notes TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS receipt_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                receipt_id INTEGER NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                qty INTEGER NOT NULL DEFAULT 1,
                raw_price REAL NOT NULL DEFAULT 0.0,
                net_price REAL NOT NULL DEFAULT 0.0,
                assigned_to TEXT NOT NULL DEFAULT 'Pribadi',
                is_self INTEGER NOT NULL DEFAULT 1,
                receivable_id INTEGER REFERENCES receivables(id) ON DELETE SET NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS budgets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
                monthly_limit REAL NOT NULL,
                month_year TEXT NOT NULL, -- e.g. 2026-11
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
                UNIQUE(user_id, category_id, month_year)
            );

            CREATE TABLE IF NOT EXISTS savings_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                target_amount REAL NOT NULL,
                current_amount REAL NOT NULL DEFAULT 0.0,
                target_date TEXT NOT NULL,
                wallet_id INTEGER REFERENCES wallets(id) ON DELETE SET NULL,
                icon TEXT NOT NULL DEFAULT 'target',
                color TEXT NOT NULL DEFAULT '#10b981',
                is_achieved INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
            );

            CREATE TABLE IF NOT EXISTS app_settings (
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                setting_key TEXT NOT NULL,
                setting_value TEXT NOT NULL DEFAULT '',
                PRIMARY KEY (user_id, setting_key)
            );
        SQL);
    }
}
