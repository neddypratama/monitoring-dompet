# Role System & Admin Audit Logs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust role-based access control system (Admin vs User), platform metrics dashboard, and audit activity logging for DompetKu.

**Architecture:** Database schema is enhanced with `role` and `is_active` in `users` table and a new `activity_logs` table. `AuthService` handles automatic role assignment (first user is Admin) and enforces account active status. `AdminService` and `Router` guard `/api/admin/*` endpoints with 403 checks and log administrative events. React frontend introduces an `AdminPage` with tabs for System Stats, User Management, and Activity Logs.

**Tech Stack:** PHP 8.3, SQLite 3 (WAL mode), PDO, React 19, TypeScript, Tailwind CSS v4, Lucide React, PHPUnit 11.

**Spec:** `docs/superpowers/specs/2026-11-19-role-system-and-admin-log-design.md`

## Global Constraints
- SQLite WAL mode and foreign key constraints must be preserved.
- No third-party backend packages; maintain native PHP 8.3 PDO implementation.
- All admin endpoints must reject non-admin requests with HTTP 403.
- Deactivated accounts must be blocked from logging in and their active tokens invalidated.
- Self-deactivation and demotion of the last remaining admin must be prohibited.
- All tests must pass cleanly (`php vendor/bin/phpunit`).
- Frontend production build must succeed without any TypeScript errors (`npm run build`).

## Review Focus
1. First user registration automatically becomes `admin`, subsequent users become `user`.
2. Non-admin users cannot access any `/api/admin/*` endpoint (returns 403 Forbidden).
3. Deactivated users cannot log in and their existing session tokens are rejected.
4. Admin cannot deactivate their own account or demote themselves if they are the last admin.
5. Critical actions (login, register, role change, status toggle) are reliably recorded in `activity_logs`.

---

### Task 1: Database Migration for Role, Status, and Activity Logs

**Files:**
- Modify: `backend/Database.php:34-196`
- Create: `tests/backend/AdminMigrationTest.php`

- [ ] **Step 1: Write failing test for schema migration**
  Write tests in `tests/backend/AdminMigrationTest.php` asserting that `users` table has `role` and `is_active` columns, and `activity_logs` table exists with expected schema.
- [ ] **Step 2: Run test to verify it fails**
  Run: `php vendor/bin/phpunit tests/backend/AdminMigrationTest.php`
  Expected: Failure due to missing columns or table.
- [ ] **Step 3: Implement schema migration in Database.php**
  Update `Database::migrate()` to create `activity_logs` table and add `role` & `is_active` columns to `users` if they do not exist.
- [ ] **Step 4: Run test to verify it passes**
  Run: `php vendor/bin/phpunit tests/backend/AdminMigrationTest.php`
  Expected: OK (all assertions passing).
- [ ] **Step 5: Commit**
  Commit message: `feat(database): add role and is_active to users and create activity_logs table`

---

### Task 2: Auth Service Role Assignment, Status Guard & Activity Logging

**Files:**
- Create: `backend/ActivityLogService.php`
- Modify: `backend/AuthService.php:24-99`
- Create: `tests/backend/RoleAuthTest.php`

- [ ] **Step 1: Write failing tests for Role & Status Auth flow**
  Write tests in `tests/backend/RoleAuthTest.php`:
  - First registered user gets `role = 'admin'`, second user gets `role = 'user'`.
  - Login returns `role` in user payload.
  - Deactivated user (`is_active = 0`) cannot log in.
  - Token validation fails for deactivated user.
  - Successful register and login insert records into `activity_logs`.
- [ ] **Step 2: Run test to verify it fails**
  Run: `php vendor/bin/phpunit tests/backend/RoleAuthTest.php`
  Expected: Failure.
- [ ] **Step 3: Implement ActivityLogService and update AuthService**
  - Implement `ActivityLogService::log(PDO $pdo, ?int $userId, string $action, string $details, string $ip = '', string $ua = '')`.
  - Update `AuthService::register` to set `role = 'admin'` for the first user, and log `auth.register`.
  - Update `AuthService::login` to check `is_active`, return `role`, and log `auth.login`.
  - Update `AuthService::validateToken` to select `role` and require `is_active = 1`.
- [ ] **Step 4: Run test to verify it passes**
  Run: `php vendor/bin/phpunit tests/backend/RoleAuthTest.php`
  Expected: OK (all assertions passing).
- [ ] **Step 5: Commit**
  Commit message: `feat(auth): enforce role assignment, account status guards, and activity logging`

