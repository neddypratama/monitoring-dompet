<?php
declare(strict_types=1);

require_once __DIR__ . '/Database.php';

$pdo = Database::connect();
echo "SQLite Database initialized successfully at: " . Database::defaultPath() . PHP_EOL;
