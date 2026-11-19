<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';
require_once __DIR__ . '/AuthService.php';
require_once __DIR__ . '/WalletService.php';

$pdo = Database::connect();
$count = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
if ($count === 0) {
    AuthService::register($pdo, 'admin', 'Administrator', 'admin123');
    WalletService::create($pdo, 1, [
        'name' => 'Dompet Utama',
        'type' => 'bank',
        'balance' => 1500000,
        'color' => '#4f46e5',
        'icon' => 'wallet'
    ]);
    echo "Default admin account created: username 'admin', password 'admin123'" . PHP_EOL;
}
echo "SQLite Database initialized successfully at: " . Database::defaultPath() . PHP_EOL;
