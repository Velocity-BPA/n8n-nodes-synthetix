/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Synthetix v3 Pool Configurations
 * 
 * Pools in Synthetix v3 aggregate collateral from LPs and distribute
 * it across markets. The Spartan Council Pool is the primary pool
 * managed by Synthetix governance.
 * 
 * Key Concepts:
 * - Pool ID: Unique identifier for each pool
 * - Preferred Pool: The default pool for most users
 * - Vault: Pool-collateral pair tracking delegated amounts
 */

export interface PoolConfig {
  id: number;
  name: string;
  description: string;
  isPreferred: boolean;
}

export const POOLS: Record<string, PoolConfig[]> = {
  optimism: [
    {
      id: 1,
      name: 'Spartan Council Pool',
      description: 'The primary Synthetix pool managed by the Spartan Council',
      isPreferred: true,
    },
  ],
  base: [
    {
      id: 1,
      name: 'Spartan Council Pool',
      description: 'The primary Synthetix pool on Base',
      isPreferred: true,
    },
  ],
  arbitrum: [
    {
      id: 1,
      name: 'Spartan Council Pool',
      description: 'The primary Synthetix pool on Arbitrum',
      isPreferred: true,
    },
  ],
  mainnet: [
    {
      id: 1,
      name: 'Spartan Council Pool',
      description: 'The primary Synthetix pool on Ethereum',
      isPreferred: true,
    },
  ],
};

export function getPreferredPoolId(network: string): number {
  const pools = POOLS[network] || [];
  const preferred = pools.find((p) => p.isPreferred);
  return preferred?.id || 1;
}

export function getPoolConfig(network: string, poolId: number): PoolConfig | undefined {
  const pools = POOLS[network] || [];
  return pools.find((p) => p.id === poolId);
}

export function getAllPools(network: string): PoolConfig[] {
  return POOLS[network] || [];
}

/**
 * Default pool configuration values
 */
export const POOL_DEFAULTS = {
  MIN_DELEGATION_TIME: 86400, // 24 hours in seconds
  DEFAULT_COLLATERAL_RATIO: 400, // 400% (4x)
  LIQUIDATION_RATIO: 150, // 150% (1.5x)
  ISSUANCE_RATIO: 500, // 500% (5x)
};

/**
 * Pool permission types
 */
export const POOL_PERMISSIONS = {
  ADMIN: 'ADMIN',
  WITHDRAW: 'WITHDRAW',
  DELEGATE: 'DELEGATE',
  MINT: 'MINT',
  REWARDS: 'REWARDS',
} as const;

export type PoolPermission = (typeof POOL_PERMISSIONS)[keyof typeof POOL_PERMISSIONS];
