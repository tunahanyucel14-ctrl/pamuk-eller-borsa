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


export type EarlyRepaymentResult = {
  originalInterest: number;
  revisedInterest: number;
  interestSaved: number;
  revisedMonthlyPayment: number;
  totalBenefit: number;
  revisedSchedule: AmortizationRow[];
};

/** Recalculates installments after an immediate principal prepayment, keeping the remaining term. */
export function calculateEarlyRepayment(
  remainingPrincipal: number,
  annualRatePercent: number,
  remainingMonths: number,
  extraPrincipalPayment: number,
  fees = 0,
): EarlyRepaymentResult {
  assertFinitePositive(remainingPrincipal, "Remaining principal");
  if (!Number.isFinite(annualRatePercent) || annualRatePercent < 0) throw new RangeError("Annual rate must be non-negative.");
  if (!Number.isInteger(remainingMonths) || remainingMonths <= 0) throw new RangeError("Remaining months must be a positive integer.");
  if (!Number.isFinite(extraPrincipalPayment) || extraPrincipalPayment < 0 || extraPrincipalPayment >= remainingPrincipal) throw new RangeError("Extra payment must be non-negative and lower than the remaining principal.");
  if (!Number.isFinite(fees) || fees < 0) throw new RangeError("Fees must be non-negative.");
  const originalSchedule = buildAmortizationSchedule(remainingPrincipal, annualRatePercent, remainingMonths);
  const revisedPrincipal = roundMoney(remainingPrincipal - extraPrincipalPayment);
  const revisedSchedule = buildAmortizationSchedule(revisedPrincipal, annualRatePercent, remainingMonths);
  const originalInterest = roundMoney(originalSchedule.reduce((sum, row) => sum + row.interest, 0));
  const revisedInterest = roundMoney(revisedSchedule.reduce((sum, row) => sum + row.interest, 0));
  const interestSaved = roundMoney(originalInterest - revisedInterest);
  return {
    originalInterest,
    revisedInterest,
    interestSaved,
    revisedMonthlyPayment: revisedSchedule[0]?.payment ?? 0,
    totalBenefit: roundMoney(interestSaved - fees),
    revisedSchedule,
  };
}

export type RefinanceComparison = {
  currentMonthlyPayment: number;
  newMonthlyPayment: number;
  currentTotalRemaining: number;
  newTotalWithFees: number;
  monthlyDifference: number;
  totalSavings: number;
  worthwhile: boolean;
};

/** Compares refinancing against the remaining current schedule, including user-entered one-off fees. */
export function compareRefinance(
  remainingPrincipal: number,
  currentAnnualRatePercent: number,
  remainingMonths: number,
  newAnnualRatePercent: number,
  newMonths: number,
  oneOffFees = 0,
): RefinanceComparison {
  assertFinitePositive(remainingPrincipal, "Remaining principal");
  if (!Number.isFinite(currentAnnualRatePercent) || currentAnnualRatePercent < 0 || !Number.isFinite(newAnnualRatePercent) || newAnnualRatePercent < 0) {
    throw new RangeError("Interest rates must be finite and non-negative.");
  }
  if (!Number.isInteger(remainingMonths) || remainingMonths <= 0 || !Number.isInteger(newMonths) || newMonths <= 0) {
    throw new RangeError("Loan terms must be positive integers.");
  }
  if (!Number.isFinite(oneOffFees) || oneOffFees < 0) throw new RangeError("One-off fees must be non-negative.");
  const currentSchedule = buildAmortizationSchedule(remainingPrincipal, currentAnnualRatePercent, remainingMonths);
  const newSchedule = buildAmortizationSchedule(remainingPrincipal, newAnnualRatePercent, newMonths);
  const currentTotalRemaining = roundMoney(currentSchedule.reduce((sum, row) => sum + row.payment, 0));
  const newTotalWithFees = roundMoney(newSchedule.reduce((sum, row) => sum + row.payment, 0) + oneOffFees);
  const currentMonthlyPayment = currentSchedule[0]?.payment ?? 0;
  const newMonthlyPayment = newSchedule[0]?.payment ?? 0;
  const totalSavings = roundMoney(currentTotalRemaining - newTotalWithFees);
  return {
    currentMonthlyPayment,
    newMonthlyPayment,
    currentTotalRemaining,
    newTotalWithFees,
    monthlyDifference: roundMoney(currentMonthlyPayment - newMonthlyPayment),
    totalSavings,
    worthwhile: totalSavings > 0,
  };
}
