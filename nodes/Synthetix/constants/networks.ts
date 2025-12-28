/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Network Configurations for Synthetix v3
 * 
 * Synthetix v3 is deployed across multiple chains including Ethereum,
 * Optimism, Base, and Arbitrum. Each network has its own set of
 * contract addresses and configurations.
 */

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer: string;
  subgraphUrl: string;
  perpsSubgraphUrl?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrl: 'https://mainnet.optimism.io',
    blockExplorer: 'https://optimistic.etherscan.io',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-optimism-mainnet',
    perpsSubgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/perps-optimism-mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrl: 'https://mainnet.base.org',
    blockExplorer: 'https://basescan.org',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-base-mainnet',
    perpsSubgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/perps-base-mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrl: 'https://arb1.arbitrum.io/rpc',
    blockExplorer: 'https://arbiscan.io',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-arbitrum-mainnet',
    perpsSubgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/perps-arbitrum-mainnet',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  'optimism-sepolia': {
    name: 'Optimism Sepolia',
    chainId: 11155420,
    rpcUrl: 'https://sepolia.optimism.io',
    blockExplorer: 'https://sepolia-optimism.etherscan.io',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-optimism-sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  'base-sepolia': {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    blockExplorer: 'https://sepolia.basescan.org',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-base-sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
  'arbitrum-sepolia': {
    name: 'Arbitrum Sepolia',
    chainId: 421614,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    blockExplorer: 'https://sepolia.arbiscan.io',
    subgraphUrl: 'https://api.thegraph.com/subgraphs/name/synthetixio-team/synthetix-arbitrum-sepolia',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
  },
};

export function getNetworkConfig(network: string): NetworkConfig {
  const config = NETWORKS[network];
  if (!config) {
    throw new Error(`Unknown network: ${network}`);
  }
  return config;
}

export function getChainId(network: string): number {
  return getNetworkConfig(network).chainId;
}

export function getRpcUrl(network: string): string {
  return getNetworkConfig(network).rpcUrl;
}

export function getSubgraphUrl(network: string): string {
  return getNetworkConfig(network).subgraphUrl;
}

export function getPerpsSubgraphUrl(network: string): string | undefined {
  return getNetworkConfig(network).perpsSubgraphUrl;
}