---

### Task 3: Admin Service & Protected REST API Endpoints

**Files:**
- Create: `backend/AdminService.php`
- Modify: `backend/Router.php:88-140`
- Create: `tests/backend/AdminServiceTest.php`

- [ ] **Step 1: Write failing tests for Admin operations and API routes**
  Write tests in `tests/backend/AdminServiceTest.php`:
  - `AdminService::getStats()` returns platform metrics.
  - `AdminService::listUsers()` returns all users with wallet/transaction counts.
  - `AdminService::updateRole()` changes role and throws error on demoting last admin.
  - `AdminService::toggleStatus()` changes status and throws error on self-deactivation.
  - `AdminService::getLogs()` retrieves activity logs.
- [ ] **Step 2: Run test to verify it fails**
  Run: `php vendor/bin/phpunit tests/backend/AdminServiceTest.php`
  Expected: Failure.
- [ ] **Step 3: Implement AdminService and Router endpoints**
  - Create `backend/AdminService.php`.
  - In `backend/Router.php`, add `requireAdmin($user)` guard and routes:
    - `GET /api/admin/stats`
    - `GET /api/admin/users`
    - `PUT /api/admin/users/{id}/role`
    - `PUT /api/admin/users/{id}/status`
    - `GET /api/admin/logs`
- [ ] **Step 4: Run test to verify it passes**
  Run: `php vendor/bin/phpunit tests/backend/AdminServiceTest.php`
  Expected: OK (all assertions passing).
- [ ] **Step 5: Commit**
  Commit message: `feat(admin): implement AdminService and protected admin endpoints`

---

### Task 4: Frontend Types, Auth Context & Admin Navigation

**Files:**
- Modify: `frontend/src/types/index.ts:1-7`
- Modify: `frontend/src/components/Navbar.tsx:1-60`
- Modify: `frontend/src/App.tsx:1-61`

- [ ] **Step 1: Update TypeScript interfaces**
  Add `role: 'admin' | 'user'` and `is_active?: number` to `User`. Add `AdminUserListItem`, `ActivityLog`, `AdminStats` interfaces.
- [ ] **Step 2: Update Navbar to show Panel Admin for Admin users**
  Update `Navbar.tsx` so users with `user.role === 'admin'` see `Panel Admin` tab with a distinct Shield icon and badge.
- [ ] **Step 3: Update App.tsx tab router**
  Add `'admin'` to `TabType` and wire it up to render the admin view when selected.
- [ ] **Step 4: Verify frontend build**
  Run: `npm run build --prefix frontend`
  Expected: Build succeeds.
- [ ] **Step 5: Commit**
  Commit message: `feat(frontend): add admin types, auth role support, and admin navigation`

---

### Task 5: Frontend Admin Panel Page (Metrics, User Management, Activity Logs)

**Files:**
- Create: `frontend/src/pages/AdminPage.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Implement AdminPage component**
  Create `frontend/src/pages/AdminPage.tsx` containing:
  - 3 sub-tabs: Ringkasan Sistem (Stats), Manajemen Pengguna (Users), Log Aktivitas (Audit Logs).
  - Stats: Cards for Total Users, Active Users, Total Wallets, Total Transactions, Total Volume.
  - Users: Data table with username, full name, role badge, status badge, action to toggle role and status with confirmation dialogs.
  - Logs: Searchable table of activity logs with timestamp, user badge, action, details, and IP address.
- [ ] **Step 2: Verify frontend compilation and bundle**
  Run: `npm run build --prefix frontend`
  Expected: Build succeeds cleanly in `dist/`.
- [ ] **Step 3: Commit**
  Commit message: `feat(frontend): implement comprehensive AdminPage with user management and audit logs`

---

### Task 6: End-to-End Test & Full Verification

**Files:**
- Create: `tests/e2e/AdminFlowTest.php`

- [ ] **Step 1: Write E2E test verifying complete role and log lifecycle**
  Test registers Admin, registers regular User, logs in as both, Admin promotes User to Admin, Admin deactivates User, asserts User cannot log in, asserts all actions recorded in `activity_logs`.
- [ ] **Step 2: Run all backend tests and E2E test**
  Run: `php vendor/bin/phpunit`
  Expected: All tests pass.
- [ ] **Step 3: Run frontend production build**
  Run: `npm run build --prefix frontend`
  Expected: Built cleanly in `dist/`.
- [ ] **Step 4: Commit**
  Commit message: `test(e2e): add comprehensive role system and admin audit log end-to-end test`
