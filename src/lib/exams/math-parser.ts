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
 * Per admin requirement: 100% exact string match between student answer and standard answer.
 */
export function evaluateMathAnswer(
  studentInput: string | null | undefined,
  expectedAnswer: string | null | undefined,
  _tolerance: number = 0
): boolean {
  if (!studentInput || !expectedAnswer) return false;

  const sTrim = studentInput.trim();
  const eTrim = expectedAnswer.trim();

  if (!sTrim || !eTrim) return false;

  // Exact 100% string match
  return sTrim === eTrim;
}
