/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Spot Client
 * 
 * Client for interacting with Synthetix v3 Spot Markets.
 * Handles synth exchanges, wrapping/unwrapping, and atomic swaps.
 * 
 * Key Concepts:
 * - Synth: Synthetic asset (e.g., sUSD, sETH)
 * - Wrapper: Convert collateral to/from synths (e.g., WETH → sETH)
 * - Atomic Swap: Instant synth-to-synth exchange
 * - Async Order: Delayed execution with price protection
 */

import { ethers, JsonRpcProvider, Wallet, Contract, TransactionResponse } from 'ethers';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { getNetworkConfig, getContractAddresses } from '../constants';

// Spot Market Proxy ABI
const SPOT_MARKET_PROXY_ABI = [
  // Market info
  'function name(uint128 marketId) external view returns (string)',
  'function getSynth(uint128 marketId) external view returns (address)',
  'function getSynthMarketId(address synth) external view returns (uint128)',
  
  // Buy/Sell synths (atomic)
  'function buy(uint128 marketId, uint256 usdAmount, uint256 minAmountReceived, address referrer) external returns (uint256 synthAmount, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function buyExactIn(uint128 marketId, uint256 usdAmount, uint256 minAmountReceived, address referrer) external returns (uint256 synthAmount, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function buyExactOut(uint128 marketId, uint256 synthAmount, uint256 maxUsdAmount, address referrer) external returns (uint256 usdAmountCharged, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function sell(uint128 marketId, uint256 synthAmount, uint256 minUsdAmount, address referrer) external returns (uint256 usdAmountReceived, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function sellExactIn(uint128 marketId, uint256 synthAmount, uint256 minAmountReceived, address referrer) external returns (uint256 returnAmount, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function sellExactOut(uint128 marketId, uint256 usdAmount, uint256 maxSynthAmount, address referrer) external returns (uint256 synthToBurn, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  
  // Fee quotes
  'function quoteBuyExactIn(uint128 marketId, uint256 usdAmount, uint8 stalenessTolerance) external view returns (uint256 synthAmount, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function quoteBuyExactOut(uint128 marketId, uint256 synthAmount, uint8 stalenessTolerance) external view returns (uint256 usdAmountCharged, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function quoteSellExactIn(uint128 marketId, uint256 synthAmount, uint8 stalenessTolerance) external view returns (uint256 returnAmount, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function quoteSellExactOut(uint128 marketId, uint256 usdAmount, uint8 stalenessTolerance) external view returns (uint256 synthToBurn, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  
  // Wrapper functions
  'function wrap(uint128 marketId, uint256 wrapAmount, uint256 minAmountReceived) external returns (uint256 amountToMint, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function unwrap(uint128 marketId, uint256 unwrapAmount, uint256 minAmountReceived) external returns (uint256 returnCollateralAmount, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  
  // Async orders
  'function commitOrder(uint128 marketId, uint8 orderType, uint256 amountProvided, uint256 settlementStrategyId, uint256 minimumSettlementAmount, address referrer) external returns (tuple(uint256 commitmentTime, tuple(uint128 marketId, uint128 accountId, uint8 orderType, uint256 amountEscrowed, uint256 settlementStrategyId, uint256 settlementTime, uint256 minimumSettlementAmount, uint256 settledAt, address referrer) asyncOrderClaim) asyncOrderClaim)',
  'function settleOrder(uint128 marketId, uint128 asyncOrderId) external returns (uint256 finalOrderAmount, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees)',
  'function cancelOrder(uint128 marketId, uint128 asyncOrderId) external',
  'function getAsyncOrderClaim(uint128 marketId, uint128 asyncOrderId) external view returns (tuple(uint256 id, address owner, uint8 orderType, uint256 amountEscrowed, uint256 settlementStrategyId, uint256 settlementTime, uint256 minimumSettlementAmount, uint256 settledAt, address referrer))',
  
  // Market settings
  'function getMarketSkew(uint128 marketId) external view returns (int256)',
  'function getMarketUtilization(uint128 marketId) external view returns (uint256 utilization, uint256 utilizationRate, uint256 delegatedCollateral, uint256 lockedCredit)',
  'function getMarketFees(uint128 marketId) external view returns (uint256 atomicFixedFee, uint256 asyncFixedFee, uint256 wrapFee, uint256 unwrapFee)',
  'function getWrapper(uint128 marketId) external view returns (address wrapCollateralType, uint256 maxWrappableAmount)',
  
  // Events
  'event SynthBought(uint128 indexed marketId, uint256 synthReturned, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees, uint256 collectedFees, address referrer, uint256 price)',
  'event SynthSold(uint128 indexed marketId, uint256 amountReturned, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees, uint256 collectedFees, address referrer, uint256 price)',
  'event SynthWrapped(uint128 indexed marketId, uint256 amountWrapped, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees, uint256 feesCollected)',
  'event SynthUnwrapped(uint128 indexed marketId, uint256 amountUnwrapped, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees, uint256 feesCollected)',
  'event OrderCommitted(uint128 indexed marketId, uint8 indexed orderType, uint256 amountProvided, uint128 asyncOrderId, address indexed sender)',
  'event OrderSettled(uint128 indexed marketId, uint128 indexed asyncOrderId, uint256 finalOrderAmount, tuple(uint256 fixedFees, uint256 utilizationFees, int256 skewFees, int256 wrapperFees) fees, uint256 collectedFees, address indexed settler, uint256 price, uint8 orderType)',
  'event OrderCancelled(uint128 indexed marketId, uint128 indexed asyncOrderId, tuple(uint256 id, address owner, uint8 orderType, uint256 amountEscrowed, uint256 settlementStrategyId, uint256 settlementTime, uint256 minimumSettlementAmount, uint256 settledAt, address referrer) asyncOrderClaim, address indexed sender)',
];

