export type AmortizationRow = {
  period: number;
  openingBalance: number;
  payment: number;
  interest: number;
  principal: number;
  closingBalance: number;
};

function assertFinitePositive(value: number, name: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite number greater than zero.`);
  }
}

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) throw new RangeError("Money value must be finite.");
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateNetWorth(assets: number[], liabilities: number[]): number {
  const sum = (values: number[]) => values.reduce((total, value) => {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("Asset and liability values must be finite and non-negative.");
    }
    return total + value;
  }, 0);
  return roundMoney(sum(assets) - sum(liabilities));
}

/** Calculates a fixed monthly installment from an annual nominal interest rate in percent. */
export function calculateMonthlyPayment(
  principal: number,
  annualRatePercent: number,
  months: number,
): number {
  assertFinitePositive(principal, "Principal");
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) {
    throw new RangeError("Annual interest rate must be finite and non-negative.");
  }
  if (!Number.isInteger(months) || months <= 0) {
    throw new RangeError("Months must be a positive integer.");
  }
  const monthlyRate = annualRatePercent / 100 / 12;
  if (monthlyRate === 0) return roundMoney(principal / months);
  const factor = Math.pow(1 + monthlyRate, months);
  return roundMoney(principal * monthlyRate * factor / (factor - 1));
}

/** Builds a rounded monthly schedule; the final installment is adjusted to clear rounding residue. */
export function buildAmortizationSchedule(
  principal: number,
  annualRatePercent: number,
  months: number,
): AmortizationRow[] {
  const regularPayment = calculateMonthlyPayment(principal, annualRatePercent, months);
  const monthlyRate = annualRatePercent / 100 / 12;
  let balance = roundMoney(principal);
  const rows: AmortizationRow[] = [];

  for (let period = 1; period <= months && balance > 0; period += 1) {
    const openingBalance = balance;
    const interest = roundMoney(openingBalance * monthlyRate);
    const payment = period === months
      ? roundMoney(openingBalance + interest)
      : roundMoney(Math.min(regularPayment, openingBalance + interest));
    const principalPaid = roundMoney(Math.min(openingBalance, payment - interest));
    balance = roundMoney(Math.max(0, openingBalance - principalPaid));
    rows.push({
      period,
      openingBalance,
      payment,
      interest,
      principal: principalPaid,
      closingBalance: balance,
    });
  }
  return rows;
}

/** Returns the debt-payment share of monthly income as a percentage, or null for invalid income. */
export function calculateDebtToIncomeRatio(
  monthlyDebtPayments: number,
  monthlyIncome: number,
): number | null {
  if (!Number.isFinite(monthlyDebtPayments) || monthlyDebtPayments < 0) {
    throw new RangeError("Debt payments must be finite and non-negative.");
  }
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) return null;
  return roundMoney((monthlyDebtPayments / monthlyIncome) * 100);
}


export type DebtPayoffInput = {
  id: string;
  name: string;
  balance: number;
  monthlyPayment: number;
  annualRatePercent: number;
};
export type DebtPayoffStrategy = "avalanche" | "snowball";
export type DebtPayoffResult = { months: number; interest: number; paid: number; stuck: boolean; strategy: DebtPayoffStrategy };

/** Simulates a fixed monthly debt budget, rolling freed minimum payments into the next target debt. */
export function simulateDebtPayoff(
  debts: DebtPayoffInput[],
  extraMonthlyBudget = 0,
  strategy: DebtPayoffStrategy = "avalanche",
  maxMonths = 600,
): DebtPayoffResult {
  if (!Number.isFinite(extraMonthlyBudget) || extraMonthlyBudget < 0) throw new RangeError("Extra monthly budget must be finite and non-negative.");
  if (!Number.isInteger(maxMonths) || maxMonths <= 0) throw new RangeError("Maximum months must be a positive integer.");
  if (strategy !== "avalanche" && strategy !== "snowball") throw new RangeError("Unknown debt payoff strategy.");

  const balances = debts.map((debt) => {
    for (const [value, name] of [[debt.balance, "Balance"], [debt.monthlyPayment, "Monthly payment"], [debt.annualRatePercent, "Annual rate"]] as const) {
      if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be finite and non-negative.`);
    }
    return { id: debt.id, balance: roundMoney(debt.balance), monthlyPayment: roundMoney(debt.monthlyPayment), annualRatePercent: debt.annualRatePercent };
  }).filter((debt) => debt.balance > 0);

  const minimums = roundMoney(balances.reduce((sum, debt) => sum + debt.monthlyPayment, 0));
  const monthlyBudget = roundMoney(minimums + extraMonthlyBudget);
  const result = (months: number, interest: number, paid: number, stuck: boolean): DebtPayoffResult => ({
    months, interest: roundMoney(interest), paid: roundMoney(paid), stuck, strategy,
  });
  if (!balances.length) return result(0, 0, 0, false);
  if (monthlyBudget <= 0) return result(0, 0, 0, true);

  let interestTotal = 0;
  let paidTotal = 0;
  for (let month = 1; month <= maxMonths; month += 1) {
    for (const debt of balances) {
      if (debt.balance <= 0) continue;
      const interest = roundMoney(debt.balance * debt.annualRatePercent / 1200);
      debt.balance = roundMoney(debt.balance + interest);
      interestTotal = roundMoney(interestTotal + interest);
    }
    let spent = 0;
    for (const debt of balances) {
      if (debt.balance <= 0 || debt.monthlyPayment <= 0) continue;
      const payment = roundMoney(Math.min(debt.balance, debt.monthlyPayment));
      debt.balance = roundMoney(Math.max(0, debt.balance - payment));
      spent = roundMoney(spent + payment);
      paidTotal = roundMoney(paidTotal + payment);
    }
    let remainingBudget = roundMoney(Math.max(0, monthlyBudget - spent));
    const priority = [...balances].sort((a, b) => strategy === "snowball"
      ? a.balance - b.balance || a.annualRatePercent - b.annualRatePercent
      : b.annualRatePercent - a.annualRatePercent || a.balance - b.balance);
    for (const debt of priority) {
      if (remainingBudget <= 0) break;
      if (debt.balance <= 0) continue;
      const payment = roundMoney(Math.min(debt.balance, remainingBudget));
      debt.balance = roundMoney(Math.max(0, debt.balance - payment));
      remainingBudget = roundMoney(Math.max(0, remainingBudget - payment));
      paidTotal = roundMoney(paidTotal + payment);
    }
    if (balances.every((debt) => debt.balance <= 0)) return result(month, interestTotal, paidTotal, false);
  }
  return result(maxMonths, interestTotal, paidTotal, true);
}
