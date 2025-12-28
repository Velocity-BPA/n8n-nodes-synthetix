/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Synthetix v3 Oracle Configurations
 * 
 * Synthetix v3 uses the Oracle Manager to handle price feeds.
 * Oracle nodes are identified by unique node IDs and can be composed
 * to create complex pricing logic.
 * 
 * Key Concepts:
 * - Node ID: Unique bytes32 identifier for each oracle node
 * - Oracle Type: Type of price source (Chainlink, Pyth, Uniswap, etc.)
 * - Staleness: Maximum age of price data before considered stale
 */

export interface OracleNodeConfig {
  nodeId: string;
  name: string;
  asset: string;
  oracleType: string;
  description: string;
}

export const ORACLE_NODES: Record<string, OracleNodeConfig[]> = {
  optimism: [
    {
      nodeId: '0x',
      name: 'ETH/USD',
      asset: 'ETH',
      oracleType: 'chainlink',
      description: 'Ethereum price feed',
    },
    {
      nodeId: '0x',
      name: 'BTC/USD',
      asset: 'BTC',
      oracleType: 'chainlink',
      description: 'Bitcoin price feed',
    },
    {
      nodeId: '0x',
      name: 'SNX/USD',
      asset: 'SNX',
      oracleType: 'chainlink',
      description: 'Synthetix token price feed',
    },
  ],
  base: [
    {
      nodeId: '0x',
      name: 'ETH/USD',
      asset: 'ETH',
      oracleType: 'chainlink',
      description: 'Ethereum price feed',
    },
    {
      nodeId: '0x',
      name: 'BTC/USD',
      asset: 'BTC',
      oracleType: 'chainlink',
      description: 'Bitcoin price feed',
    },
  ],
  arbitrum: [
    {
      nodeId: '0x',
      name: 'ETH/USD',
      asset: 'ETH',
      oracleType: 'chainlink',
      description: 'Ethereum price feed',
    },
    {
      nodeId: '0x',
      name: 'BTC/USD',
      asset: 'BTC',
      oracleType: 'chainlink',
      description: 'Bitcoin price feed',
    },
    {
      nodeId: '0x',
      name: 'ARB/USD',
      asset: 'ARB',
      oracleType: 'chainlink',
      description: 'Arbitrum token price feed',
    },
  ],
};

/**
 * Oracle types supported by Synthetix v3
 */
export const ORACLE_TYPES = {
  CHAINLINK: 'chainlink',
  PYTH: 'pyth',
  UNISWAP_V3_TWAP: 'uniswapV3Twap',
  CONSTANT: 'constant',
  STALENESS_CIRCUIT_BREAKER: 'stalenessCircuitBreaker',
  DEVIATION_CIRCUIT_BREAKER: 'deviationCircuitBreaker',
  REDUCER: 'reducer',
  EXTERNAL: 'external',
} as const;

export type OracleType = (typeof ORACLE_TYPES)[keyof typeof ORACLE_TYPES];

/**
 * Default oracle configuration values
 */
export const ORACLE_DEFAULTS = {
  MAX_STALENESS_TOLERANCE: 3600, // 1 hour in seconds
  MAX_DEVIATION_TOLERANCE: 100, // 1% (in basis points / 100)
  PRICE_DECIMALS: 18,
};

export function getOracleNodes(network: string): OracleNodeConfig[] {
  return ORACLE_NODES[network] || [];
}

export function getOracleNodeByAsset(network: string, asset: string): OracleNodeConfig | undefined {
  return getOracleNodes(network).find((n) => n.asset === asset);
}

/**
 * Collateral types accepted by Synthetix v3
 */
export interface CollateralTypeConfig {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  oracleNodeId: string;
  isEnabled: boolean;
}

export const COLLATERAL_TYPES: Record<string, CollateralTypeConfig[]> = {
  optimism: [
    {
      address: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
      symbol: 'SNX',
      name: 'Synthetix Network Token',
      decimals: 18,
      oracleNodeId: '0x',
      isEnabled: true,
    },
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      oracleNodeId: '0x',
      isEnabled: true,
    },
  ],
  base: [
    {
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      oracleNodeId: '0x',
      isEnabled: true,
    },
    {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      oracleNodeId: '0x',
      isEnabled: true,
    },
  ],
  arbitrum: [
    {
      address: '0xcb98643b8786950F0461f3B0edf99D88F274574D',
      symbol: 'SNX',
      name: 'Synthetix Network Token',
      decimals: 18,
      oracleNodeId: '0x',
      isEnabled: true,
    },
    {
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      symbol: 'WETH',
      name: 'Wrapped Ether',
      decimals: 18,
      oracleNodeId: '0x',
      isEnabled: true,
    },
  ],
};

export function getCollateralTypes(network: string): CollateralTypeConfig[] {
  return COLLATERAL_TYPES[network] || [];
}

export function getCollateralBySymbol(network: string, symbol: string): CollateralTypeConfig | undefined {
  return getCollateralTypes(network).find((c) => c.symbol === symbol);
}
