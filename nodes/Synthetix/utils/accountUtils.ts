/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Account Utilities for Synthetix v3
 * 
 * Synthetix v3 uses NFT-based accounts. Each account is represented by
 * an ERC-721 token that can be transferred between addresses. This allows
 * for flexible account management and permission delegation.
 * 
 * Key Concepts:
 * - Account ID: Unique uint128 identifier for the account NFT
 * - Account Owner: Address that owns the account NFT
 * - Permissions: Granular access control for account operations
 */

/**
 * Permission types in Synthetix v3 accounts
 */
export const ACCOUNT_PERMISSIONS = {
  ADMIN: 'ADMIN', // Full control over the account
  WITHDRAW: 'WITHDRAW', // Can withdraw collateral
  DELEGATE: 'DELEGATE', // Can delegate collateral to pools
  MINT: 'MINT', // Can mint snxUSD against collateral
  REWARDS: 'REWARDS', // Can claim rewards
  PERPS_MODIFY_COLLATERAL: 'PERPS_MODIFY_COLLATERAL', // Can modify perps collateral
  PERPS_COMMIT_ASYNC_ORDER: 'PERPS_COMMIT_ASYNC_ORDER', // Can commit perps orders
} as const;

export type AccountPermission = (typeof ACCOUNT_PERMISSIONS)[keyof typeof ACCOUNT_PERMISSIONS];

/**
 * Validate account ID format
 * @param accountId - Account ID to validate
 * @returns True if valid
 */
export function isValidAccountId(accountId: string | number | bigint): boolean {
  try {
    const id = BigInt(accountId);
    return id > BigInt(0);
  } catch {
    return false;
  }
}

/**
 * Format account ID for display
 * @param accountId - Account ID
 * @returns Formatted string
 */
export function formatAccountId(accountId: string | number | bigint): string {
  return BigInt(accountId).toString();
}

/**
 * Validate Ethereum address format
 * @param address - Address to validate
 * @returns True if valid
 */
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Format address for display (truncated)
 * @param address - Full address
 * @param startChars - Number of characters at start (default: 6)
 * @param endChars - Number of characters at end (default: 4)
 * @returns Truncated address
 */
export function formatAddress(address: string, startChars: number = 6, endChars: number = 4): string {
  if (!isValidAddress(address)) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Checksum an Ethereum address
 * @param address - Address to checksum
 * @returns Checksummed address
 */
export function checksumAddress(address: string): string {
  // Simple lowercase for now - proper checksum requires keccak256
  return address.toLowerCase();
}

/**
 * Compare two addresses (case-insensitive)
 * @param a - First address
 * @param b - Second address
 * @returns True if equal
 */
export function addressesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Permission bitmask utilities
 * Synthetix uses bytes32 for permission identifiers
 */
export function getPermissionBytes32(permission: AccountPermission): string {
  // Convert permission string to bytes32
  const encoder = new TextEncoder();
  const bytes = encoder.encode(permission);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return '0x' + hex.padEnd(64, '0');
}

/**
 * Account statistics interface
 */
export interface AccountStats {
  accountId: string;
  owner: string;
  totalCollateralValue: string;
  totalDebt: string;
  cRatio: number;
  delegatedPools: number;
  permissions: AccountPermission[];
}

/**
 * Create empty account stats
 * @param accountId - Account ID
 * @param owner - Owner address
 * @returns Empty account stats
 */
export function createEmptyAccountStats(accountId: string, owner: string): AccountStats {
  return {
    accountId,
    owner,
    totalCollateralValue: '0',
    totalDebt: '0',
    cRatio: Infinity,
    delegatedPools: 0,
    permissions: [ACCOUNT_PERMISSIONS.ADMIN],
  };
}

/**
 * Account position interface
 */
export interface AccountPosition {
  poolId: number;
  collateralType: string;
  collateralAmount: string;
  collateralValue: string;
  debt: string;
  cRatio: number;
}

/**
 * Check if account has sufficient permissions
 * @param requiredPermissions - Permissions required for the operation
 * @param accountPermissions - Permissions the account has
 * @returns True if all required permissions are present
 */
export function hasPermissions(
  requiredPermissions: AccountPermission[],
  accountPermissions: AccountPermission[],
): boolean {
  // ADMIN permission grants all permissions
  if (accountPermissions.includes(ACCOUNT_PERMISSIONS.ADMIN)) {
    return true;
  }
  return requiredPermissions.every((perm) => accountPermissions.includes(perm));
}

/**
 * Generate a random account ID for testing
 * @returns Random account ID
 */
export function generateRandomAccountId(): string {
  return Math.floor(Math.random() * 1000000000).toString();
}
