<?php
declare(strict_types=1);

namespace Tests\Backend;

use PHPUnit\Framework\TestCase;
use PDO;
use Database;
use AuthService;
use WalletService;
use Calculators;
use ReceiptService;

final class SplitBillCalculatorTest extends TestCase
{
    public function testProportionalSplitZeroDifference(): void
    {
        // 3 items with raw prices: 15.000, 15.000, 10.000 (Subtotal = 40.000)
        // Diskon = 10.000, Ongkir = 6.000, Pajak = 4.000, Total Akhir = 40.000
        $items = [
            ['name' => 'Mie Gacoan Lv 2', 'qty' => 1, 'raw_price' => 15000],
            ['name' => 'Mie Gacoan Lv 4', 'qty' => 1, 'raw_price' => 15000],
            ['name' => 'Es Genderuwo', 'qty' => 1, 'raw_price' => 10000],
        ];

        $result = Calculators::calculateProportionalSplit($items, 40000, 10000, 6000, 4000, 40000);
        $this->assertCount(3, $result['items']);

        $sumNet = array_sum(array_column($result['items'], 'net_price'));
        $this->assertEquals(40000.0, $sumNet, 'Sum of net item prices must match totalPaid exactly');
    }

    public function testPennyRoundingDriftAdjustment(): void
    {
        // 3 items where raw prices lead to fractional cents: 10.000, 10.000, 10.000 (Subtotal 30.000)
        // Diskon = 5.000, Total Akhir = 25.000
        // 25.000 / 3 = 8333.33333...
        // Rounded: 8333 + 8333 + 8333 = 24999 (difference of 1 rupiah)
        // Calculator must adjust the difference so sum == 25000
        $items = [
            ['name' => 'Item A', 'qty' => 1, 'raw_price' => 10000],
            ['name' => 'Item B', 'qty' => 1, 'raw_price' => 10000],
            ['name' => 'Item C', 'qty' => 1, 'raw_price' => 10000],
        ];

        $result = Calculators::calculateProportionalSplit($items, 30000, 5000, 0, 0, 25000);
        $sumNet = array_sum(array_column($result['items'], 'net_price'));
        $this->assertEquals(25000.0, $sumNet, 'Sum must equal totalPaid with penny rounding resolved');
    }

    public function testReceiptSaveAndSplitExecutionWithWhatsAppRecap(): void
    {
        $pdo = Database::connect(':memory:');
        $u = AuthService::register($pdo, 'splitmaster', 'Master Split', 'pass123');
        $uid = $u['user']['id'];

        $w = WalletService::create($pdo, $uid, [
            'name' => 'BCA',
            'type' => 'bank',
            'balance' => 200000
        ]);

        $splitData = [
            'merchant_name' => 'Mie Gacoan',
            'transaction_date' => '2026-11-19',
            'wallet_id' => $w['id'],
            'raw_subtotal' => 40000,
            'discount_amount' => 10000,
            'delivery_fee' => 6000,
            'service_tax_fee' => 4000,
            'total_paid' => 40000,
            'notes' => 'Makan bareng teman kantor',
            'items' => [
                ['name' => 'Mie Gacoan Lv 2', 'qty' => 1, 'raw_price' => 15000, 'assigned_to' => 'Pribadi', 'is_self' => 1],
                ['name' => 'Mie Gacoan Lv 4', 'qty' => 1, 'raw_price' => 15000, 'assigned_to' => 'Budi', 'is_self' => 0],
                ['name' => 'Es Genderuwo', 'qty' => 1, 'raw_price' => 10000, 'assigned_to' => 'Budi', 'is_self' => 0],
            ]
        ];

        $res = ReceiptService::saveAndExecuteSplit($pdo, $uid, $splitData);

        $this->assertNotEmpty($res['receipt_id']);
        $this->assertNotEmpty($res['whatsapp_recap']);
        $this->assertStringContainsString('Budi', $res['whatsapp_recap']);

        // Check wallet balance: 200.000 - 40.000 = 160.000
        $bca = WalletService::getById($pdo, $uid, $w['id']);
        $this->assertEquals(160000.0, (float)$bca['balance']);

        // Check friend receivable created for Budi
        $stmt = $pdo->prepare('SELECT * FROM receivables WHERE user_id = ? AND friend_name = "Budi"');
        $stmt->execute([$uid]);
        $rec = $stmt->fetch();
        $this->assertNotEmpty($rec);
        // Budi's items: Mie Gacoan Lv 4 (15k) + Es Genderuwo (10k) = 25k raw / 40k * 40k = 25.000
        $this->assertEquals(25000.0, (float)$rec['amount']);
    }
}
