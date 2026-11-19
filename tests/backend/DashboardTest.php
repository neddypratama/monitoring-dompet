<?php
declare(strict_types=1);

namespace Tests\Backend;

use PHPUnit\Framework\TestCase;
use PDO;
use Database;
use AuthService;
use WalletService;
use TransactionService;
use BudgetService;
use GoalService;
use DashboardService;

final class DashboardTest extends TestCase
{
    private PDO $pdo;
    private int $userId;
    private int $walletId;

    protected function setUp(): void
    {
        $this->pdo = Database::connect(':memory:');
        $u = AuthService::register($this->pdo, 'dashuser', 'Dashboard User', 'pass123');
        $this->userId = $u['user']['id'];

        $w = WalletService::create($this->pdo, $this->userId, [
            'name' => 'BCA Digital',
            'type' => 'bank',
            'balance' => 1000000
        ]);
        $this->walletId = $w['id'];
    }

    public function testNetCashflowDoesNotIncludeLoanRepayments(): void
    {
        // Income 500k, Expense 200k, Debt payment 300k
        $today = date('Y-m-d');
        TransactionService::create($this->pdo, $this->userId, [
            'type' => 'income',
            'wallet_id' => $this->walletId,
            'amount' => 500000,
            'date' => $today,
            'notes' => 'Bonus Proyek'
        ]);
        TransactionService::create($this->pdo, $this->userId, [
            'type' => 'expense',
            'wallet_id' => $this->walletId,
            'amount' => 200000,
            'date' => $today,
            'notes' => 'Belanja Bulanan'
        ]);
        TransactionService::create($this->pdo, $this->userId, [
            'type' => 'debt_payment',
            'wallet_id' => $this->walletId,
            'amount' => 300000,
            'date' => $today,
            'notes' => 'Bayar Pinjaman'
        ]);

        $start = date('Y-m-01');
        $end = date('Y-m-t');
        $summary = DashboardService::getSummary($this->pdo, $this->userId, $start, $end);

        $this->assertEquals(500000.0, (float)$summary['total_income']);
        $this->assertEquals(200000.0, (float)$summary['total_expense']);
        $this->assertEquals(300000.0, (float)$summary['net_cashflow'], 'Net Cashflow must be 500k - 200k = 300k (excluding debt_payment)');
    }

    public function testBudgetAndGoalCalculation(): void
    {
        // Setup Budget
        $catStmt = $this->pdo->prepare('SELECT id FROM categories WHERE user_id = ? AND type = "expense" LIMIT 1');
        $catStmt->execute([$this->userId]);
        $catId = (int)$catStmt->fetchColumn();

        $month = date('Y-m');
        BudgetService::setLimit($this->pdo, $this->userId, $catId, 500000, $month);

        // Spend 350.000 in this category
        TransactionService::create($this->pdo, $this->userId, [
            'type' => 'expense',
            'category_id' => $catId,
            'wallet_id' => $this->walletId,
            'amount' => 350000,
            'date' => date('Y-m-d'),
            'notes' => 'Makan bareng'
        ]);

        $budgets = BudgetService::list($this->pdo, $this->userId, $month);
        $b = $budgets[0];
        $this->assertEquals(500000.0, (float)$b['monthly_limit']);
        $this->assertEquals(350000.0, (float)$b['spent_amount']);
        $this->assertEquals(70.0, (float)$b['percentage']);
        $this->assertEquals('warning', $b['status']); // >= 70%

        // Setup Goal and deposit 500.000 (within 650.000 balance)
        $goal = GoalService::create($this->pdo, $this->userId, [
            'name' => 'Beli Laptop',
            'target_amount' => 10000000,
            'target_date' => '2027-12-31'
        ]);

        GoalService::deposit($this->pdo, $this->userId, $goal['id'], 500000, $this->walletId, date('Y-m-d'), 'Tabungan pertama');
        $updatedGoal = GoalService::getById($this->pdo, $this->userId, $goal['id']);
        $this->assertEquals(500000.0, (float)$updatedGoal['current_amount']);
        $this->assertEquals(5.0, (float)$updatedGoal['percentage']);
    }
}
