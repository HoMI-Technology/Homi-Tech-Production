import type { ExpenseCategory, IncomeCategory, TransactionType } from "./types";

export const EXPENSE_CATEGORIES: {
  id: ExpenseCategory;
  label: string;
  color: string;
}[] = [
  { id: "housing", label: "Housing", color: "#22d3ee" },
  { id: "food", label: "Food", color: "#34d399" },
  { id: "transport", label: "Transport", color: "#facc15" },
  { id: "utilities", label: "Utilities", color: "#60a5fa" },
  { id: "health", label: "Health", color: "#a78bfa" },
  { id: "entertainment", label: "Entertainment", color: "#fb7185" },
  { id: "shopping", label: "Shopping", color: "#fbbf24" },
  { id: "debt", label: "Debt", color: "#f24822" },
  { id: "other", label: "Other", color: "#94a3b8" },
];

export const INCOME_CATEGORIES: {
  id: IncomeCategory;
  label: string;
  color: string;
}[] = [
  { id: "salary", label: "Salary", color: "#34d399" },
  { id: "freelance", label: "Freelance", color: "#22d3ee" },
  { id: "investments", label: "Investments", color: "#facc15" },
  { id: "other", label: "Other", color: "#94a3b8" },
];

export function categoriesFor(type: TransactionType) {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function categoryLabel(id: string): string {
  const all = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];
  return all.find((c) => c.id === id)?.label ?? id;
}

export function categoryColor(id: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.id === id)?.color ?? "#94a3b8";
}
