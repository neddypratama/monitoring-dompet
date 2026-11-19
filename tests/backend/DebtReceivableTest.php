<?php
declare(strict_types=1);

namespace Tests\Backend;

use PHPUnit\Framework\TestCase;
use PDO;
use Database;
use AuthService;
use WalletService;
use DebtService;
use ReceivableService;

final class DebtReceivableTest extends TestCase
{
    private PDO $pdo;
    private int $userId;
    private int $walletId;

    protected function setUp(): void
    {
        $this->pdo = Database::connect(':memory:');
        $u = AuthService::register($this->pdo, 'debtuser', 'User Debt', 'pass123');
        $this->userId = $u['user']['id'];

        $w = WalletService::create($this->pdo, $this->userId, [
            'name' => 'BCA Utama',
            'type' => 'bank',
            'balance' => 1000000
        ]);
        $this->walletId = $w['id'];
    }

    public function testDebtUrgencyCalculationAndPayment(): void
    {
        // 1. Create urgent debt (due in 2 days)
        $dueDateUrgent = date('Y-m-d', strtotime('+2 days'));
        $debt1 = DebtService::create($this->pdo, $this->userId, [
            'creditor_name' => 'Kredit Motor',
            'amount' => 500000,
            'due_date' => $dueDateUrgent,
            'notes' => 'Cicilan bulan ini'
        ]);

        // 2. Create overdue debt (due yesterday)
        $dueDateOverdue = date('Y-m-d', strtotime('-1 day'));
        $debt2 = DebtService::create($this->pdo, $this->userId, [
            'creditor_name' => 'Pinjaman Teman',
            'amount' => 100000,
            'due_date' => $dueDateOverdue,
            'notes' => 'Pinjam minggu lalu'
        ]);

        $list = DebtService::list($this->pdo, $this->userId, null);
        $d1 = current(array_filter($list, fn($d) => $d['id'] === $debt1['id']));
        $d2 = current(array_filter($list, fn($d) => $d['id'] === $debt2['id']));

        $this->assertEquals('urgent', $d1['urgency_status']);
        $this->assertEquals('overdue', $d2['urgency_status']);

        // 3. Pay debt partially
        DebtService::pay($this->pdo, $this->userId, $debt1['id'], 200000, $this->walletId, date('Y-m-d'), 'Bayar sebagian');
        $d1Updated = DebtService::getById($this->pdo, $this->userId, $debt1['id']);
        $this->assertEquals(300000.0, (float)$d1Updated['remaining_amount']);
        $this->assertEquals('partially_paid', $d1Updated['status']);

        // Check wallet balance (1.000.000 - 200.000 = 800.000)
        $wallet = WalletService::getById($this->pdo, $this->userId, $this->walletId);
        $this->assertEquals(800000.0, (float)$wallet['balance']);

        // 4. Pay remaining debt to complete
        DebtService::pay($this->pdo, $this->userId, $debt1['id'], 300000, $this->walletId, date('Y-m-d'), 'Pelunasan');
        $d1Paid = DebtService::getById($this->pdo, $this->userId, $debt1['id']);
        $this->assertEquals(0.0, (float)$d1Paid['remaining_amount']);
        $this->assertEquals('paid', $d1Paid['status']);
    }

    public function testReceivableSettlement(): void
    {
        // 1. Create receivable (teman hutang)
        $rec = ReceivableService::create($this->pdo, $this->userId, [
            'friend_name' => 'Budi Santoso',
            'amount' => 75000,
            'notes' => 'Talangan ShopeeFood'
        ]);

        $this->assertEquals('unpaid', $rec['status']);
        $this->assertEquals(75000.0, (float)$rec['remaining_amount']);

        // 2. Settle full amount
        ReceivableService::settle($this->pdo, $this->userId, $rec['id'], 75000, $this->walletId, date('Y-m-d'), 'Transfer BCA');

        $recUpdated = ReceivableService::getById($this->pdo, $this->userId, $rec['id']);
        $this->assertEquals(0.0, (float)$recUpdated['remaining_amount']);
        $this->assertEquals('paid', $recUpdated['status']);

        // Wallet was 1.000.000 + 75.000 = 1.075.000
        $wallet = WalletService::getById($this->pdo, $this->userId, $this->walletId);
        $this->assertEquals(1075000.0, (float)$wallet['balance']);
    }
}
