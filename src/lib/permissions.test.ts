import { describe, expect, it } from "vitest";
import { canDeleteGroup, canEditExpense } from "./permissions";
import type { Expense, Group } from "./types";

const group = (creatorName?: string): Group => ({
  id: "g", title: "Trip", currency: "INR", pinHash: null, members: ["Vikram", "Jaya", "Teju"],
  createdAt: 0, updatedAt: 0, creatorName,
});
const expense = (createdByName: string) => ({ createdByName }) as Expense;

describe("canEditExpense", () => {
  it("lets the adder and the admin edit, nobody else", () => {
    const g = group("Vikram");
    expect(canEditExpense(expense("Jaya"), g, "Jaya")).toBe(true);
    expect(canEditExpense(expense("Jaya"), g, "Vikram")).toBe(true);
    expect(canEditExpense(expense("Jaya"), g, "Teju")).toBe(false);
    expect(canEditExpense(expense("Jaya"), g, null)).toBe(false);
  });

  it("gives non-member expenses (imports) to the admin", () => {
    expect(canEditExpense(expense("Splitwise import"), group("Vikram"), "Vikram")).toBe(true);
    expect(canEditExpense(expense("Splitwise import"), group("Vikram"), "Teju")).toBe(false);
  });

  it("leaves non-member expenses open in groups without an admin", () => {
    expect(canEditExpense(expense("Splitwise import"), group(), "Teju")).toBe(true);
    expect(canEditExpense(expense("Jaya"), group(), "Teju")).toBe(false);
  });
});

describe("canDeleteGroup", () => {
  it("is admin-only when there is an admin", () => {
    expect(canDeleteGroup(group("Vikram"), "Vikram")).toBe(true);
    expect(canDeleteGroup(group("Vikram"), "Jaya")).toBe(false);
  });

  it("is open to any member in groups without an admin", () => {
    expect(canDeleteGroup(group(), "Jaya")).toBe(true);
    expect(canDeleteGroup(group(), null)).toBe(false);
  });
});
