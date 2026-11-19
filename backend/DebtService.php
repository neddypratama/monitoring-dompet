<?php
declare(strict_types=1);

require_once __DIR__ . '/TransactionService.php';

final class DebtService
{
    public static function create(PDO $pdo, int $userId, array $data): array
    {
        $creditorName = trim((string)($data['creditor_name'] ?? ''));
        if ($creditorName === '') {
            throw new InvalidArgumentException('Nama kreditur/pemberi pinjaman tidak boleh kosong.');
        }

        $amount = (float)($data['amount'] ?? 0.0);
        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal hutang harus lebih besar dari 0.');
        }

        $dueDate = trim((string)($data['due_date'] ?? ''));
        if ($dueDate === '') {
            throw new InvalidArgumentException('Tanggal jatuh tempo wajib diisi.');
        }

        $notes = trim((string)($data['notes'] ?? ''));

        $stmt = $pdo->prepare(
            'INSERT INTO debts (user_id, creditor_name, amount, remaining_amount, due_date, status, notes) 
             VALUES (?, ?, ?, ?, ?, "unpaid", ?)'
        );
        $stmt->execute([$userId, $creditorName, $amount, $amount, $dueDate, $notes]);
        $id = (int)$pdo->lastInsertId();

        return self::getById($pdo, $userId, $id) ?? [];
    }

    public static function getById(PDO $pdo, int $userId, int $debtId): ?array
    {
        $stmt = $pdo->prepare('SELECT * FROM debts WHERE id = ? AND user_id = ? LIMIT 1');
        $stmt->execute([$debtId, $userId]);
        $row = $stmt->fetch();
        if (!$row) {
            return null;
        }

        return self::enrichDebtRow($row);
    }

    public static function list(PDO $pdo, int $userId, ?string $status = null): array
    {
        $sql = 'SELECT * FROM debts WHERE user_id = ?';
        $params = [$userId];

        if ($status && in_array($status, ['unpaid', 'partially_paid', 'paid'], true)) {
            $sql .= ' AND status = ?';
            $params[] = $status;
        }

        $sql .= ' ORDER BY CASE WHEN status = "paid" THEN 1 ELSE 0 END ASC, due_date ASC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        return array_map(fn($r) => self::enrichDebtRow($r), $rows);
    }

    public static function pay(
        PDO $pdo,
        int $userId,
        int $debtId,
        float $amount,
        int $walletId,
        string $date,
        string $notes
    ): array {
        if ($amount <= 0) {
            throw new InvalidArgumentException('Nominal pembayaran harus lebih besar dari 0.');
        }

        $debt = self::getById($pdo, $userId, $debtId);
        if (!$debt) {
            throw new InvalidArgumentException('Hutang tidak ditemukan.');
        }

        if ($debt['status'] === 'paid') {
            throw new InvalidArgumentException('Hutang ini sudah lunas.');
        }

        $remaining = (float)$debt['remaining_amount'];
        if ($amount > $remaining + 0.0001) {
            throw new InvalidArgumentException('Nominal bayar (Rp ' . number_format($amount, 0, ',', '.') . ') melebihi sisa hutang (Rp ' . number_format($remaining, 0, ',', '.') . ').');
        }

        $pdo->beginTransaction();
        try {
            // 1. Record debt_payment transaction in wallet
            $tx = TransactionService::create($pdo, $userId, [
                'wallet_id' => $walletId,
                'type' => 'debt_payment',
                'amount' => $amount,
                'date' => $date ?: date('Y-m-d'),
                'notes' => 'Pembayaran hutang ke ' . $debt['creditor_name'] . ($notes ? ": {$notes}" : '')
            ]);

            // 2. Update remaining amount & status
            $newRemaining = max(0.0, $remaining - $amount);
            $newStatus = $newRemaining < 0.0001 ? 'paid' : 'partially_paid';

            $stmt = $pdo->prepare('UPDATE debts SET remaining_amount = ?, status = ? WHERE id = ? AND user_id = ?');
            $stmt->execute([$newRemaining, $newStatus, $debtId, $userId]);

            // 3. Insert record into debt_payments
            $stmt = $pdo->prepare(
                'INSERT INTO debt_payments (debt_id, transaction_id, amount, payment_date, notes) 
                 VALUES (?, ?, ?, ?, ?)'
            );
            $stmt->execute([$debtId, $tx['id'], $amount, $date ?: date('Y-m-d'), $notes]);

            $pdo->commit();

            return self::getById($pdo, $userId, $debtId) ?? [];
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    public static function delete(PDO $pdo, int $userId, int $debtId): void
    {
        $stmt = $pdo->prepare('DELETE FROM debts WHERE id = ? AND user_id = ?');
        $stmt->execute([$debtId, $userId]);
    }

    private static function enrichDebtRow(array $row): array
    {
        $today = new \DateTimeImmutable(date('Y-m-d'));
        $due = new \DateTimeImmutable($row['due_date']);
        $diff = (int)$today->diff($due)->format('%r%a'); // positive if due is in future, negative if past

        if ($row['status'] === 'paid') {
            $urgency = 'paid';
        } elseif ($diff < 0) {
            $urgency = 'overdue';
        } elseif ($diff <= 3) {
            $urgency = 'urgent';
        } else {
            $urgency = 'normal';
        }

        $row['urgency_status'] = $urgency;
        $row['days_left'] = $diff;
        return $row;
    }
}
