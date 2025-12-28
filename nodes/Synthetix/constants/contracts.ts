/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Synthetix v3 Contract Addresses
 * 
 * Synthetix v3 uses a modular proxy architecture where the CoreProxy
 * is the main entry point. Different modules handle specific functionality:
 * - CoreProxy: Main system entry point
 * - AccountProxy: NFT-based account management
 * - USDProxy: snxUSD stablecoin
 * - PerpsMarketProxy: Perpetual futures market
 * - SpotMarketProxy: Spot synth exchange
 * - OracleManagerProxy: Price feed management
 */

export interface ContractAddresses {
  CoreProxy: string;
  AccountProxy: string;
  USDProxy: string;
  PerpsMarketProxy?: string;
  SpotMarketProxy?: string;
  OracleManagerProxy: string;
  RewardsDistributor?: string;
  GovernanceProxy?: string;
  ElectionModule?: string;
  SNXToken?: string;
  TrustedMulticallForwarder?: string;
}

export const CONTRACTS: Record<string, ContractAddresses> = {
  mainnet: {
    CoreProxy: '0xffffffaEff0B96Ea8e4f94b2253f31abdD875847',
    AccountProxy: '0x0E429603D3Cb1DFae4E6F52Add5fE82d96d77Dac',
    USDProxy: '0xb2F30A7C980f052f02563fb518dcc39e6bf38175',
    OracleManagerProxy: '0x0aaF300E148378489a8A471DD3e9E53E30cb42e3',
    SNXToken: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
  },
  optimism: {
    CoreProxy: '0xffffffaEff0B96Ea8e4f94b2253f31abdD875847',
    AccountProxy: '0x0E429603D3Cb1DFae4E6F52Add5fE82d96d77Dac',
    USDProxy: '0xb2F30A7C980f052f02563fb518dcc39e6bf38175',
    PerpsMarketProxy: '0x0A2AF931eFFd34b81ebcc57E3d3c9B1E1dE1C9Ce',
    SpotMarketProxy: '0x38908Ee087D7db73A1Bd1ecab9AAb8E8c9C74595',
    OracleManagerProxy: '0x0aaF300E148378489a8A471DD3e9E53E30cb42e3',
    RewardsDistributor: '0x45063DCd92f56138686810eacB1B510C941d6593',
    GovernanceProxy: '0x07b99bfa6DE06FBadfFCD2C81dC17E8dF6e7d125',
    SNXToken: '0x8700dAec35aF8Ff88c16BdF0418774CB3D7599B4',
    TrustedMulticallForwarder: '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e',
  },
  base: {
    CoreProxy: '0x32C222A9A159782aFD7529c87FA34b96CA72C696',
    AccountProxy: '0x63f4Dd0434BEB5baeCD27F3778a909278d8cf5b8',
    USDProxy: '0x09d51516F38980035153a554c26Df3C6f51a23C3',
    PerpsMarketProxy: '0x0A2AF931eFFd34b81ebcc57E3d3c9B1E1dE1C9Ce',
    SpotMarketProxy: '0x18141523403e2595D31b22604AcB8Fc06a4CaA61',
    OracleManagerProxy: '0x3d07CBC5Cb9376A67E76C0655Fe239dDa8E2B264',
    RewardsDistributor: '0x45063DCd92f56138686810eacB1B510C941d6593',
    TrustedMulticallForwarder: '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e',
  },
  arbitrum: {
    CoreProxy: '0xffffffaEff0B96Ea8e4f94b2253f31abdD875847',
    AccountProxy: '0x0E429603D3Cb1DFae4E6F52Add5fE82d96d77Dac',
    USDProxy: '0xb2F30A7C980f052f02563fb518dcc39e6bf38175',
    PerpsMarketProxy: '0xd762960c31210Cf1bDf75b06A5192d395EEDC659',
    SpotMarketProxy: '0xa65538A6B9A8442854dAcE2DFF2005dB80C7A930',
    OracleManagerProxy: '0x0aaF300E148378489a8A471DD3e9E53E30cb42e3',
    SNXToken: '0xcb98643b8786950F0461f3B0edf99D88F274574D',
    TrustedMulticallForwarder: '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e',
  },
  'optimism-sepolia': {
    CoreProxy: '0x76490713314fCEC173f44e99346F54c6e92a8E42',
    AccountProxy: '0xe487Ad4291019b33e2230F8E2FB1fb6490325260',
    USDProxy: '0xe487Ad4291019b33e2230F8E2FB1fb6490325260',
    PerpsMarketProxy: '0xf272382cB3BE898A8CdB1A23BE056fA2Fcf4513b',
    SpotMarketProxy: '0x93d645c42A0CA3e08E9552367B8c454765fff041',
    OracleManagerProxy: '0x12aE0D5CD26f212bFE242DA78CdDB681eb3d5dD2',
    TrustedMulticallForwarder: '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e',
  },
  'base-sepolia': {
    CoreProxy: '0x32C222A9A159782aFD7529c87FA34b96CA72C696',
    AccountProxy: '0x63f4Dd0434BEB5baeCD27F3778a909278d8cf5b8',
    USDProxy: '0x882a5eFCB96E191E98e1f7c9ec8F67E56f1B6f23',
    PerpsMarketProxy: '0xCb68b813210aFa0373F076239Ad4803f8809e8cf',
    SpotMarketProxy: '0x17633A63083dbd4941891F87Bdf31B896e91e2B9',
    OracleManagerProxy: '0x3d07CBC5Cb9376A67E76C0655Fe239dDa8E2B264',
    TrustedMulticallForwarder: '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e',
  },
  'arbitrum-sepolia': {
    CoreProxy: '0xA98Fcd29B7E7F1A7e62ae47Fb77FD218C7B4b766',
    AccountProxy: '0x1b791d05E437C78039424749243F5A79E747525e',
    USDProxy: '0xe487Ad4291019b33e2230F8E2FB1fb6490325260',
    PerpsMarketProxy: '0xA73A7B754Ec870b3ce9cC18AcDB27619819d25C2',
    SpotMarketProxy: '0x01329a92A5f3bCdF5Da91BD79cC6bBd504D3E3c4',
    OracleManagerProxy: '0x12aE0D5CD26f212bFE242DA78CdDB681eb3d5dD2',
    TrustedMulticallForwarder: '0xE2C5658cC5C448B48141168f3e475dF8f65A1e3e',
  },
};

export function getContractAddresses(network: string): ContractAddresses {
  const addresses = CONTRACTS[network];
  if (!addresses) {
    throw new Error(`No contract addresses found for network: ${network}`);
  }
  return addresses;
}

export function getCoreProxyAddress(network: string): string {
  return getContractAddresses(network).CoreProxy;
}

export function getAccountProxyAddress(network: string): string {
  return getContractAddresses(network).AccountProxy;
}

export function getUSDProxyAddress(network: string): string {
  return getContractAddresses(network).USDProxy;
}

export function getPerpsMarketProxyAddress(network: string): string | undefined {
  return getContractAddresses(network).PerpsMarketProxy;
}

export function getSpotMarketProxyAddress(network: string): string | undefined {
  return getContractAddresses(network).SpotMarketProxy;
}

export function getOracleManagerProxyAddress(network: string): string {
  return getContractAddresses(network).OracleManagerProxy;
}