export interface SpotClientConfig {
  network: string;
  rpcUrl?: string;
  privateKey?: string;
}

export interface SpotFees {
  fixedFees: string;
  utilizationFees: string;
  skewFees: string;
  wrapperFees: string;
}

export interface SpotTradeResult {
  amount: string;
  fees: SpotFees;
}

export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  status: 'pending' | 'success' | 'failed';
  gasUsed?: string;
}

export class SpotClient {
  private provider: JsonRpcProvider;
  private signer: Wallet | null = null;
  private network: string;
  private spotMarketProxy: Contract | null = null;

  constructor(config: SpotClientConfig) {
    this.network = config.network;
    
    // Get network configuration
    const networkConfig = getNetworkConfig(config.network);
    const rpcUrl = config.rpcUrl || networkConfig.rpcUrl;
    
    // Initialize provider
    this.provider = new JsonRpcProvider(rpcUrl);
    
    // Initialize signer if private key provided
    if (config.privateKey) {
      this.signer = new Wallet(config.privateKey, this.provider);
    }
    
    // Get contract addresses
    const addresses = getContractAddresses(config.network);
    
    // Initialize spot contract if available
    if (addresses.SpotMarketProxy) {
      const signerOrProvider = this.signer || this.provider;
      this.spotMarketProxy = new Contract(addresses.SpotMarketProxy, SPOT_MARKET_PROXY_ABI, signerOrProvider);
    }
  }

  /**
   * Emit licensing notice (called once per session)
   */
  private static licenseNoticeEmitted = false;
  private emitLicenseNotice(): void {
    if (!SpotClient.licenseNoticeEmitted) {
      console.warn(
        '[Velocity BPA Licensing Notice]\n' +
        'This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).\n' +
        'Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.\n' +
        'For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.'
      );
      SpotClient.licenseNoticeEmitted = true;
    }
  }

  /**
   * Check if spot is available on this network
   */
  isSpotAvailable(): boolean {
    return this.spotMarketProxy !== null;
  }

  /**
   * Ensure spot is available
   */
  private requireSpot(): void {
    if (!this.spotMarketProxy) {
      throw new Error(`Spot markets not available on network: ${this.network}`);
    }
  }

  /**
   * Check if signer is available
   */
  private requireSigner(): void {
    if (!this.signer) {
      throw new Error('Private key required for write operations. Please configure credentials.');
    }
  }

  // ============================================
  // MARKET INFO
  // ============================================

  /**
   * Get market name
   */
  async getMarketName(marketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requireSpot();
    return await this.spotMarketProxy!.name(BigInt(marketId));
  }

  /**
   * Get synth address for market
   */
  async getSynth(marketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requireSpot();
    return await this.spotMarketProxy!.getSynth(BigInt(marketId));
  }

  /**
   * Get market ID for synth address
   */
  async getSynthMarketId(synthAddress: string): Promise<string> {
    this.emitLicenseNotice();
    this.requireSpot();
    const result = await this.spotMarketProxy!.getSynthMarketId(synthAddress);
    return result.toString();
  }

  /**
   * Get market skew
   */
  async getMarketSkew(marketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requireSpot();
    const result = await this.spotMarketProxy!.getMarketSkew(BigInt(marketId));
    return result.toString();
  }

