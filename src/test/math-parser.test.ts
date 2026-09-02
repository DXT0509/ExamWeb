import { describe, it, expect } from "vitest";
import { parseMathValue, evaluateMathAnswer } from "@/lib/exams/math-parser";

describe("Mathematical Answer Parser & Normalizer", () => {
  it("parses integers, decimals and fractions correctly", () => {
    expect(parseMathValue("5")).toBe(5);
    expect(parseMathValue("-12")).toBe(-12);
    expect(parseMathValue("0.5")).toBe(0.5);
    expect(parseMathValue("0,5")).toBe(0.5);
    expect(parseMathValue(".25")).toBe(0.25);
    expect(parseMathValue(" 1 / 2 ")).toBe(0.5);
    expect(parseMathValue("2/4")).toBe(0.5);
    expect(parseMathValue("-3/4")).toBe(-0.75);
    expect(parseMathValue("7/2")).toBe(3.5);
  });

  it("handles invalid or zero-denominator fraction strings gracefully", () => {
    expect(parseMathValue("")).toBeNull();
    expect(parseMathValue("abc")).toBeNull();
    expect(parseMathValue("1/0")).toBeNull();
    expect(parseMathValue(null)).toBeNull();
  });

  it("evaluates mathematical equality between fractions and decimals", () => {
    expect(evaluateMathAnswer("1/2", "0.5")).toBe(true);
    expect(evaluateMathAnswer("0.5", "1/2")).toBe(true);
    expect(evaluateMathAnswer("2/4", "0.50")).toBe(true);
    expect(evaluateMathAnswer("0,5", "1/2")).toBe(true);
    expect(evaluateMathAnswer("-3/4", "-0.75")).toBe(true);
    expect(evaluateMathAnswer(" -1 / 2 ", "-0.5")).toBe(true);
    expect(evaluateMathAnswer("4", "4.00")).toBe(true);
  });

  it("evaluates mathematical tolerance accurately", () => {
    expect(evaluateMathAnswer("3.14159", "3.1416", 0.0001)).toBe(true);
    expect(evaluateMathAnswer("3.14", "3.1416", 0.0001)).toBe(false);

    // User scenario: Expected 1.4142 with tolerance 0.001
    expect(evaluateMathAnswer("1.4145", "1.4142", 0.001)).toBe(true);
    expect(evaluateMathAnswer("1,4145", "1.4142", 0.001)).toBe(true);
    expect(evaluateMathAnswer("1.4132", "1.4142", 0.001)).toBe(true);
    expect(evaluateMathAnswer("1.4152", "1.4142", 0.001)).toBe(true);
    expect(evaluateMathAnswer("1.4131", "1.4142", 0.001)).toBe(false);
    expect(evaluateMathAnswer("1.4153", "1.4142", 0.001)).toBe(false);
  });

  it("supports fallback text normalization for strings", () => {
    expect(evaluateMathAnswer(" (1; 2) ", "(1;2)")).toBe(true);
    expect(evaluateMathAnswer("x = 5", "X=5")).toBe(true);
    expect(evaluateMathAnswer("x = 5", "x = 6")).toBe(false);
  });
});
