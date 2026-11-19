<?php
declare(strict_types=1);

namespace Tests\E2E;

use PHPUnit\Framework\TestCase;
use PDO;
use Database;
use AuthService;
use WalletService;
use TransactionService;
use DebtService;
use ReceivableService;
use ReceiptService;
use BudgetService;
use GoalService;
use DashboardService;

final class ApiSmokeTest extends TestCase
{
    private PDO $pdo;
    private int $userId;

    protected function setUp(): void
    {
        $this->pdo = Database::connect(':memory:');
        $reg = AuthService::register($this->pdo, 'e2euser', 'E2E Full Flow User', 'password123');
        $this->userId = $reg['user']['id'];
    }

    public function testCompleteFinancialAndSplitBillJourney(): void
    {
        // 1. Wallets setup: Bank 1.000.000, Tunai 100.000
        $bca = WalletService::create($this->pdo, $this->userId, [
            'name' => 'BCA Utama',
            'type' => 'bank',
            'balance' => 1000000,
        ]);
        $tunai = WalletService::create($this->pdo, $this->userId, [
            'name' => 'Dompet Tunai',
            'type' => 'cash',
            'balance' => 100000,
        ]);

        // 2. Transfer: Tarik tunai 200.000 with admin 2.500
        WalletService::transfer($this->pdo, $this->userId, $bca['id'], $tunai['id'], 200000, 2500, date('Y-m-d'), 'Tarik tunai ATM');
        $bcaUpdated = WalletService::getById($this->pdo, $this->userId, $bca['id']);
        $tunaiUpdated = WalletService::getById($this->pdo, $this->userId, $tunai['id']);
        $this->assertEquals(797500.0, (float)$bcaUpdated['balance']); // 1jt - 202.500
        $this->assertEquals(300000.0, (float)$tunaiUpdated['balance']); // 100k + 200k

        // 3. Operational Income: Gaji +3.000.000 into BCA
        TransactionService::create($this->pdo, $this->userId, [
            'wallet_id' => $bca['id'],
            'type' => 'income',
            'amount' => 3000000,
            'date' => date('Y-m-d'),
            'notes' => 'Gaji Pokok',
        ]);

        // 4. Struk Split Bill: ShopeeFood bersama Teman "Farhan"
        // Total kotor: 60.000, Diskon: 15.000, Ongkir: 9.000, Pajak: 6.000 -> Total Bayar: 60.000
        // Item 1 (Pribadi): Ayam Geprek (30.000)
        // Item 2 (Farhan): Bebek Goreng (20.000)
        // Item 3 (Farhan): Es Jeruk (10.000)
        $splitData = [
            'merchant_name' => 'Bebek & Ayam Geprek Juara',
            'transaction_date' => date('Y-m-d'),
            'wallet_id' => $bca['id'],
            'raw_subtotal' => 60000,
            'discount_amount' => 15000,
            'delivery_fee' => 9000,
            'service_tax_fee' => 6000,
            'total_paid' => 60000,
            'notes' => 'Makan siang berdua Farhan',
            'items' => [
                ['name' => 'Ayam Geprek', 'qty' => 1, 'raw_price' => 30000, 'assigned_to' => 'Pribadi', 'is_self' => 1],
                ['name' => 'Bebek Goreng', 'qty' => 1, 'raw_price' => 20000, 'assigned_to' => 'Farhan', 'is_self' => 0],
                ['name' => 'Es Jeruk', 'qty' => 1, 'raw_price' => 10000, 'assigned_to' => 'Farhan', 'is_self' => 0],
            ],
        ];

        $splitResult = ReceiptService::saveAndExecuteSplit($this->pdo, $this->userId, $splitData);
        $this->assertEquals(60000.0, (float)$splitResult['total_paid']);
        $this->assertEquals(30000.0, (float)$splitResult['self_expense']);
        $this->assertNotEmpty($splitResult['whatsapp_recap']);

        // Check Farhan's receivable: (20k + 10k) = 30.000
        $farhanRec = current(array_filter(ReceivableService::list($this->pdo, $this->userId), fn($r) => $r['friend_name'] === 'Farhan'));
        $this->assertNotEmpty($farhanRec);
        $this->assertEquals(30000.0, (float)$farhanRec['amount']);
        $this->assertEquals('unpaid', $farhanRec['status']);

        // 5. Farhan melunasi 30.000 via transfer ke BCA
        ReceivableService::settle($this->pdo, $this->userId, $farhanRec['id'], 30000, $bca['id'], date('Y-m-d'), 'Lunas transfer');
        $farhanPaid = ReceivableService::getById($this->pdo, $this->userId, $farhanRec['id']);
        $this->assertEquals('paid', $farhanPaid['status']);

        // 6. Hutang Pengguna: Pinjam 500.000 jatuh tempo 2 hari lagi
        $debt = DebtService::create($this->pdo, $this->userId, [
            'creditor_name' => 'Mas Rian',
            'amount' => 500000,
            'due_date' => date('Y-m-d', strtotime('+2 days')),
            'notes' => 'Pinjaman darurat',
        ]);
        $this->assertEquals('urgent', $debt['urgency_status']);

        // 7. Bayar cicilan hutang 200.000 dari BCA
        DebtService::pay($this->pdo, $this->userId, $debt['id'], 200000, $bca['id'], date('Y-m-d'), 'Cicil pertama');
        $debtUpdated = DebtService::getById($this->pdo, $this->userId, $debt['id']);
        $this->assertEquals(300000.0, (float)$debtUpdated['remaining_amount']);
        $this->assertEquals('partially_paid', $debtUpdated['status']);

        // 8. Dashboard Analytics & Summary Verification
        $start = date('Y-m-01');
        $end = date('Y-m-t');
        $summary = DashboardService::getSummary($this->pdo, $this->userId, $start, $end);

        // Operasional: Income 3jt, Expense pribadi dari struk 30k
        $this->assertEquals(3000000.0, (float)$summary['total_income']);
        $this->assertEquals(30000.0, (float)$summary['total_expense']);
        $this->assertEquals(2970000.0, (float)$summary['net_cashflow']);

        // Check active wallets total balance matches ledger state
        $expectedTotalLiquid = (float)$summary['total_balance'];
        $actualWalletsSum = array_sum(array_column($summary['wallets'], 'balance'));
        $this->assertEquals($expectedTotalLiquid, $actualWalletsSum);
    }
}
