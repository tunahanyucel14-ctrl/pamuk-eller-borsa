export type FinanceAccount = { id: string; family_id?: string; currency?: string; opening_balance: number; [key: string]: unknown };
export type FinanceTransaction = { account_id: string; to_account_id?: string | null; family_id?: string; kind: "gelir" | "gider" | "transfer"; amount: number };
export type FinanceDebt = { name?: string; remaining_amount: number; monthly_payment?: number; annual_interest_rate?: number };
export function calculateAccountBalances(accounts: FinanceAccount[], transactions: FinanceTransaction[]): Array<FinanceAccount & { currency: string; balance: number }>;
export function calculateCashFlow(accounts: FinanceAccount[], transactions: FinanceTransaction[]): Record<string, { income: number; expense: number; net: number }>;
export function calculateMonthlyInterest(balance: number, annualRatePercent: number): number;
export function calculateNetWorth(input?: { accountBalances?: Array<{ currency: string; balance: number }>; assets?: Array<{ currency: string; market_value: number }>; debts?: Array<{ currency: string; remaining_amount: number }> }): Record<string, { cash: number; assets: number; liabilities: number; netWorth: number }>;
export function simulateDebtPayoff(debts: FinanceDebt[], extraMonthlyPayment?: number, maxMonths?: number): { months: number; interest: number; paid: number; stuck: boolean; remaining: Array<{ name: string; balance: number }> };
