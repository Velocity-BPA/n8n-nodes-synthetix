/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Ratio Utilities for Synthetix v3
 * 
 * Synthetix v3 uses several important ratios:
 * - C-Ratio (Collateralization Ratio): Total collateral value / Total debt
 * - Liquidation Ratio: Minimum C-ratio before liquidation
 * - Issuance Ratio: Target C-ratio for minting snxUSD
 * 
 * Ratios are typically expressed as percentages (e.g., 400% = 4x collateralization)
 */

import { toWei, fromWei, divWei } from './weiUtils';

/**
 * Calculate collateralization ratio
 * @param collateralValue - Total collateral value in USD (wei)
 * @param debt - Total debt in USD (wei)
 * @returns C-ratio as percentage (e.g., 400 for 400%)
 */
export function calculateCRatio(collateralValue: bigint, debt: bigint): number {
  if (debt === BigInt(0)) {
    return Infinity;
  }
  const ratio = divWei(collateralValue, debt);
  return Number(fromWei(ratio, 18)) * 100;
}

/**
 * Calculate required collateral for a given debt and target C-ratio
 * @param debt - Target debt amount in USD (wei)
 * @param targetCRatio - Target C-ratio percentage (e.g., 400 for 400%)
 * @returns Required collateral value in USD (wei)
 */
export function calculateRequiredCollateral(debt: bigint, targetCRatio: number): bigint {
  const ratioWei = toWei(targetCRatio / 100, 18);
  return (debt * ratioWei) / BigInt(10 ** 18);
}

/**
 * Calculate maximum mintable debt for given collateral and target C-ratio
 * @param collateralValue - Total collateral value in USD (wei)
 * @param targetCRatio - Target C-ratio percentage (e.g., 400 for 400%)
 * @returns Maximum mintable debt in USD (wei)
 */
export function calculateMaxMintableDebt(collateralValue: bigint, targetCRatio: number): bigint {
  if (targetCRatio <= 0) return BigInt(0);
  const ratioWei = toWei(targetCRatio / 100, 18);
  return (collateralValue * BigInt(10 ** 18)) / ratioWei;
}

/**
 * Calculate available margin (distance to liquidation)
 * @param collateralValue - Total collateral value in USD (wei)
 * @param debt - Total debt in USD (wei)
 * @param liquidationRatio - Liquidation C-ratio percentage (e.g., 150 for 150%)
 * @returns Available margin in USD (wei)
 */
export function calculateAvailableMargin(
  collateralValue: bigint,
  debt: bigint,
  liquidationRatio: number,
): bigint {
  const minCollateral = calculateRequiredCollateral(debt, liquidationRatio);
  if (collateralValue <= minCollateral) return BigInt(0);
  return collateralValue - minCollateral;
}

/**
 * Check if an account is liquidatable
 * @param collateralValue - Total collateral value in USD (wei)
 * @param debt - Total debt in USD (wei)
 * @param liquidationRatio - Liquidation C-ratio percentage (e.g., 150 for 150%)
 * @returns True if liquidatable
 */
export function isLiquidatable(
  collateralValue: bigint,
  debt: bigint,
  liquidationRatio: number,
): boolean {
  if (debt === BigInt(0)) return false;
  const cRatio = calculateCRatio(collateralValue, debt);
  return cRatio < liquidationRatio;
}

/**
 * Calculate the distance to liquidation as a percentage
 * @param currentCRatio - Current C-ratio percentage
 * @param liquidationRatio - Liquidation C-ratio percentage
 * @returns Percentage above liquidation (negative if below)
 */
export function distanceToLiquidation(currentCRatio: number, liquidationRatio: number): number {
  return currentCRatio - liquidationRatio;
}

/**
 * Calculate debt share from proportional debt
 * @param accountDebt - Account's debt (wei)
 * @param totalDebt - Total pool debt (wei)
 * @param totalShares - Total debt shares (wei)
 * @returns Account's debt shares (wei)
 */
export function calculateDebtShares(
  accountDebt: bigint,
  totalDebt: bigint,
  totalShares: bigint,
): bigint {
  if (totalDebt === BigInt(0)) return BigInt(0);
  return (accountDebt * totalShares) / totalDebt;
}

/**
 * Calculate debt from debt shares
 * @param shares - Account's debt shares (wei)
 * @param totalDebt - Total pool debt (wei)
 * @param totalShares - Total debt shares (wei)
 * @returns Account's debt (wei)
 */
export function calculateDebtFromShares(
  shares: bigint,
  totalDebt: bigint,
  totalShares: bigint,
): bigint {
  if (totalShares === BigInt(0)) return BigInt(0);
  return (shares * totalDebt) / totalShares;
}

/**
 * Calculate liquidation reward
 * @param debt - Debt being liquidated (wei)
 * @param liquidationPenalty - Penalty percentage (e.g., 10 for 10%)
 * @returns Liquidation reward (wei)
 */
export function calculateLiquidationReward(debt: bigint, liquidationPenalty: number): bigint {
  return (debt * BigInt(Math.floor(liquidationPenalty * 100))) / BigInt(10000);
}

/**
 * Calculate APY from reward rate
 * @param rewardRate - Rewards per second (wei)
 * @param totalStaked - Total staked amount (wei)
 * @param rewardPrice - Reward token price in USD
 * @param stakedPrice - Staked token price in USD
 * @returns APY as percentage
 */
export function calculateAPY(
  rewardRate: bigint,
  totalStaked: bigint,
  rewardPrice: number,
  stakedPrice: number,
): number {
  if (totalStaked === BigInt(0)) return 0;
  
  const secondsPerYear = 365 * 24 * 60 * 60;
  const yearlyRewards = rewardRate * BigInt(secondsPerYear);
  
  const yearlyRewardsUsd = Number(fromWei(yearlyRewards, 18)) * rewardPrice;
  const totalStakedUsd = Number(fromWei(totalStaked, 18)) * stakedPrice;
  
  if (totalStakedUsd === 0) return 0;
  
  return (yearlyRewardsUsd / totalStakedUsd) * 100;
}

/**
 * Format C-ratio for display
 * @param cRatio - C-ratio percentage
 * @returns Formatted string (e.g., "400.00%")
 */
export function formatCRatio(cRatio: number): string {
  if (!isFinite(cRatio)) return '∞';
  return `${cRatio.toFixed(2)}%`;
}

/**
 * Health factor calculation (1.0 = at liquidation threshold)
 * @param currentCRatio - Current C-ratio percentage
 * @param liquidationRatio - Liquidation C-ratio percentage
 * @returns Health factor (> 1 is healthy)
 */
export function calculateHealthFactor(currentCRatio: number, liquidationRatio: number): number {
  if (liquidationRatio === 0) return Infinity;
  return currentCRatio / liquidationRatio;
}
