<?php
declare(strict_types=1);

require_once __DIR__ . '/Calculators.php';
require_once __DIR__ . '/WalletService.php';
require_once __DIR__ . '/TransactionService.php';
require_once __DIR__ . '/ReceivableService.php';

final class ReceiptService
{
    public static function saveAndExecuteSplit(PDO $pdo, int $userId, array $splitData): array
    {
        $walletId = (int)($splitData['wallet_id'] ?? 0);
        if ($walletId <= 0) {
            throw new InvalidArgumentException('Dompet pembayaran wajib dipilih.');
        }

        $merchant = trim((string)($splitData['merchant_name'] ?? 'Merchant')) ?: 'Merchant';
        $txDate = trim((string)($splitData['transaction_date'] ?? '')) ?: date('Y-m-d');
        $imagePath = trim((string)($splitData['image_path'] ?? ''));
        $rawSubtotal = (float)($splitData['raw_subtotal'] ?? 0.0);
        $discount = (float)($splitData['discount_amount'] ?? 0.0);
        $delivery = (float)($splitData['delivery_fee'] ?? 0.0);
        $serviceTax = (float)($splitData['service_tax_fee'] ?? 0.0);
        $totalPaid = (float)($splitData['total_paid'] ?? 0.0);
        $notes = trim((string)($splitData['notes'] ?? ''));

        $inputItems = $splitData['items'] ?? [];
        if (empty($inputItems)) {
            throw new InvalidArgumentException('Daftar item belanjaan struk tidak boleh kosong.');
        }

        // Jalankan kalkulator proporsional presisi untuk memastikan net_price pas dengan totalPaid
        $calculated = Calculators::calculateProportionalSplit(
            $inputItems,
            $rawSubtotal,
            $discount,
            $delivery,
            $serviceTax,
            $totalPaid
        );

        $isRootTx = !$pdo->inTransaction();
        if ($isRootTx) {
            $pdo->beginTransaction();
        }

        try {
            // 1. Simpan data induk Struk
            $stmt = $pdo->prepare(
                'INSERT INTO receipts (user_id, merchant_name, transaction_date, image_path, raw_subtotal, discount_amount, delivery_fee, service_tax_fee, total_paid, wallet_id, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $userId, $merchant, $txDate, $imagePath,
                $rawSubtotal, $discount, $delivery, $serviceTax, $totalPaid,
                $walletId, $notes
            ]);
            $receiptId = (int)$pdo->lastInsertId();

            // 2. Petakan kepemilikan item (Pribadi vs Teman)
            $selfItems = [];
            $selfTotal = 0.0;
            $friendGroups = []; // [friend_name => ['items' => [], 'total' => 0.0]]

            foreach ($calculated['items'] as $idx => $calcItem) {
                $orig = $inputItems[$idx] ?? [];
                $isSelf = !empty($orig['is_self']);
                $assignedTo = trim((string)($orig['assigned_to'] ?? ''));
                if ($isSelf || $assignedTo === '' || strcasecmp($assignedTo, 'pribadi') === 0 || strcasecmp($assignedTo, 'saya') === 0) {
                    $isSelf = true;
                    $assignedTo = 'Pribadi';
                }

                $netPrice = (float)$calcItem['net_price'];

                if ($isSelf) {
                    $selfItems[] = $calcItem;
                    $selfTotal += $netPrice;
                } else {
                    if (!isset($friendGroups[$assignedTo])) {
                        $friendGroups[$assignedTo] = ['items' => [], 'total' => 0.0];
                    }
                    $friendGroups[$assignedTo]['items'][] = $calcItem;
                    $friendGroups[$assignedTo]['total'] += $netPrice;
                }
            }

            // 3. Catat porsi Pengguna sebagai expense di dompet
            $selfTxId = null;
            if ($selfTotal > 0) {
                // Temukan kategori Makanan atau Belanja
                $catStmt = $pdo->prepare('SELECT id FROM categories WHERE user_id = ? AND type = "expense" ORDER BY id ASC LIMIT 1');
                $catStmt->execute([$userId]);
                $categoryId = (int)($catStmt->fetchColumn() ?: 0);

                $selfTx = TransactionService::create($pdo, $userId, [
                    'wallet_id' => $walletId,
                    'category_id' => $categoryId > 0 ? $categoryId : null,
                    'type' => 'expense',
                    'amount' => $selfTotal,
                    'date' => $txDate,
                    'notes' => "Belanja di {$merchant} (Porsi Pribadi)",
                    'receipt_id' => $receiptId
                ]);
                $selfTxId = $selfTx['id'];
            }

            // 4. Catat porsi masing-masing Teman sebagai piutang (receivables) dan split_receivable
            $friendReceivables = [];
            foreach ($friendGroups as $friendName => $group) {
                $friendTotal = (float)$group['total'];
                if ($friendTotal <= 0) {
                    continue;
                }

                $itemSummary = implode(', ', array_map(fn($it) => $it['name'] . ' (x' . $it['qty'] . ')', $group['items']));
                $rec = ReceivableService::create($pdo, $userId, [
                    'friend_name' => $friendName,
                    'amount' => $friendTotal,
                    'receipt_id' => $receiptId,
                    'notes' => "Pesanan {$merchant}: {$itemSummary}"
                ]);

                // Potong saldo dompet untuk talangan teman (tipe split_receivable)
                TransactionService::create($pdo, $userId, [
                    'wallet_id' => $walletId,
                    'type' => 'split_receivable',
                    'amount' => $friendTotal,
                    'date' => $txDate,
                    'notes' => "Talangan split bill untuk {$friendName} ({$merchant})",
                    'receipt_id' => $receiptId
                ]);

                $friendReceivables[$friendName] = [
                    'receivable_id' => $rec['id'],
                    'amount' => $friendTotal,
                    'items' => $group['items']
                ];
            }

            // 5. Simpan receipt_items ke database
            $itemInsertStmt = $pdo->prepare(
                'INSERT INTO receipt_items (receipt_id, name, qty, raw_price, net_price, assigned_to, is_self, receivable_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            );

            foreach ($calculated['items'] as $idx => $calcItem) {
                $orig = $inputItems[$idx] ?? [];
                $isSelf = !empty($orig['is_self']);
                $assignedTo = trim((string)($orig['assigned_to'] ?? ''));
                if ($isSelf || $assignedTo === '' || strcasecmp($assignedTo, 'pribadi') === 0 || strcasecmp($assignedTo, 'saya') === 0) {
                    $isSelf = true;
                    $assignedTo = 'Pribadi';
                    $recId = null;
                } else {
                    $recId = $friendReceivables[$assignedTo]['receivable_id'] ?? null;
                }

                $itemInsertStmt->execute([
                    $receiptId,
                    $calcItem['name'],
                    $calcItem['qty'],
                    $calcItem['raw_price'],
                    $calcItem['net_price'],
                    $assignedTo,
                    $isSelf ? 1 : 0,
                    $recId
                ]);
            }

            // 6. Buat rekap WhatsApp yang rapi dan siap kirim
            $recap = self::generateWhatsAppRecap($merchant, $txDate, $totalPaid, $friendReceivables);

            if ($isRootTx) {
                $pdo->commit();
            }

            return [
                'receipt_id' => $receiptId,
                'merchant_name' => $merchant,
                'total_paid' => $totalPaid,
                'self_expense' => $selfTotal,
                'friend_receivables' => $friendReceivables,
                'whatsapp_recap' => $recap
            ];
        } catch (\Throwable $e) {
            if ($isRootTx && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function generateWhatsAppRecap(
        string $merchant,
        string $date,
        float $totalPaid,
        array $friendReceivables
    ): string {
        $lines = [];
        $lines[] = "🧾 *Rekap Tagihan: {$merchant}*";
        $lines[] = "📅 Tanggal: {$date}";
        $lines[] = "💰 Total Tagihan: Rp " . number_format($totalPaid, 0, ',', '.');
        $lines[] = "--------------------------------";

        if (empty($friendReceivables)) {
            $lines[] = "Seluruh item adalah belanja pribadi.";
        } else {
            foreach ($friendReceivables as $friend => $data) {
                $lines[] = "👤 *{$friend}* : *Rp " . number_format((float)$data['amount'], 0, ',', '.') . "*";
                foreach ($data['items'] as $it) {
                    $lines[] = "  • {$it['name']} (x{$it['qty']}): Rp " . number_format((float)$it['net_price'], 0, ',', '.');
                }
                $lines[] = "";
            }
        }

        $lines[] = "--------------------------------";
        $lines[] = "Terima kasih! Silakan transfer ke rekening/e-wallet saya ya.";

        return implode("\n", $lines);
    }

    public static function list(PDO $pdo, int $userId): array
    {
        $stmt = $pdo->prepare(
            'SELECT r.*, w.name AS wallet_name 
             FROM receipts r 
             LEFT JOIN wallets w ON w.id = r.wallet_id 
             WHERE r.user_id = ? 
             ORDER BY r.transaction_date DESC, r.id DESC'
        );
        $stmt->execute([$userId]);
        return $stmt->fetchAll();
    }

    public static function getById(PDO $pdo, int $userId, int $receiptId): ?array
    {
        $stmt = $pdo->prepare(
            'SELECT r.*, w.name AS wallet_name 
             FROM receipts r 
             LEFT JOIN wallets w ON w.id = r.wallet_id 
             WHERE r.id = ? AND r.user_id = ? 
             LIMIT 1'
        );
        $stmt->execute([$receiptId, $userId]);
        $receipt = $stmt->fetch();
        if (!$receipt) {
            return null;
        }

        $itemStmt = $pdo->prepare('SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY id ASC');
        $itemStmt->execute([$receiptId]);
        $receipt['items'] = $itemStmt->fetchAll();

        return $receipt;
    }
}
