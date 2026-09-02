/**
 * Mathematical Answer Parser & Normalizer
 *
 * Supports:
 * - Integers (e.g. 5, -2, 0)
 * - Decimals (e.g. 0.5, 0.50, -0.75, .5, comma/dot separators)
 * - Fractions (e.g. 1/2, 2/4, -3/4, 7/3)
 * - Whitespace trimming (e.g. " 1 / 2 ")
 * - Optional tolerance for floating-point comparison
 */

/**
 * Parses a mathematical string (fraction, integer, or decimal) into a numeric float.
 * Returns null if the string cannot be parsed as a valid finite number.
 */
export function parseMathValue(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s+/g, "").replace(/,/g, ".");

  if (cleaned.length === 0) return null;

  // Check fraction format: e.g. 1/2 or -3/4 or 5/-2
  const fractionMatch = cleaned.match(/^(-?\d+)\/(-?\d+)$/);
  if (fractionMatch) {
    const num = Number(fractionMatch[1]);
    const denom = Number(fractionMatch[2]);
    if (denom === 0 || isNaN(num) || isNaN(denom)) return null;
    return num / denom;
  }

  // Check standard number: e.g. 0.5, -12, .25
  const num = Number(cleaned);
  if (!isNaN(num) && isFinite(num)) {
    return num;
  }

  return null;
}

/**
 * Evaluates whether a student's input matches the expected answer.
 * Uses numerical/fraction equivalence when both can be parsed as numbers,
 * with optional tolerance.
 * Falls back to normalized string equality for text-based answers.
 */
export function evaluateMathAnswer(
  studentInput: string | null | undefined,
  expectedAnswer: string | null | undefined,
  tolerance: number = 0
): boolean {
  if (!studentInput || !expectedAnswer) return false;

  const sTrim = studentInput.trim();
  const eTrim = expectedAnswer.trim();

  if (!sTrim || !eTrim) return false;

  // Direct case-insensitive string equality
  if (sTrim.toLowerCase() === eTrim.toLowerCase()) {
    return true;
  }

  const sVal = parseMathValue(sTrim);
  const eVal = parseMathValue(eTrim);

  // If both are numbers/fractions, compare mathematically
  if (sVal !== null && eVal !== null) {
    const effectiveTolerance = Math.max(tolerance, 1e-6);
    return Math.abs(sVal - eVal) <= effectiveTolerance + 1e-8;
  }

  // Fallback: Normalized string comparison (strip spaces, lowercase)
  const normS = sTrim.toLowerCase().replace(/\s+/g, "");
  const normE = eTrim.toLowerCase().replace(/\s+/g, "");
  return normS === normE;
}
