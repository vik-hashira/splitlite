export type ExpenseCategory = "food" | "travel" | "stay" | "drinks" | "tickets" | "general";

export interface Group {
  id: string;
  title: string;
  currency: string;
  pinHash: string | null;
  members: string[];
  createdAt: number;
  updatedAt: number;
  expireAt?: { toMillis(): number };
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paidBy: string;
  splitAmong: string[];
  splitType: "EQUAL";
  createdAt: number;
  createdByName: string;
}

export type ExpenseInput = Omit<Expense, "id">;
