/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Wei Utilities for Synthetix v3
 * 
 * Blockchain values are typically stored as integers with implicit decimals.
 * Wei is the smallest unit of Ether (10^-18 ETH). Most Synthetix values
 * use 18 decimals, but some tokens (like USDC) use 6 decimals.
 * 
 * These utilities help convert between human-readable values and
 * blockchain-native integer representations.
 */

/**
 * Convert a human-readable value to wei (integer representation)
 * @param value - Human-readable value (e.g., "1.5")
 * @param decimals - Number of decimals (default: 18)
 * @returns BigInt representation
 */
export function toWei(value: string | number, decimals: number = 18): bigint {
  const stringValue = value.toString();
  const [whole, fraction = ''] = stringValue.split('.');
  
  // Pad or truncate the fraction to match decimals
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  
  // Combine whole and fraction parts
  const weiString = whole + paddedFraction;
  
  return BigInt(weiString);
}

/**
 * Convert wei (integer representation) to human-readable value
 * @param wei - BigInt or string wei value
 * @param decimals - Number of decimals (default: 18)
 * @returns Human-readable string
 */
export function fromWei(wei: bigint | string, decimals: number = 18): string {
  const weiString = wei.toString().padStart(decimals + 1, '0');
  const wholeLength = weiString.length - decimals;
  const whole = weiString.slice(0, wholeLength) || '0';
  const fraction = weiString.slice(wholeLength);
  
  // Remove trailing zeros from fraction
  const trimmedFraction = fraction.replace(/0+$/, '');
  
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

/**
 * Format a wei value to a fixed number of decimal places
 * @param wei - BigInt or string wei value
 * @param decimals - Token decimals (default: 18)
 * @param displayDecimals - Number of decimals to display (default: 4)
 * @returns Formatted string
 */
export function formatWei(
  wei: bigint | string,
  decimals: number = 18,
  displayDecimals: number = 4,
): string {
  const value = fromWei(wei, decimals);
  const [whole, fraction = ''] = value.split('.');
  const trimmedFraction = fraction.slice(0, displayDecimals).padEnd(displayDecimals, '0');
  return `${whole}.${trimmedFraction}`;
}

/**
 * Parse a human-readable value to wei string
 * @param value - Human-readable value
 * @param decimals - Number of decimals (default: 18)
 * @returns Wei string
 */
export function parseUnits(value: string | number, decimals: number = 18): string {
  return toWei(value, decimals).toString();
}

/**
 * Format a wei string to human-readable value
 * @param wei - Wei string
 * @param decimals - Number of decimals (default: 18)
 * @returns Human-readable string
 */
export function formatUnits(wei: string, decimals: number = 18): string {
  return fromWei(BigInt(wei), decimals);
}

/**
 * Multiply two wei values (result has 18 decimals)
 * @param a - First wei value
 * @param b - Second wei value
 * @returns Product with 18 decimals
 */
export function mulWei(a: bigint, b: bigint): bigint {
  return (a * b) / BigInt(10 ** 18);
}

/**
 * Divide two wei values (result has 18 decimals)
 * @param a - Dividend wei value
 * @param b - Divisor wei value
 * @returns Quotient with 18 decimals
 */
export function divWei(a: bigint, b: bigint): bigint {
  return (a * BigInt(10 ** 18)) / b;
}

/**
 * Calculate percentage of a wei value
 * @param wei - Wei value
 * @param percentage - Percentage (e.g., 150 for 150%)
 * @returns Percentage of wei value
 */
export function percentageWei(wei: bigint, percentage: number): bigint {
  return (wei * BigInt(Math.floor(percentage * 100))) / BigInt(10000);
}

/**
 * Compare two wei values
 * @param a - First wei value
 * @param b - Second wei value
 * @returns -1 if a < b, 0 if a == b, 1 if a > b
 */
export function compareWei(a: bigint, b: bigint): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Check if a wei value is zero
 * @param wei - Wei value
 * @returns True if zero
 */
export function isZeroWei(wei: bigint | string): boolean {
  return BigInt(wei) === BigInt(0);
}

/**
 * Get the maximum of two wei values
 * @param a - First wei value
 * @param b - Second wei value
 * @returns Maximum value
 */
export function maxWei(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/**
 * Get the minimum of two wei values
 * @param a - First wei value
 * @param b - Second wei value
 * @returns Minimum value
 */
export function minWei(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/**
 * Convert between different decimal representations
 * @param value - Value to convert
 * @param fromDecimals - Source decimals
 * @param toDecimals - Target decimals
 * @returns Converted value
 */
export function convertDecimals(value: bigint, fromDecimals: number, toDecimals: number): bigint {
  if (fromDecimals === toDecimals) return value;
  if (fromDecimals > toDecimals) {
    return value / BigInt(10 ** (fromDecimals - toDecimals));
  }
  return value * BigInt(10 ** (toDecimals - fromDecimals));
}
