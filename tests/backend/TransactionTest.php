<?php
declare(strict_types=1);

namespace Tests\Backend;

use PHPUnit\Framework\TestCase;
use PDO;
use Database;
use AuthService;
use WalletService;
use TransactionService;

final class TransactionTest extends TestCase
{
    private PDO $pdo;
    private int $userId;

    protected function setUp(): void
    {
        $this->pdo = Database::connect(':memory:');
        $u = AuthService::register($this->pdo, 'alice', 'Alice', 'pass123');
        $this->userId = $u['user']['id'];
    }

    public function testWalletTransferAndBalanceUpdate(): void
    {
        $w1 = WalletService::create($this->pdo, $this->userId, [
            'name' => 'BCA',
            'type' => 'bank',
            'balance' => 500000,
            'color' => '#2563eb',
            'icon' => 'building-library'
        ]);
        $w2 = WalletService::create($this->pdo, $this->userId, [
            'name' => 'Tunai Dompet',
            'type' => 'cash',
            'balance' => 50000,
            'color' => '#16a34a',
            'icon' => 'banknotes'
        ]);

        $transfer = WalletService::transfer(
            $this->pdo,
            $this->userId,
            $w1['id'],
            $w2['id'],
            100000,
            2500,
            '2026-11-19',
            'Tarik Tunai ATM'
        );

        $this->assertNotEmpty($transfer['id']);

        $wallets = WalletService::list($this->pdo, $this->userId);
        $bca = current(array_filter($wallets, fn($w) => $w['id'] === $w1['id']));
        $tunai = current(array_filter($wallets, fn($w) => $w['id'] === $w2['id']));

        // BCA: 500.000 - 100.000 - 2.500 = 397.500
        $this->assertEquals(397500.0, (float)$bca['balance']);
        // Tunai: 50.000 + 100.000 = 150.000
        $this->assertEquals(150000.0, (float)$tunai['balance']);
    }

    public function testIncomeAndExpenseTransactions(): void
    {
        $w = WalletService::create($this->pdo, $this->userId, [
            'name' => 'Mandiri',
            'type' => 'bank',
            'balance' => 100000
        ]);

        // Income: +250.000
        $txIncome = TransactionService::create($this->pdo, $this->userId, [
            'wallet_id' => $w['id'],
            'type' => 'income',
            'amount' => 250000,
            'date' => '2026-11-19',
            'notes' => 'Gaji Freelance'
        ]);
        $this->assertNotEmpty($txIncome['id']);

        // Expense: -50.000
        $txExpense = TransactionService::create($this->pdo, $this->userId, [
            'wallet_id' => $w['id'],
            'type' => 'expense',
            'amount' => 50000,
            'date' => '2026-11-19',
            'notes' => 'Beli Makan Siang'
        ]);
        $this->assertNotEmpty($txExpense['id']);

        $wallets = WalletService::list($this->pdo, $this->userId);
        $mandiri = current(array_filter($wallets, fn($wal) => $wal['id'] === $w['id']));

        // 100.000 + 250.000 - 50.000 = 300.000
        $this->assertEquals(300000.0, (float)$mandiri['balance']);
    }

    public function testInsufficientBalanceThrowsException(): void
    {
        $w = WalletService::create($this->pdo, $this->userId, [
            'name' => 'GoPay',
            'type' => 'ewallet',
            'balance' => 20000
        ]);

        $this->expectException(\InvalidArgumentException::class);
        TransactionService::create($this->pdo, $this->userId, [
            'wallet_id' => $w['id'],
            'type' => 'expense',
            'amount' => 50000, // over balance
            'date' => '2026-11-19',
            'notes' => 'Belanja melebihi saldo'
        ]);
    }
}
