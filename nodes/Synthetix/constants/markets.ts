/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Synthetix v3 Market Configurations
 * 
 * Markets in Synthetix v3 represent derivative products that draw
 * credit capacity from pools. There are two main types:
 * - Perps Markets: Perpetual futures with funding rates
 * - Spot Markets: Synth exchange markets
 * 
 * Key Concepts:
 * - Market ID: Unique identifier for each market
 * - Credit Capacity: How much debt a market can issue
 * - Utilization: Percentage of credit capacity used
 */

export interface PerpsMarketConfig {
  id: number;
  name: string;
  symbol: string;
  baseAsset: string;
  maxLeverage: number;
}

export interface SpotMarketConfig {
  id: number;
  name: string;
  symbol: string;
  synthAddress: string;
}

export const PERPS_MARKETS: Record<string, PerpsMarketConfig[]> = {
  optimism: [
    { id: 100, name: 'Ethereum', symbol: 'ETH', baseAsset: 'ETH', maxLeverage: 25 },
    { id: 200, name: 'Bitcoin', symbol: 'BTC', baseAsset: 'BTC', maxLeverage: 25 },
    { id: 300, name: 'Solana', symbol: 'SOL', baseAsset: 'SOL', maxLeverage: 10 },
    { id: 400, name: 'Avalanche', symbol: 'AVAX', baseAsset: 'AVAX', maxLeverage: 10 },
    { id: 500, name: 'Polygon', symbol: 'MATIC', baseAsset: 'MATIC', maxLeverage: 10 },
    { id: 600, name: 'Chainlink', symbol: 'LINK', baseAsset: 'LINK', maxLeverage: 10 },
    { id: 700, name: 'Aave', symbol: 'AAVE', baseAsset: 'AAVE', maxLeverage: 10 },
    { id: 800, name: 'Uniswap', symbol: 'UNI', baseAsset: 'UNI', maxLeverage: 10 },
    { id: 900, name: 'Arbitrum', symbol: 'ARB', baseAsset: 'ARB', maxLeverage: 10 },
    { id: 1000, name: 'Optimism', symbol: 'OP', baseAsset: 'OP', maxLeverage: 10 },
  ],
  base: [
    { id: 100, name: 'Ethereum', symbol: 'ETH', baseAsset: 'ETH', maxLeverage: 25 },
    { id: 200, name: 'Bitcoin', symbol: 'BTC', baseAsset: 'BTC', maxLeverage: 25 },
    { id: 300, name: 'Solana', symbol: 'SOL', baseAsset: 'SOL', maxLeverage: 10 },
    { id: 400, name: 'Dogecoin', symbol: 'DOGE', baseAsset: 'DOGE', maxLeverage: 10 },
    { id: 500, name: 'Pepe', symbol: 'PEPE', baseAsset: 'PEPE', maxLeverage: 10 },
  ],
  arbitrum: [
    { id: 100, name: 'Ethereum', symbol: 'ETH', baseAsset: 'ETH', maxLeverage: 25 },
    { id: 200, name: 'Bitcoin', symbol: 'BTC', baseAsset: 'BTC', maxLeverage: 25 },
    { id: 300, name: 'Solana', symbol: 'SOL', baseAsset: 'SOL', maxLeverage: 10 },
    { id: 900, name: 'Arbitrum', symbol: 'ARB', baseAsset: 'ARB', maxLeverage: 10 },
  ],
};

export const SPOT_MARKETS: Record<string, SpotMarketConfig[]> = {
  optimism: [
    { id: 1, name: 'Synthetic USD', symbol: 'sUSD', synthAddress: '0xb2F30A7C980f052f02563fb518dcc39e6bf38175' },
    { id: 2, name: 'Synthetic ETH', symbol: 'sETH', synthAddress: '0x' },
  ],
  base: [
    { id: 1, name: 'Synthetic USD', symbol: 'sUSD', synthAddress: '0x09d51516F38980035153a554c26Df3C6f51a23C3' },
  ],
  arbitrum: [
    { id: 1, name: 'Synthetic USD', symbol: 'sUSD', synthAddress: '0xb2F30A7C980f052f02563fb518dcc39e6bf38175' },
  ],
};

export function getPerpsMarkets(network: string): PerpsMarketConfig[] {
  return PERPS_MARKETS[network] || [];
}

export function getSpotMarkets(network: string): SpotMarketConfig[] {
  return SPOT_MARKETS[network] || [];
}

export function getPerpsMarketById(network: string, marketId: number): PerpsMarketConfig | undefined {
  return getPerpsMarkets(network).find((m) => m.id === marketId);
}

export function getSpotMarketById(network: string, marketId: number): SpotMarketConfig | undefined {
  return getSpotMarkets(network).find((m) => m.id === marketId);
}

/**
 * Market types in Synthetix v3
 */
export const MARKET_TYPES = {
  PERPS: 'perps',
  SPOT: 'spot',
} as const;

export type MarketType = (typeof MARKET_TYPES)[keyof typeof MARKET_TYPES];

/**
 * Order types for perps markets
 */
export const ORDER_TYPES = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT',
  STOP: 'STOP',
  STOP_LIMIT: 'STOP_LIMIT',
} as const;

export type OrderType = (typeof ORDER_TYPES)[keyof typeof ORDER_TYPES];

/**
 * Order side
 */
export const ORDER_SIDES = {
  LONG: 'LONG',
  SHORT: 'SHORT',
} as const;

export type OrderSide = (typeof ORDER_SIDES)[keyof typeof ORDER_SIDES];