  /**
   * Get market utilization
   */
  async getMarketUtilization(marketId: string): Promise<{
    utilization: string;
    utilizationRate: string;
    delegatedCollateral: string;
    lockedCredit: string;
  }> {
    this.emitLicenseNotice();
    this.requireSpot();
    const result = await this.spotMarketProxy!.getMarketUtilization(BigInt(marketId));
    return {
      utilization: result[0].toString(),
      utilizationRate: result[1].toString(),
      delegatedCollateral: result[2].toString(),
      lockedCredit: result[3].toString(),
    };
  }

  /**
   * Get market fees
   */
  async getMarketFees(marketId: string): Promise<{
    atomicFixedFee: string;
    asyncFixedFee: string;
    wrapFee: string;
    unwrapFee: string;
  }> {
    this.emitLicenseNotice();
    this.requireSpot();
    const result = await this.spotMarketProxy!.getMarketFees(BigInt(marketId));
    return {
      atomicFixedFee: result[0].toString(),
      asyncFixedFee: result[1].toString(),
      wrapFee: result[2].toString(),
      unwrapFee: result[3].toString(),
    };
  }

  /**
   * Get wrapper info
   */
  async getWrapper(marketId: string): Promise<{
    wrapCollateralType: string;
    maxWrappableAmount: string;
  }> {
    this.emitLicenseNotice();
    this.requireSpot();
    const result = await this.spotMarketProxy!.getWrapper(BigInt(marketId));
    return {
      wrapCollateralType: result[0],
      maxWrappableAmount: result[1].toString(),
    };
  }

  // ============================================
  // BUY OPERATIONS
  // ============================================

