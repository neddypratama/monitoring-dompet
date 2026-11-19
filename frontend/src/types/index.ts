export interface User {
  id: number;
  username: string;
  full_name: string;
  created_at: string;
}

export interface Wallet {
  id: number;
  user_id: number;
  name: string;
  type: 'cash' | 'bank' | 'ewallet';
  account_number: string;
  balance: number;
  color: string;
  icon: string;
  is_active: number;
  created_at: string;
}

export interface Category {
  id: number;
  user_id: number;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  is_default: number;
}

export interface Transaction {
  id: number;
  user_id: number;
  wallet_id: number;
  category_id?: number | null;
  type: 'income' | 'expense' | 'transfer' | 'split_receivable' | 'receivable_settlement' | 'debt_receipt' | 'debt_payment';
  amount: number;
  date: string;
  notes: string;
  receipt_id?: number | null;
  transfer_to_wallet_id?: number | null;
  admin_fee?: number;
  wallet_name?: string;
  wallet_color?: string;
  wallet_icon?: string;
  category_name?: string;
  category_color?: string;
  category_icon?: string;
  transfer_to_wallet_name?: string;
  created_at: string;
}

export interface Debt {
  id: number;
  user_id: number;
  creditor_name: string;
  amount: number;
  remaining_amount: number;
  due_date: string;
  status: 'unpaid' | 'partially_paid' | 'paid';
  urgency_status?: 'overdue' | 'urgent' | 'normal' | 'paid';
  days_left?: number;
  notes: string;
  created_at: string;
}

export interface Receivable {
  id: number;
  user_id: number;
  friend_name: string;
  amount: number;
  remaining_amount: number;
  receipt_id?: number | null;
  merchant_name?: string;
  status: 'unpaid' | 'partially_paid' | 'paid';
  notes: string;
  created_at: string;
}

export interface Budget {
  id: number;
  category_id: number;
  monthly_limit: number;
  spent_amount: number;
  remaining_amount: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
  month_year: string;
  category_name: string;
  category_color: string;
  category_icon: string;
}

export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  percentage: number;
  target_date: string;
  wallet_id?: number | null;
  wallet_name?: string;
  icon: string;
  color: string;
  is_achieved: number;
}

export interface DashboardSummary {
  period: {
    start_date: string;
    end_date: string;
  };
  total_balance: number;
  total_income: number;
  total_expense: number;
  net_cashflow: number;
  wallets: Wallet[];
  income_expense_chart: Array<{ date: string; income: number; expense: number }>;
  category_pie_chart: Array<{ name: string; color: string; icon: string; total_amount: number }>;
  balance_trend_chart: Array<{ date: string; net_movement: number; cumulative: number }>;
  urgent_debts: Debt[];
  active_receivables: Receivable[];
  top_budgets: Budget[];
  savings_goals: SavingsGoal[];
  recent_transactions: Transaction[];
}

export interface ReceiptItem {
  name: string;
  qty: number;
  raw_price: number;
  net_price?: number;
  net_unit_price?: number;
  assigned_to?: string;
  is_self?: boolean;
}

export interface ParsedReceipt {
  merchant_name: string;
  transaction_date: string;
  image_path?: string;
  raw_subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  service_tax_fee: number;
  total_paid: number;
  items: ReceiptItem[];
}
