import { describe, expect, it } from "vitest";
import { calculateBalances, calculateSettlements, equalShares } from "./settlements";

describe("equalShares", () => {
  it("distributes leftover cents so shares sum to total", () => {
    const s = equalShares(1000, ["a", "b", "c"]);
    expect(Object.values(s).reduce((x, y) => x + y, 0)).toBe(1000);
    expect(s).toEqual({ a: 334, b: 333, c: 333 });
  });
});

describe("calculateBalances", () => {
  it("nets to zero", () => {
    const b = calculateBalances(["A", "B", "C"], [
      { amount: 100, paidBy: "A", splitAmong: ["A", "B", "C"] },
      { amount: 45.5, paidBy: "B", splitAmong: ["A", "C"] },
    ]);
    const sum = Object.values(b).reduce((x, y) => x + y, 0);
    expect(Math.abs(sum)).toBeLessThan(1e-9);
  });
});

describe("calculateSettlements", () => {
  it("returns nothing when there are no expenses", () => {
    expect(calculateSettlements(["A", "B"], [])).toEqual([]);
  });

  it("settles a simple shared bill", () => {
    expect(
      calculateSettlements(["A", "B"], [{ amount: 100, paidBy: "A", splitAmong: ["A", "B"] }]),
    ).toEqual([{ from: "B", to: "A", amount: 50 }]);
  });

  it("collapses a cycle into no transfers", () => {
    const s = calculateSettlements(["A", "B", "C"], [
      { amount: 10, paidBy: "A", splitAmong: ["B"] },
      { amount: 10, paidBy: "B", splitAmong: ["C"] },
      { amount: 10, paidBy: "C", splitAmong: ["A"] },
    ]);
    expect(s).toEqual([]);
  });

  it("settlements fully clear every balance with uneven splits", () => {
    const members = ["Rahul", "Priya", "Ankit", "Sneha"];
    const expenses = [
      { amount: 2400, paidBy: "Rahul", splitAmong: members },
      { amount: 999.99, paidBy: "Priya", splitAmong: ["Priya", "Ankit", "Sneha"] },
      { amount: 350, paidBy: "Ankit", splitAmong: ["Rahul", "Sneha"] },
    ];
    const balances = calculateBalances(members, expenses);
    for (const s of calculateSettlements(members, expenses)) {
      balances[s.from] += s.amount;
      balances[s.to] -= s.amount;
    }
    for (const v of Object.values(balances)) expect(Math.abs(v)).toBeLessThan(0.005);
  });
});
