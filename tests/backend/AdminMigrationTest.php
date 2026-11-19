<?php
declare(strict_types=1);

use PHPUnit\Framework\TestCase;

require_once dirname(__DIR__, 2) . '/backend/Database.php';

final class AdminMigrationTest extends TestCase
{
    private PDO $pdo;

    protected function setUp(): void
    {
        $this->pdo = Database::connect(':memory:');
    }

    public function testUsersTableHasRoleAndIsActiveColumns(): void
    {
        $cols = $this->pdo->query('PRAGMA table_info(users)')->fetchAll(PDO::FETCH_ASSOC);
        $colNames = array_column($cols, 'name');

        $this->assertContains('role', $colNames, "Kolom 'role' harus ada pada tabel users");
        $this->assertContains('is_active', $colNames, "Kolom 'is_active' harus ada pada tabel users");
    }

    public function testActivityLogsTableExistsWithCorrectStructure(): void
    {
        $cols = $this->pdo->query('PRAGMA table_info(activity_logs)')->fetchAll(PDO::FETCH_ASSOC);
        $colNames = array_column($cols, 'name');

        $this->assertNotEmpty($colNames, "Tabel 'activity_logs' harus ada");
        $this->assertContains('id', $colNames);
        $this->assertContains('user_id', $colNames);
        $this->assertContains('action', $colNames);
        $this->assertContains('details', $colNames);
        $this->assertContains('ip_address', $colNames);
        $this->assertContains('user_agent', $colNames);
        $this->assertContains('created_at', $colNames);
    }
}
