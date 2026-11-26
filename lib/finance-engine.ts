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
    const payment = roundMoney(Math.min(regularPayment, openingBalance + interest));
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
