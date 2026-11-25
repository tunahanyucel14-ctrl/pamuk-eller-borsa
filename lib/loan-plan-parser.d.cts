export type LoanInstallment = {
  installment_no: number; due_date: string; installment_amount: number;
  principal_amount: number | null; interest_amount: number | null;
  fees_amount: number | null; remaining_principal: number | null;
};
export type NormalizedLoanPlan = {
  bank_name: string | null; loan_type: "konut" | "ihtiyac" | "tasit" | "ticari" | "diger";
  currency: string; principal_amount: number | null; remaining_amount: number | null; annual_interest_rate: number | null;
  monthly_interest_rate: number | null; installment_count: number; first_due_date: string;
  schedule: LoanInstallment[]; warnings: string[]; skipped_rows: number;
};
export function validDate(value: unknown): value is string;
export function normalizeLoanPlan(input: unknown): NormalizedLoanPlan;
