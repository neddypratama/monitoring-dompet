# Monitoring Dompet & Split Bill Multi-AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun sistem web pencatatan keuangan pribadi multi-dompet (tunai, bank, e-wallet) dengan autentikasi akun, pemindai struk cerdas berbasis Multi-AI untuk split bill proporsional, pengingat hutang (dengan jatuh tempo) dan piutang teman, serta dashboard visual interaktif.

**Architecture:** Arsitektur fullstack terpisah dan modular: Backend PHP 8.3 native REST API dengan zero-config SQLite PDO (auto-migration & WAL mode) dipadukan dengan Frontend SPA modern menggunakan Vite + React 19 + TypeScript + Tailwind CSS v4 + Lucide Icons + Recharts. AI vision modular mendukung Google Gemini, Groq, OpenRouter, dan OpenAI.

**Tech Stack:** PHP 8.3, SQLite 3 (PDO), React 19, TypeScript 5.8, Vite 6, Tailwind CSS v4, Recharts, Lucide React, PHPUnit / Vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-monitoring-dompet-design.md`

## Global Constraints

- Backend PHP murni tanpa framework berat, kompatibel langsung dengan Laragon PHP 8.3 & Apache/Nginx.
- Database lokal SQLite zero-config di `storage/monitoring_dompet.sqlite` dengan auto-migrasi schema saat start.
- Frontend React SPA di build ke static files (`dist`) yang dapat disajikan langsung oleh web server PHP atau port dev Vite.
- Semua kalkulasi split bill wajib membagi diskon, pajak, dan ongkos kirim secara proporsional dengan algoritma penyesuaian selisih pembulatan (sum items == grand total dibayar).
- Isolasi data penuh berdasarkan `user_id` yang terautentikasi.
- API Key Multi-AI disimpan aman di database pengaturan pengguna (`app_settings`).

## Review Focus

1. **Selisih Pembulatan Split Bill:** Pecahan rupiah pembagian diskon/pajak tidak boleh menghasilkan selisih 1 rupiah pun terhadap total struk yang dibayar dompet.
2. **Distorsi Arus Kas:** Pelunasan piutang oleh teman dan pembayaran hutang tidak boleh tercatat sebagai pendapatan operasional (`income`) atau belanja operasional (`expense`) bulanan di dashboard.
3. **Urgensi Jatuh Tempo Hutang:** Hutang yang jatuh tempo $\le$ 3 hari atau sudah lewat harus memiliki kalkulasi status dan visual badge yang akurat.
4. **Isolasi Keamanan Data:** Pengguna tidak boleh dapat mengakses dompet, transaksi, hutang, atau struk milik akun lain.
5. **Fallback Multi-AI:** Kegagalan salah satu model AI (misal kuota habis) memberikan pesan galat yang jelas dan memungkinkan pengguna berganti ke provider lain di pengaturan.

---

### Task 1: Backend Foundation (SQLite PDO Database, Schema Migrations & User Authentication)

**Files:**
- Create: `backend/Database.php`
- Create: `backend/AuthService.php`
- Create: `backend/migrate.php`
- Test: `tests/backend/AuthTest.php`

**Interfaces:**
- Consumes: Standard PHP 8.3 PDO SQLite.
- Produces: 
  - `Database::connect(?string $path = null): PDO`
  - `AuthService::register(PDO $pdo, string $username, string $fullName, string $password): array`
  - `AuthService::login(PDO $pdo, string $username, string $password): array`
  - `AuthService::validateToken(PDO $pdo, string $token): ?array`

- [ ] **Step 1: Write the failing tests for Database connection, migrations, and AuthService**

```php
// tests/backend/AuthTest.php
class AuthTest extends \PHPUnit\Framework\TestCase {
    private PDO $pdo;
    protected function setUp(): void {
        $this->pdo = Database::connect(':memory:');
    }
    public function testRegisterAndLoginSuccess(): void {
        $res = AuthService::register($this->pdo, 'budi', 'Budi Santoso', 'secret123');
        $this->assertArrayHasKey('token', $res);
        $this->assertEquals('budi', $res['user']['username']);

        $login = AuthService::login($this->pdo, 'budi', 'secret123');
        $this->assertArrayHasKey('token', $login);
        
        $user = AuthService::validateToken($this->pdo, $login['token']);
        $this->assertNotNull($user);
        $this->assertEquals('budi', $user['username']);
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php vendor/bin/phpunit tests/backend/AuthTest.php`  
Expected: FAIL with "Class Database not found"

- [ ] **Step 3: Implement `Database.php`, `migrate.php`, and `AuthService.php`**

Implement SQLite initialization in `backend/Database.php` creating tables: `users`, `user_sessions`, `wallets`, `categories`, `transactions`, `debts`, `debt_payments`, `receivables`, `receivable_payments`, `receipts`, `receipt_items`, `budgets`, `savings_goals`, `app_settings`. Implement password hashing (`PASSWORD_DEFAULT`), session generation with 30 days expiration in `backend/AuthService.php`.

- [ ] **Step 4: Run test to verify it passes**

Run: `php vendor/bin/phpunit tests/backend/AuthTest.php`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/Database.php backend/AuthService.php backend/migrate.php tests/backend/AuthTest.php
git commit -m "feat(backend): database schema migrations and user authentication service"
```

---

### Task 2: Wallet Management & Ledger Transaction Engine

**Files:**
- Create: `backend/WalletService.php`
- Create: `backend/TransactionService.php`
- Test: `tests/backend/TransactionTest.php`

**Interfaces:**
- Consumes: `Database::connect()`, authenticated user array from `AuthService`.
- Produces:
  - `WalletService::list(PDO $pdo, int $userId): array`
  - `WalletService::create(PDO $pdo, int $userId, array $data): array`
  - `WalletService::update(PDO $pdo, int $userId, int $walletId, array $data): array`
  - `WalletService::transfer(PDO $pdo, int $userId, int $fromId, int $toId, float $amount, float $adminFee, string $date, string $notes): array`
  - `TransactionService::create(PDO $pdo, int $userId, array $data): array`
  - `TransactionService::list(PDO $pdo, int $userId, array $filters): array`

- [ ] **Step 1: Write the failing tests for Wallets and Transactions**

```php
// tests/backend/TransactionTest.php
class TransactionTest extends \PHPUnit\Framework\TestCase {
    private PDO $pdo;
    private int $userId;
    protected function setUp(): void {
        $this->pdo = Database::connect(':memory:');
        $u = AuthService::register($this->pdo, 'alice', 'Alice', 'pass123');
        $this->userId = $u['user']['id'];
    }
    public function testWalletTransferAndBalanceUpdate(): void {
        $w1 = WalletService::create($this->pdo, $this->userId, ['name' => 'BCA', 'type' => 'bank', 'balance' => 500000]);
        $w2 = WalletService::create($this->pdo, $this->userId, ['name' => 'Tunai', 'type' => 'cash', 'balance' => 50000]);
        WalletService::transfer($this->pdo, $this->userId, $w1['id'], $w2['id'], 100000, 2500, '2026-11-19', 'Tarik Tunai');
        
        $wallets = WalletService::list($this->pdo, $this->userId);
        $bca = current(array_filter($wallets, fn($w) => $w['id'] === $w1['id']));
        $tunai = current(array_filter($wallets, fn($w) => $w['id'] === $w2['id']));
        $this->assertEquals(397500, (float)$bca['balance']); // 500000 - 100000 - 2500
        $this->assertEquals(150000, (float)$tunai['balance']); // 50000 + 100000
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php vendor/bin/phpunit tests/backend/TransactionTest.php`  
Expected: FAIL with "Class WalletService not found"

- [ ] **Step 3: Implement `WalletService.php` and `TransactionService.php`**

Support transaction types: `income`, `expense`, `transfer`, `split_receivable`, `receivable_settlement`, `debt_receipt`, `debt_payment`. Ensure atomic DB transactions (`beginTransaction`, `commit`, `rollBack`) when altering wallet balances.

- [ ] **Step 4: Run test to verify it passes**

Run: `php vendor/bin/phpunit tests/backend/TransactionTest.php`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/WalletService.php backend/TransactionService.php tests/backend/TransactionTest.php
git commit -m "feat(backend): wallet management and double-entry transaction engine"
```

---

### Task 3: Debts (Hutang) & Receivables (Piutang) Engine

**Files:**
- Create: `backend/DebtService.php`
- Create: `backend/ReceivableService.php`
- Test: `tests/backend/DebtReceivableTest.php`

**Interfaces:**
- Consumes: `WalletService`, `TransactionService`, `Database::connect()`.
- Produces:
  - `DebtService::create(PDO $pdo, int $userId, array $data): array`
  - `DebtService::pay(PDO $pdo, int $userId, int $debtId, float $amount, int $walletId, string $date, string $notes): array`
  - `DebtService::list(PDO $pdo, int $userId, ?string $status): array`
  - `ReceivableService::create(PDO $pdo, int $userId, array $data): array`
  - `ReceivableService::settle(PDO $pdo, int $userId, int $receivableId, float $amount, int $walletId, string $date, string $notes): array`
  - `ReceivableService::list(PDO $pdo, int $userId, ?string $status): array`

- [ ] **Step 1: Write failing tests for Debts due date status and Receivables settlement**

```php
// tests/backend/DebtReceivableTest.php
class DebtReceivableTest extends \PHPUnit\Framework\TestCase {
    public function testDebtDueDateUrgency(): void {
        $pdo = Database::connect(':memory:');
        $u = AuthService::register($pdo, 'budi2', 'Budi', 'secret123');
        $d = DebtService::create($pdo, $u['user']['id'], [
            'creditor_name' => 'Pinjaman Bank',
            'amount' => 1000000,
            'due_date' => date('Y-m-d', strtotime('+2 days'))
        ]);
        $list = DebtService::list($pdo, $u['user']['id'], null);
        $this->assertEquals('urgent', $list[0]['urgency_status']); // <= 3 days
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php vendor/bin/phpunit tests/backend/DebtReceivableTest.php`  
Expected: FAIL with "Class DebtService not found"

- [ ] **Step 3: Implement `DebtService.php` and `ReceivableService.php`**

Calculate urgency (`overdue`, `urgent` if $\le$ 3 days, `normal`). On debt payment: cut wallet balance, record `debt_payment` transaction, update `remaining_amount` and status (`paid`/`partially_paid`). On receivable settlement: add wallet balance, record `receivable_settlement` transaction.

- [ ] **Step 4: Run test to verify it passes**

Run: `php vendor/bin/phpunit tests/backend/DebtReceivableTest.php`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/DebtService.php backend/ReceivableService.php tests/backend/DebtReceivableTest.php
git commit -m "feat(backend): debt due date tracker and receivable settlement engine"
```

---

### Task 4: Multi-AI Receipt OCR & Split Bill Calculator Service

**Files:**
- Create: `backend/Calculators.php`
- Create: `backend/AiVisionService.php`
- Create: `backend/ReceiptService.php`
- Test: `tests/backend/SplitBillCalculatorTest.php`

**Interfaces:**
- Consumes: Multi-AI API settings from `app_settings` (`Gemini`, `Groq`, `OpenRouter`, `OpenAI`).
- Produces:
  - `Calculators::calculateProportionalSplit(array $items, float $subtotal, float $discount, float $delivery, float $serviceTax, float $totalPaid): array`
  - `AiVisionService::parseReceipt(PDO $pdo, int $userId, string $imagePath, ?string $provider, ?string $model): array`
  - `ReceiptService::saveAndExecuteSplit(PDO $pdo, int $userId, array $splitData): array`

- [ ] **Step 1: Write failing test for proportional discount/tax penny-rounding calculation**

```php
// tests/backend/SplitBillCalculatorTest.php
class SplitBillCalculatorTest extends \PHPUnit\Framework\TestCase {
    public function testProportionalSplitZeroDifference(): void {
        $items = [
            ['name' => 'Mie Gacoan Lv 2', 'qty' => 1, 'raw_price' => 15000],
            ['name' => 'Mie Gacoan Lv 4', 'qty' => 1, 'raw_price' => 15000],
            ['name' => 'Es Genderuwo', 'qty' => 1, 'raw_price' => 10000],
        ];
        // Total kotor: 40.000, Diskon: 10.000, Ongkir: 6.000, Biaya Layanan: 4.000 -> Total Akhir: 40.000
        $result = Calculators::calculateProportionalSplit($items, 40000, 10000, 6000, 4000, 40000);
        $sumNet = array_sum(array_column($result['items'], 'net_price'));
        $this->assertEquals(40000.0, $sumNet, "Sum of net item prices must match totalPaid exactly");
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php vendor/bin/phpunit tests/backend/SplitBillCalculatorTest.php`  
Expected: FAIL with "Class Calculators not found"

- [ ] **Step 3: Implement `Calculators.php`, `AiVisionService.php`, and `ReceiptService.php`**

Implement proportional ratio calculation with integer penny adjustment to eliminate rounding drift. Implement multimodal image prompts for Google Gemini, Groq, OpenRouter, and OpenAI with structured JSON response parser. Implement `ReceiptService::saveAndExecuteSplit` to atomically store `receipts`, `receipt_items`, debit the paying wallet, record personal `expense`, and generate `receivables` for friends.

- [ ] **Step 4: Run test to verify it passes**

Run: `php vendor/bin/phpunit tests/backend/SplitBillCalculatorTest.php`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/Calculators.php backend/AiVisionService.php backend/ReceiptService.php tests/backend/SplitBillCalculatorTest.php
git commit -m "feat(backend): multi-ai receipt parser and precision split-bill calculator"
```

---

### Task 5: Budgets, Savings Goals & Dashboard Aggregation API

**Files:**
- Create: `backend/BudgetService.php`
- Create: `backend/GoalService.php`
- Create: `backend/DashboardService.php`
- Create: `backend/Router.php`
- Create: `api.php`
- Test: `tests/backend/DashboardTest.php`

**Interfaces:**
- Consumes: All services from Tasks 1-4.
- Produces:
  - `DashboardService::getSummary(PDO $pdo, int $userId, string $startDate, string $endDate): array`
  - `Router::dispatch(): void` handling `/api/*` endpoints.

- [ ] **Step 1: Write failing test for Dashboard metrics calculation**

```php
// tests/backend/DashboardTest.php
class DashboardTest extends \PHPUnit\Framework\TestCase {
    public function testNetCashflowDoesNotIncludeLoanRepayments(): void {
        $pdo = Database::connect(':memory:');
        $u = AuthService::register($pdo, 'charlie', 'Charlie', 'secret123');
        $uid = $u['user']['id'];
        $w = WalletService::create($pdo, $uid, ['name' => 'BCA', 'type' => 'bank', 'balance' => 1000000]);
        // Income 500k, Expense 200k, Debt payment 300k
        TransactionService::create($pdo, $uid, ['type' => 'income', 'wallet_id' => $w['id'], 'amount' => 500000, 'date' => date('Y-m-d')]);
        TransactionService::create($pdo, $uid, ['type' => 'expense', 'wallet_id' => $w['id'], 'amount' => 200000, 'date' => date('Y-m-d')]);
        TransactionService::create($pdo, $uid, ['type' => 'debt_payment', 'wallet_id' => $w['id'], 'amount' => 300000, 'date' => date('Y-m-d')]);
        
        $summary = DashboardService::getSummary($pdo, $uid, date('Y-m-01'), date('Y-m-t'));
        $this->assertEquals(500000, $summary['total_income']);
        $this->assertEquals(200000, $summary['total_expense']);
        $this->assertEquals(300000, $summary['net_cashflow']); // 500k - 200k (debt_payment excluded from operational expense)
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `php vendor/bin/phpunit tests/backend/DashboardTest.php`  
Expected: FAIL with "Class DashboardService not found"

- [ ] **Step 3: Implement `BudgetService.php`, `GoalService.php`, `DashboardService.php`, and `Router.php`**

Provide endpoints:
- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET/POST/PUT/DELETE /api/wallets`, `POST /api/wallets/transfer`
- `GET/POST /api/transactions`
- `GET/POST /api/debts`, `POST /api/debts/{id}/pay`
- `GET/POST /api/receivables`, `POST /api/receivables/{id}/settle`
- `POST /api/receipts/scan`, `POST /api/receipts/split-execute`, `GET /api/receipts`
- `GET/POST /api/budgets`, `GET/POST /api/goals`, `POST /api/goals/{id}/deposit`
- `GET /api/dashboard` (KPI cards, charts, urgent debts, friend receivables, recent txs)
- `GET/POST /api/settings` (Multi-AI keys, categories, export/backup)

- [ ] **Step 4: Run test to verify it passes**

Run: `php vendor/bin/phpunit tests/backend/DashboardTest.php`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/BudgetService.php backend/GoalService.php backend/DashboardService.php backend/Router.php api.php tests/backend/DashboardTest.php
git commit -m "feat(backend): dashboard analytics, budget/goal services, and complete rest api router"
```

---

### Task 6: Frontend Scaffolding, Design System & Authentication Views

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/tsconfig.json`
- Create: `frontend/src/index.css`
- Create: `frontend/src/api/client.ts`
- Create: `frontend/src/context/AuthContext.tsx`
- Create: `frontend/src/pages/LoginPage.tsx`
- Create: `frontend/src/pages/RegisterPage.tsx`
- Create: `frontend/src/components/Navbar.tsx`

**Interfaces:**
- Consumes: `/api/auth/*` endpoints.
- Produces: React SPA app shell with persistent token auth state, responsive mobile/desktop navigation bar with active tab indicators.

- [ ] **Step 1: Initialize Vite React TypeScript project and configure Tailwind CSS v4**

Setup `frontend/package.json` with dependencies: `react`, `react-dom`, `lucide-react`, `recharts`, `tailwindcss`, `@tailwindcss/vite`, `vite`, `typescript`.

- [ ] **Step 2: Build `api/client.ts` with auto token header injection and AuthContext**

Handle automatic Bearer token storage in localStorage, 401 redirection to Login, and user profile loading.

- [ ] **Step 3: Implement clean, modern `LoginPage.tsx` and `RegisterPage.tsx`**

Design elegant auth screens with input validation, error alerts, and seamless switch between Login and Register.

- [ ] **Step 4: Verify build and component rendering**

Run: `cd frontend && npm run build`  
Expected: Build succeeds with 0 errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): react 19 vite scaffolding, auth context, and authentication views"
```

---

### Task 7: Frontend Wallet & Transaction Management Views

**Files:**
- Create: `frontend/src/pages/WalletsPage.tsx`
- Create: `frontend/src/pages/TransactionsPage.tsx`
- Create: `frontend/src/components/WalletCard.tsx`
- Create: `frontend/src/components/TransferModal.tsx`
- Create: `frontend/src/components/TransactionModal.tsx`

**Interfaces:**
- Consumes: `/api/wallets`, `/api/wallets/transfer`, `/api/transactions`, `/api/categories`.
- Produces: Interactive views to view wallets, add/edit wallet accounts, record inter-wallet transfers, view paginated transactions with category badges and date filters.

- [ ] **Step 1: Implement `WalletCard.tsx` and `WalletsPage.tsx`**

Display card per wallet (Cash, Bank, E-wallet) with icon, color accent, current balance in Rupiah format, and quick actions ("Transfer", "Edit").

- [ ] **Step 2: Implement `TransferModal.tsx` with admin fee calculation**

Dropdowns for source wallet and destination wallet, amount, date, and optional admin fee with instant balance impact preview.

- [ ] **Step 3: Implement `TransactionsPage.tsx` and `TransactionModal.tsx`**

Comprehensive transaction history table with search, category filter, wallet filter, type filter, and modal to record new Income / Expense.

- [ ] **Step 4: Verify frontend build**

Run: `cd frontend && npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/WalletsPage.tsx frontend/src/pages/TransactionsPage.tsx frontend/src/components/
git commit -m "feat(frontend): wallet management and transaction ledger views"
```

---

### Task 8: Frontend Debts (Hutang) & Receivables (Piutang) Views

**Files:**
- Create: `frontend/src/pages/DebtsPage.tsx`
- Create: `frontend/src/components/DebtModal.tsx`
- Create: `frontend/src/components/PayDebtModal.tsx`
- Create: `frontend/src/components/SettleReceivableModal.tsx`

**Interfaces:**
- Consumes: `/api/debts`, `/api/debts/{id}/pay`, `/api/receivables`, `/api/receivables/{id}/settle`.
- Produces: Dedicated 2-tab view for Hutang (with urgency status, due date countdown, pay modal) and Piutang (with friend group breakdown, WhatsApp reminder copy button, mark as paid modal).

- [ ] **Step 1: Implement `DebtsPage.tsx` with Hutang vs Piutang tab switcher**

Highlight Hutang with color-coded badges: Green (Safe), Yellow (Due in $\le$ 3 days with countdown), Red (Overdue).

- [ ] **Step 2: Implement WhatsApp bill reminder generator for Piutang**

Generate structured text to copy: friend name, ordered items from receipt, amount owed, and user's payment accounts.

- [ ] **Step 3: Implement payment and settlement modals**

Modals that allow selecting destination or payment wallet to automatically synchronize wallet balances.

- [ ] **Step 4: Verify frontend build**

Run: `cd frontend && npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/DebtsPage.tsx frontend/src/components/DebtModal.tsx frontend/src/components/PayDebtModal.tsx frontend/src/components/SettleReceivableModal.tsx
git commit -m "feat(frontend): debt due date tracker and receivable split management views"
```

---

### Task 9: Frontend AI Receipt Scanner & Interactive Split Bill Wizard

**Files:**
- Create: `frontend/src/pages/ScanReceiptPage.tsx`
- Create: `frontend/src/components/ReceiptItemRow.tsx`
- Create: `frontend/src/components/SplitFriendAssignment.tsx`
- Create: `frontend/src/components/SplitSummaryModal.tsx`

**Interfaces:**
- Consumes: `POST /api/receipts/scan`, `POST /api/receipts/split-execute`, `/api/wallets`.
- Produces: Seamless 4-step wizard:
  1. Upload photo / screenshot (with drag & drop and camera capture).
  2. AI parsing loading spinner with active model badge.
  3. Interactive table: verify items, prices, edit discounts/taxes, and assign items to "Saya" or specific friends.
  4. Final review: wallet selection, personal expense amount, friend receivables list, copy WhatsApp recap, and one-click execution.

- [ ] **Step 1: Implement upload & AI scanner UI with image preview**

Support JPEG/PNG/WebP, show clear file size and image validation, and provide provider/model selector.

- [ ] **Step 2: Implement interactive itemized table and friend assigner**

Allow user to add/edit item name, quantity, catalog price, and assign each item to yourself or type friend names. Auto-calculate net item prices in real time.

- [ ] **Step 3: Implement execution summary modal and WhatsApp recap copy button**

Show exact breakdown: Wallet debited full amount, User expense booked, Friend A receivable booked, Friend B receivable booked.

- [ ] **Step 4: Verify frontend build**

Run: `cd frontend && npm run build`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/ScanReceiptPage.tsx frontend/src/components/ReceiptItemRow.tsx frontend/src/components/SplitFriendAssignment.tsx frontend/src/components/SplitSummaryModal.tsx
git commit -m "feat(frontend): smart receipt scanner and interactive split bill wizard"
```

---

### Task 10: Frontend Dashboard, Budgets, Savings Goals & Settings

**Files:**
- Create: `frontend/src/pages/DashboardPage.tsx`
- Create: `frontend/src/pages/BudgetsGoalsPage.tsx`
- Create: `frontend/src/pages/SettingsPage.tsx`
- Create: `frontend/src/components/MetricCard.tsx`
- Create: `frontend/src/components/Charts/IncomeExpenseChart.tsx`
- Create: `frontend/src/components/Charts/CategoryPieChart.tsx`
- Create: `frontend/src/components/Charts/BalanceTrendChart.tsx`

**Interfaces:**
- Consumes: `/api/dashboard`, `/api/budgets`, `/api/goals`, `/api/settings`.
- Produces: Complete dashboard with period dropdown (Today, This Week, This Month, Last Month, Custom), 4 KPI cards, Recharts visualizations, budget progress bars, savings goals, and Multi-AI settings page.

- [ ] **Step 1: Implement `DashboardPage.tsx` with header, period selector, and 4 KPI cards**

Display Total Liquid Balance, Total Income, Total Expense, and Net Cashflow with currency formatting and trend indicators.

- [ ] **Step 2: Implement Recharts components**

Income vs Expense bar chart, Balance trend area chart, Category expense donut chart.

- [ ] **Step 3: Implement Budgets & Goals page**

Category budget limit bars (Green / Yellow / Red overbudget) and savings goals with progress and deposit modal.

- [ ] **Step 4: Implement Settings page for Multi-AI keys and data export**

Form to input and test Gemini, Groq, OpenRouter, and OpenAI API keys, active provider radio buttons, and Export JSON / CSV button.

- [ ] **Step 5: Verify frontend build**

Run: `cd frontend && npm run build`  
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/DashboardPage.tsx frontend/src/pages/BudgetsGoalsPage.tsx frontend/src/pages/SettingsPage.tsx frontend/src/components/
git commit -m "feat(frontend): comprehensive financial dashboard, charts, budgets, and settings views"
```

---

### Task 11: End-to-End Build, Integration & Laragon Deployment Verification

**Files:**
- Create: `index.php` (Serving built frontend SPA and routing `/api` requests)
- Create: `.htaccess` (Apache rewrite rules for clean SPA and API routes in Laragon)
- Modify: `frontend/vite.config.ts` (Build output to root or `dist` with base path handling)
- Create: `deploy.sh`
- Test: `tests/e2e/ApiSmokeTest.php`

**Interfaces:**
- Consumes: Built frontend artifacts and backend services.
- Produces: Completely integrated, production-ready web application running seamlessly on `http://localhost/monitoring-dompet` or custom virtual host in Laragon.

- [ ] **Step 1: Write E2E smoke test verifying full API flow**

Verify register -> login -> create wallet -> add income -> scan mock receipt -> split bill -> check dashboard metrics.

- [ ] **Step 2: Configure `index.php` and `.htaccess` for Laragon Apache**

Route any `/api/*` requests to `api.php` and all other routes to `dist/index.html` with correct MIME types.

- [ ] **Step 3: Run frontend build and backend test suite**

Run: `cd frontend && npm run build && cd .. && php vendor/bin/phpunit`  
Expected: All tests pass, build succeeds.

- [ ] **Step 4: Test in browser/curl**

Run: `curl -s http://localhost/monitoring-dompet/api/auth/me`  
Expected: JSON response `{ "success": false, "message": "Unauthorized" }`

- [ ] **Step 5: Final Commit**

```bash
git add index.php .htaccess deploy.sh tests/e2e/ApiSmokeTest.php
git commit -m "feat(app): complete laragon apache integration and production deployment setup"
```
