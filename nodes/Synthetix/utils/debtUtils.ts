/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Debt Utilities for Synthetix v3
 * 
 * Synthetix v3 uses a debt share system where LPs share in the protocol's
 * total debt proportionally. When markets make profits/losses, all LPs
 * share in those gains/losses based on their debt share percentage.
 * 
 * Key Concepts:
 * - Debt Shares: Proportional ownership of pool debt
 * - Reported Debt: Debt reported by markets to pools
 * - Net Issuance: Difference between minted and burned snxUSD
 */

import { fromWei, toWei } from './weiUtils';

/**
 * Debt distribution interface
 */
export interface DebtDistribution {
  poolId: number;
  marketId: number;
  maxDebtShareValue: string;
  debtShareValue: string;
}

/**
 * Calculate account's debt based on debt shares
 * @param accountShares - Account's debt shares (wei)
 * @param totalShares - Total pool shares (wei)
 * @param totalDebt - Total pool debt (wei)
 * @returns Account's debt (wei)
 */
export function calculateAccountDebt(
  accountShares: bigint,
  totalShares: bigint,
  totalDebt: bigint,
): bigint {
  if (totalShares === BigInt(0)) return BigInt(0);
  return (accountShares * totalDebt) / totalShares;
}

/**
 * Calculate debt share percentage
 * @param accountShares - Account's debt shares (wei)
 * @param totalShares - Total pool shares (wei)
 * @returns Percentage (0-100)
 */
export function calculateDebtSharePercentage(accountShares: bigint, totalShares: bigint): number {
  if (totalShares === BigInt(0)) return 0;
  return (Number(accountShares) / Number(totalShares)) * 100;
}

/**
 * Calculate net position PnL
 * @param currentDebt - Current debt (wei)
 * @param initialDebt - Initial debt (wei)
 * @returns PnL (positive = profit, negative = loss)
 */
export function calculateNetPnL(currentDebt: bigint, initialDebt: bigint): bigint {
  // In Synthetix, lower debt = profit (you owe less)
  return initialDebt - currentDebt;
}

/**
 * Format debt for display
 * @param debt - Debt in wei
 * @param decimals - Display decimals (default: 2)
 * @returns Formatted string with $ prefix
 */
export function formatDebt(debt: bigint | string, decimals: number = 2): string {
  const value = Number(fromWei(BigInt(debt), 18));
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Debt pool interface
 */
export interface DebtPoolInfo {
  poolId: number;
  totalDebt: string;
  totalShares: string;
  accountShares: string;
  accountDebt: string;
  debtSharePercentage: number;
}

/**
 * Create debt pool info
 * @param poolId - Pool ID
 * @param totalDebt - Total pool debt
 * @param totalShares - Total pool shares
 * @param accountShares - Account's shares
 * @returns Debt pool info
 */
export function createDebtPoolInfo(
  poolId: number,
  totalDebt: string,
  totalShares: string,
  accountShares: string,
): DebtPoolInfo {
  const totalDebtBigInt = BigInt(totalDebt);
  const totalSharesBigInt = BigInt(totalShares);
  const accountSharesBigInt = BigInt(accountShares);
  
  const accountDebt = calculateAccountDebt(accountSharesBigInt, totalSharesBigInt, totalDebtBigInt);
  const debtSharePercentage = calculateDebtSharePercentage(accountSharesBigInt, totalSharesBigInt);
  
  return {
    poolId,
    totalDebt,
    totalShares,
    accountShares,
    accountDebt: accountDebt.toString(),
    debtSharePercentage,
  };
}

/**
 * Market debt contribution interface
 */
export interface MarketDebtContribution {
  marketId: number;
  marketName: string;
  reportedDebt: string;
  creditCapacity: string;
  utilizationRate: number;
}

/**
 * Calculate market utilization rate
 * @param reportedDebt - Market's reported debt (wei)
 * @param creditCapacity - Market's credit capacity (wei)
 * @returns Utilization rate (0-100)
 */
export function calculateMarketUtilization(reportedDebt: bigint, creditCapacity: bigint): number {
  if (creditCapacity === BigInt(0)) return 0;
  return (Number(reportedDebt) / Number(creditCapacity)) * 100;
}

/**
 * Check if market is at capacity
 * @param reportedDebt - Market's reported debt (wei)
 * @param creditCapacity - Market's credit capacity (wei)
 * @returns True if at or over capacity
 */
export function isMarketAtCapacity(reportedDebt: bigint, creditCapacity: bigint): boolean {
  return reportedDebt >= creditCapacity;
}

/**
 * Calculate remaining capacity
 * @param reportedDebt - Market's reported debt (wei)
 * @param creditCapacity - Market's credit capacity (wei)
 * @returns Remaining capacity (wei)
 */
export function calculateRemainingCapacity(reportedDebt: bigint, creditCapacity: bigint): bigint {
  if (reportedDebt >= creditCapacity) return BigInt(0);
  return creditCapacity - reportedDebt;
}

/**
 * Debt change event interface
 */
export interface DebtChangeEvent {
  timestamp: number;
  previousDebt: string;
  newDebt: string;
  change: string;
  changePercentage: number;
  reason: string;
}

/**
 * Create debt change event
 * @param previousDebt - Previous debt (wei)
 * @param newDebt - New debt (wei)
 * @param reason - Reason for change
 * @returns Debt change event
 */
export function createDebtChangeEvent(
  previousDebt: string,
  newDebt: string,
  reason: string,
): DebtChangeEvent {
  const prev = BigInt(previousDebt);
  const next = BigInt(newDebt);
  const change = next - prev;
  
  let changePercentage = 0;
  if (prev !== BigInt(0)) {
    changePercentage = (Number(change) / Number(prev)) * 100;
  }
  
  return {
    timestamp: Date.now(),
    previousDebt,
    newDebt,
    change: change.toString(),
    changePercentage,
    reason,
  };
}