  /**
   * Buy synth with exact USD input
   */
  async buyExactIn(
    marketId: string,
    usdAmount: string,
    minAmountReceived: string,
    referrer?: string,
  ): Promise<TransactionResult & SpotTradeResult> {
    this.emitLicenseNotice();
    this.requireSpot();
    this.requireSigner();
    
    const tx = await this.spotMarketProxy!.buyExactIn(
      BigInt(marketId),
      BigInt(usdAmount),
      BigInt(minAmountReceived),
      referrer || ethers.ZeroAddress,
    );
    const receipt = await tx.wait();
    
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
      amount: '0', // Would be extracted from event
      fees: {
        fixedFees: '0',
        utilizationFees: '0',
        skewFees: '0',
        wrapperFees: '0',
      },
    };
  }

  /**
   * Quote buy exact in
   */
  async quoteBuyExactIn(
    marketId: string,
    usdAmount: string,
    stalenessTolerance: number = 0,
  ): Promise<SpotTradeResult> {
    this.emitLicenseNotice();
    this.requireSpot();
    
    const result = await this.spotMarketProxy!.quoteBuyExactIn(
      BigInt(marketId),
      BigInt(usdAmount),
      stalenessTolerance,
    );
    return {
      amount: result[0].toString(),
      fees: {
        fixedFees: result[1][0].toString(),
        utilizationFees: result[1][1].toString(),
        skewFees: result[1][2].toString(),
        wrapperFees: result[1][3].toString(),
      },
    };
  }

  // ============================================
  // SELL OPERATIONS
  // ============================================

  /**
   * Sell synth with exact synth input
   */
  async sellExactIn(
    marketId: string,
    synthAmount: string,
    minAmountReceived: string,
    referrer?: string,
  ): Promise<TransactionResult & SpotTradeResult> {
    this.emitLicenseNotice();
    this.requireSpot();
    this.requireSigner();
    
    const tx = await this.spotMarketProxy!.sellExactIn(
      BigInt(marketId),
      BigInt(synthAmount),
      BigInt(minAmountReceived),
      referrer || ethers.ZeroAddress,
    );
    const receipt = await tx.wait();
    
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
      amount: '0',
      fees: {
        fixedFees: '0',
        utilizationFees: '0',
        skewFees: '0',
        wrapperFees: '0',
      },
    };
  }

  /**
   * Quote sell exact in
   */
  async quoteSellExactIn(
    marketId: string,
    synthAmount: string,
    stalenessTolerance: number = 0,
  ): Promise<SpotTradeResult> {
    this.emitLicenseNotice();
    this.requireSpot();
    
    const result = await this.spotMarketProxy!.quoteSellExactIn(
      BigInt(marketId),
      BigInt(synthAmount),
      stalenessTolerance,
    );
    return {
      amount: result[0].toString(),
      fees: {
        fixedFees: result[1][0].toString(),
        utilizationFees: result[1][1].toString(),
        skewFees: result[1][2].toString(),
        wrapperFees: result[1][3].toString(),
      },
    };
  }

  // ============================================
  // WRAPPER OPERATIONS
  // ============================================

  /**
   * Wrap collateral to synth
   */
  async wrap(
    marketId: string,
    wrapAmount: string,
    minAmountReceived: string,
  ): Promise<TransactionResult & SpotTradeResult> {
    this.emitLicenseNotice();
    this.requireSpot();
    this.requireSigner();
    
    const tx = await this.spotMarketProxy!.wrap(
      BigInt(marketId),
      BigInt(wrapAmount),
      BigInt(minAmountReceived),
    );
    const receipt = await tx.wait();
    
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
      amount: '0',
      fees: {
        fixedFees: '0',
        utilizationFees: '0',
        skewFees: '0',
        wrapperFees: '0',
      },
    };
  }

  /**
   * Unwrap synth to collateral
   */
  async unwrap(
    marketId: string,
    unwrapAmount: string,
    minAmountReceived: string,
  ): Promise<TransactionResult & SpotTradeResult> {
    this.emitLicenseNotice();
    this.requireSpot();
    this.requireSigner();
    
    const tx = await this.spotMarketProxy!.unwrap(
      BigInt(marketId),
      BigInt(unwrapAmount),
      BigInt(minAmountReceived),
    );
    const receipt = await tx.wait();
    
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
      amount: '0',
      fees: {
        fixedFees: '0',
        utilizationFees: '0',
        skewFees: '0',
        wrapperFees: '0',
      },
    };
  }

  // ============================================
  // ASYNC ORDER OPERATIONS
  // ============================================

  /**
   * Commit async order
   */
  async commitOrder(
    marketId: string,
    orderType: number,
    amountProvided: string,
    settlementStrategyId: string,
    minimumSettlementAmount: string,
    referrer?: string,
  ): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSpot();
    this.requireSigner();
    
    const tx = await this.spotMarketProxy!.commitOrder(
      BigInt(marketId),
      orderType,
      BigInt(amountProvided),
      BigInt(settlementStrategyId),
      BigInt(minimumSettlementAmount),
      referrer || ethers.ZeroAddress,
    );
    const receipt = await tx.wait();
    
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Settle async order
   */
  async settleOrder(marketId: string, asyncOrderId: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSpot();
    this.requireSigner();
    
    const tx = await this.spotMarketProxy!.settleOrder(BigInt(marketId), BigInt(asyncOrderId));
    const receipt = await tx.wait();
    
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Cancel async order
   */
  async cancelOrder(marketId: string, asyncOrderId: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSpot();
    this.requireSigner();
    
    const tx = await this.spotMarketProxy!.cancelOrder(BigInt(marketId), BigInt(asyncOrderId));
    const receipt = await tx.wait();
    
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Get async order claim
   */
  async getAsyncOrderClaim(marketId: string, asyncOrderId: string): Promise<{
    id: string;
    owner: string;
    orderType: number;
    amountEscrowed: string;
    settlementStrategyId: string;
    settlementTime: string;
    minimumSettlementAmount: string;
    settledAt: string;
    referrer: string;
  } | null> {
    this.emitLicenseNotice();
    this.requireSpot();
    
    try {
      const result = await this.spotMarketProxy!.getAsyncOrderClaim(BigInt(marketId), BigInt(asyncOrderId));
      return {
        id: result.id.toString(),
        owner: result.owner,
        orderType: result.orderType,
        amountEscrowed: result.amountEscrowed.toString(),
        settlementStrategyId: result.settlementStrategyId.toString(),
        settlementTime: result.settlementTime.toString(),
        minimumSettlementAmount: result.minimumSettlementAmount.toString(),
        settledAt: result.settledAt.toString(),
        referrer: result.referrer,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get network name
   */
  getNetwork(): string {
    return this.network;
  }
}

/**
 * Create Spot client from n8n execution context
 */
export async function createSpotClient(
  context: IExecuteFunctions | ILoadOptionsFunctions,
  credentialName: string = 'synthetixNetwork',
): Promise<SpotClient> {
  const credentials = await context.getCredentials(credentialName);
  
  const network = credentials.network as string;
  const rpcUrl = (credentials.rpcUrl as string) || (credentials.customRpcUrl as string);
  const privateKey = credentials.privateKey as string | undefined;
  
  return new SpotClient({
    network,
    rpcUrl,
    privateKey,
  });
}
