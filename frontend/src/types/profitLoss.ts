export type ProfitLossProjectOption = {
  project_id: number;
  project_name: string;
  status: string;
};

export type ProfitLossWorkerRow = {
  worker_id: number;
  worker_name: string;
  days_worked: number;
  hours_worked: string;
  labour_cost: string;
  daily_wage: string;
  hourly_rate: string;
  using_default_wage: boolean;
};

export type ProfitLossLabourSource = {
  date: string | null;
  worker_name: string;
  task_title: string | null;
  hours: string;
  hourly_rate: string;
  cost: string;
  after_original_deadline: boolean;
  using_default_wage: boolean;
};

export type ProfitLossMaterialRow = {
  expense_id: number;
  milestone_id: number;
  milestone_title: string;
  task_id: number | null;
  task_title: string | null;
  material_name: string;
  quantity: string;
  unit: string;
  unit_cost: string;
  total_cost: string;
  expense_date: string;
  invoice_reference: string;
  remarks: string;
  status: string;
  added_by_name: string | null;
};

export type ProfitLossOtherRow = {
  expense_id: number;
  milestone_id: number | null;
  milestone_title: string | null;
  category: string;
  category_label: string;
  title: string;
  amount: string;
  expense_date: string;
  remarks: string;
  added_by_name: string | null;
};

export type ProfitLossMilestoneRow = {
  milestone_id: number;
  title: string;
  description: string;
  status: string;
  planned_start_date: string | null;
  original_deadline: string | null;
  current_deadline: string | null;
  extension_days: number;
  extension_reason: string;
  contract_value: string;
  planned_cost: string;
  labour_cost: string;
  material_cost: string;
  other_expenses: string;
  actual_cost: string;
  cost_variance: string;
  expected_profit: string | null;
  profit: string;
  loss: string;
  result: string;
  profit_margin_percent: string;
  planned_completion_percent: string;
  verified_completion_percent: string;
  over_budget: boolean;
  spend_rising_while_behind: boolean;
  cost_before_extension: string;
  extension_labour_cost: string;
  revised_expected_profit: string;
  workers: ProfitLossWorkerRow[];
  labour_source: ProfitLossLabourSource[];
  materials: ProfitLossMaterialRow[];
  other_expense_rows: ProfitLossOtherRow[];
  calculations: Record<string, string>;
};

export type ProfitLossDashboardData = {
  project: {
    project_id: number;
    project_name: string;
    status: string;
    initial_budget: string;
  };
  generated_at: string;
  default_daily_wage: string;
  scope: string;
  summary: {
    contract_value: string;
    planned_cost: string;
    labour_cost: string;
    material_cost: string;
    other_expenses: string;
    actual_cost: string;
    cost_variance: string;
    profit: string;
    loss: string;
    result: string;
    profit_margin_percent: string;
    expected_profit: string;
    milestone_count: number;
    over_budget_count: number;
    behind_spend_count: number;
  };
  alerts: {
    over_budget_milestones: Array<{ milestone_id: number; title: string }>;
    behind_with_rising_spend: Array<{ milestone_id: number; title: string }>;
  };
  milestones: ProfitLossMilestoneRow[];
  unassigned_other_expenses: ProfitLossOtherRow[];
};

export type WorkerWageRow = {
  worker_id: number;
  worker_name: string;
  worker_email: string;
  rate_id: number | null;
  daily_wage: string;
  hourly_rate: string;
  using_default_wage: boolean;
};
