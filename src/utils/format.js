export function formatCurrency(value, currency = "USD") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function buildRunningBalances(expenses, openingBalance) {
  let runningBalance = Number(openingBalance || 0);

  return expenses.map((expense) => {
    runningBalance -= Number(expense.amount || 0);
    return {
      ...expense,
      runningBalance,
    };
  });
}
