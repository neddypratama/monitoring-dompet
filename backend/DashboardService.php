<?php
declare(strict_types=1);

require_once __DIR__ . '/WalletService.php';
require_once __DIR__ . '/TransactionService.php';
require_once __DIR__ . '/DebtService.php';
require_once __DIR__ . '/ReceivableService.php';
require_once __DIR__ . '/BudgetService.php';
require_once __DIR__ . '/GoalService.php';

final class DashboardService
{
    public static function getSummary(
        PDO $pdo,
        int $userId,
        string $startDate,
        string $endDate
    ): array {
        $startDate = trim($startDate) ?: date('Y-m-01');
        $endDate = trim($endDate) ?: date('Y-m-t');

        // 1. Total Saldo Likuid (Semua dompet aktif)
        $wallets = WalletService::list($pdo, $userId);
        $totalBalance = 0.0;
        foreach ($wallets as $w) {
            if (!empty($w['is_active'])) {
                $totalBalance += (float)$w['balance'];
            }
        }

        // 2. Total Pemasukan & Pengeluaran Operasional pada rentang waktu
        $stmtInc = $pdo->prepare(
            'SELECT COALESCE(SUM(amount), 0.0) FROM transactions 
             WHERE user_id = ? AND type = "income" AND date(date) >= date(?) AND date(date) <= date(?)'
        );
        $stmtInc->execute([$userId, $startDate, $endDate]);
        $totalIncome = (float)$stmtInc->fetchColumn();

        $stmtExp = $pdo->prepare(
            'SELECT COALESCE(SUM(amount), 0.0) FROM transactions 
             WHERE user_id = ? AND type = "expense" AND date(date) >= date(?) AND date(date) <= date(?)'
        );
        $stmtExp->execute([$userId, $startDate, $endDate]);
        $totalExpense = (float)$stmtExp->fetchColumn();

        $netCashflow = $totalIncome - $totalExpense;

        // 3. Data Grafik Pemasukan vs Pengeluaran per Tanggal
        $stmtChart = $pdo->prepare(
            'SELECT date,
                    SUM(CASE WHEN type = "income" THEN amount ELSE 0.0 END) AS income,
                    SUM(CASE WHEN type = "expense" THEN amount ELSE 0.0 END) AS expense
             FROM transactions
             WHERE user_id = ? AND date(date) >= date(?) AND date(date) <= date(?)
             GROUP BY date
             ORDER BY date ASC'
        );
        $stmtChart->execute([$userId, $startDate, $endDate]);
        $dailyData = $stmtChart->fetchAll();

        // 4. Data Grafik Pengeluaran per Kategori (Donut Chart)
        $stmtCat = $pdo->prepare(
            'SELECT c.name, c.color, c.icon, SUM(t.amount) AS total_amount
             FROM transactions t
             JOIN categories c ON c.id = t.category_id
             WHERE t.user_id = ? AND t.type = "expense" AND date(t.date) >= date(?) AND date(t.date) <= date(?)
             GROUP BY c.id, c.name, c.color, c.icon
             ORDER BY total_amount DESC'
        );
        $stmtCat->execute([$userId, $startDate, $endDate]);
        $categoryExpense = $stmtCat->fetchAll();

        // 5. Data Tren Saldo Harian
        $balanceTrend = [];
        $runningNet = 0.0;
        foreach ($dailyData as $d) {
            $net = (float)$d['income'] - (float)$d['expense'];
            $runningNet += $net;
            $balanceTrend[] = [
                'date' => $d['date'],
                'net_movement' => $net,
                'cumulative' => $runningNet
            ];
        }

        // 6. Hutang Mendesak (belum lunas)
        $allDebts = DebtService::list($pdo, $userId, null);
        $urgentDebts = array_values(array_filter($allDebts, fn($d) => $d['status'] !== 'paid'));

        // 7. Piutang Teman Aktif
        $allRec = ReceivableService::list($pdo, $userId, null);
        $activeReceivables = array_values(array_filter($allRec, fn($r) => $r['status'] !== 'paid'));

        // 8. Anggaran Periode Ini
        $monthYear = substr($startDate, 0, 7);
        $budgets = BudgetService::list($pdo, $userId, $monthYear);

        // 9. Target Tabungan
        $goals = GoalService::list($pdo, $userId);

        // 10. Transaksi Terbaru
        $recentTransactions = TransactionService::list($pdo, $userId, ['limit' => 8]);

        return [
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'total_balance' => $totalBalance,
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'net_cashflow' => $netCashflow,
            'wallets' => $wallets,
            'income_expense_chart' => $dailyData,
            'category_pie_chart' => $categoryExpense,
            'balance_trend_chart' => $balanceTrend,
            'urgent_debts' => array_slice($urgentDebts, 0, 5),
            'active_receivables' => array_slice($activeReceivables, 0, 5),
            'top_budgets' => array_slice($budgets, 0, 5),
            'savings_goals' => array_slice($goals, 0, 4),
            'recent_transactions' => $recentTransactions,
        ];
    }
}
