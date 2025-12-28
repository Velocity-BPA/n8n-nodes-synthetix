/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Perps Client
 * 
 * Client for interacting with Synthetix v3 Perpetual Futures markets.
 * Handles position management, order execution, and market data.
 * 
 * Key Concepts:
 * - Account ID: Perps uses the same NFT accounts as core
 * - Market ID: Unique identifier for each perps market
 * - Position: Open long/short position with leverage
 * - Funding: Periodic payments between longs and shorts
 * - Skew: Imbalance between long and short open interest
 */

import { ethers, JsonRpcProvider, Wallet, Contract, TransactionResponse } from 'ethers';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { getNetworkConfig, getContractAddresses } from '../constants';

// Perps Market Proxy ABI
const PERPS_MARKET_PROXY_ABI = [
  // Account functions
  'function modifyCollateral(uint128 accountId, uint128 synthMarketId, int256 amountDelta) external',
  'function getCollateralAmount(uint128 accountId, uint128 synthMarketId) external view returns (uint256)',
  'function totalCollateralValue(uint128 accountId) external view returns (uint256)',
  'function totalAccountOpenInterest(uint128 accountId) external view returns (uint256)',
  'function getOpenPosition(uint128 accountId, uint128 marketId) external view returns (int256 totalPnl, int256 accruedFunding, int128 positionSize)',
  'function getAvailableMargin(uint128 accountId) external view returns (int256)',
  'function getRequiredMargins(uint128 accountId) external view returns (uint256 requiredInitialMargin, uint256 requiredMaintenanceMargin, uint256 maxLiquidationReward)',
  
  // Order functions
  'function commitOrder(tuple(uint128 marketId, uint128 accountId, int128 sizeDelta, uint128 settlementStrategyId, uint256 acceptablePrice, bytes32 trackingCode, address referrer) commitment) external returns (tuple(uint256 commitmentTime, tuple(uint128 marketId, uint128 accountId, int128 sizeDelta, uint128 settlementStrategyId, uint256 acceptablePrice, bytes32 trackingCode, address referrer) request, uint256 settlementStrategyId) retOrder, uint256 fees)',
  'function settleOrder(uint128 accountId) external',
  'function cancelOrder(uint128 accountId) external',
  'function getOrder(uint128 accountId) external view returns (tuple(uint256 commitmentTime, tuple(uint128 marketId, uint128 accountId, int128 sizeDelta, uint128 settlementStrategyId, uint256 acceptablePrice, bytes32 trackingCode, address referrer) request, uint256 settlementStrategyId))',
  
  // Market functions
  'function metadata(uint128 marketId) external view returns (string name, string symbol)',
  'function skew(uint128 marketId) external view returns (int256)',
  'function size(uint128 marketId) external view returns (uint256)',
  'function maxOpenInterest(uint128 marketId) external view returns (uint256)',
  'function currentFundingRate(uint128 marketId) external view returns (int256)',
  'function currentFundingVelocity(uint128 marketId) external view returns (int256)',
  'function indexPrice(uint128 marketId) external view returns (uint256)',
  'function fillPrice(uint128 marketId, int128 orderSize, uint256 price) external view returns (uint256)',
  'function getMarketSummary(uint128 marketId) external view returns (int256 skew, uint256 size, uint256 maxOpenInterest, int256 currentFundingRate, int256 currentFundingVelocity, uint256 indexPrice)',
  
  // Liquidation functions
  'function liquidate(uint128 accountId) external returns (uint256 liquidationReward)',
  'function liquidateFlagged(uint256 maxNumberOfAccounts) external returns (uint256 liquidationReward)',
  'function canLiquidate(uint128 accountId) external view returns (bool)',
  'function liquidationCapacity(uint128 marketId) external view returns (uint256 capacity, uint256 maxLiquidationInWindow, uint256 latestLiquidationTimestamp)',
  
  // Fee functions
  'function computeOrderFees(uint128 marketId, int128 sizeDelta) external view returns (uint256 orderFees, uint256 fillPrice)',
  'function getSettlementStrategy(uint128 marketId, uint256 strategyId) external view returns (tuple(uint256 strategyType, uint256 settlementDelay, uint256 settlementWindowDuration, address priceVerificationContract, bytes32 feedId, uint256 settlementReward, bool disabled, uint256 commitmentPriceDelay))',
  
  // Events
  'event OrderCommitted(uint128 indexed marketId, uint128 indexed accountId, uint256 orderType, int128 sizeDelta, uint256 acceptablePrice, uint256 commitmentTime, uint256 expectedPriceTime, uint256 settlementTime, uint256 expirationTime, bytes32 indexed trackingCode, address sender)',
  'event OrderSettled(uint128 indexed marketId, uint128 indexed accountId, uint256 fillPrice, int256 pnl, int256 accruedFunding, int128 sizeDelta, int128 newSize, uint256 totalFees, uint256 referralFees, uint256 collectedFees, uint256 settlementReward, bytes32 indexed trackingCode, address settler)',
  'event OrderCancelled(uint128 indexed marketId, uint128 indexed accountId, uint256 desiredPrice, uint256 fillPrice, int128 sizeDelta, uint256 settlementReward, bytes32 indexed trackingCode, address sender)',
  'event PositionLiquidated(uint128 indexed accountId, uint128 indexed marketId, uint256 amountLiquidated, int128 currentPositionSize)',
  'event CollateralModified(uint128 indexed accountId, uint128 indexed synthMarketId, int256 amountDelta, address indexed sender)',
];

export interface PerpsClientConfig {
  network: string;
  rpcUrl?: string;
  privateKey?: string;
}

export interface OrderCommitment {
  marketId: string;
  accountId: string;
  sizeDelta: string;
  settlementStrategyId: string;
  acceptablePrice: string;
  trackingCode?: string;
  referrer?: string;
}

export interface PerpsPosition {
  totalPnl: string;
  accruedFunding: string;
  positionSize: string;
}

export interface MarketSummary {
  skew: string;
  size: string;
  maxOpenInterest: string;
  currentFundingRate: string;
  currentFundingVelocity: string;
  indexPrice: string;
}

export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  status: 'pending' | 'success' | 'failed';
  gasUsed?: string;
}

export class PerpsClient {
  private provider: JsonRpcProvider;
  private signer: Wallet | null = null;
  private network: string;
  private perpsMarketProxy: Contract | null = null;

  constructor(config: PerpsClientConfig) {
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
    
    // Initialize perps contract if available
    if (addresses.PerpsMarketProxy) {
      const signerOrProvider = this.signer || this.provider;
      this.perpsMarketProxy = new Contract(addresses.PerpsMarketProxy, PERPS_MARKET_PROXY_ABI, signerOrProvider);
    }
  }

  /**
   * Emit licensing notice (called once per session)
   */
  private static licenseNoticeEmitted = false;
  private emitLicenseNotice(): void {
    if (!PerpsClient.licenseNoticeEmitted) {
      console.warn(
        '[Velocity BPA Licensing Notice]\n' +
        'This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).\n' +
        'Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.\n' +
        'For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.'
      );
      PerpsClient.licenseNoticeEmitted = true;
    }
  }

  /**
   * Check if perps is available on this network
   */
  isPerpsAvailable(): boolean {
    return this.perpsMarketProxy !== null;
  }

  /**
   * Ensure perps is available
   */
  private requirePerps(): void {
    if (!this.perpsMarketProxy) {
      throw new Error(`Perps markets not available on network: ${this.network}`);
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
  // ACCOUNT OPERATIONS
  // ============================================

  /**
   * Modify collateral for perps account
   */
  async modifyCollateral(
    accountId: string,
    synthMarketId: string,
    amountDelta: string,
  ): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requirePerps();
    this.requireSigner();
    
    const tx = await this.perpsMarketProxy!.modifyCollateral(
      BigInt(accountId),
      BigInt(synthMarketId),
      BigInt(amountDelta),
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
   * Get collateral amount for synth market
   */
  async getCollateralAmount(accountId: string, synthMarketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.getCollateralAmount(BigInt(accountId), BigInt(synthMarketId));
    return result.toString();
  }

  /**
   * Get total collateral value
   */
  async getTotalCollateralValue(accountId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.totalCollateralValue(BigInt(accountId));
    return result.toString();
  }

  /**
   * Get total account open interest
   */
  async getTotalAccountOpenInterest(accountId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.totalAccountOpenInterest(BigInt(accountId));
    return result.toString();
  }

  /**
   * Get open position
   */
  async getOpenPosition(accountId: string, marketId: string): Promise<PerpsPosition> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.getOpenPosition(BigInt(accountId), BigInt(marketId));
    return {
      totalPnl: result[0].toString(),
      accruedFunding: result[1].toString(),
      positionSize: result[2].toString(),
    };
  }

  /**
   * Get available margin
   */
  async getAvailableMargin(accountId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.getAvailableMargin(BigInt(accountId));
    return result.toString();
  }

  /**
   * Get required margins
   */
  async getRequiredMargins(accountId: string): Promise<{
    requiredInitialMargin: string;
    requiredMaintenanceMargin: string;
    maxLiquidationReward: string;
  }> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.getRequiredMargins(BigInt(accountId));
    return {
      requiredInitialMargin: result[0].toString(),
      requiredMaintenanceMargin: result[1].toString(),
      maxLiquidationReward: result[2].toString(),
    };
  }

  // ============================================
  // ORDER OPERATIONS
  // ============================================

  /**
   * Commit an order
   */
  async commitOrder(commitment: OrderCommitment): Promise<TransactionResult & { fees?: string }> {
    this.emitLicenseNotice();
    this.requirePerps();
    this.requireSigner();
    
    const orderRequest = {
      marketId: BigInt(commitment.marketId),
      accountId: BigInt(commitment.accountId),
      sizeDelta: BigInt(commitment.sizeDelta),
      settlementStrategyId: BigInt(commitment.settlementStrategyId),
      acceptablePrice: BigInt(commitment.acceptablePrice),
      trackingCode: commitment.trackingCode 
        ? ethers.encodeBytes32String(commitment.trackingCode)
        : ethers.ZeroHash,
      referrer: commitment.referrer || ethers.ZeroAddress,
    };
    
    const tx = await this.perpsMarketProxy!.commitOrder(orderRequest);
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Settle an order
   */
  async settleOrder(accountId: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requirePerps();
    this.requireSigner();
    
    const tx = await this.perpsMarketProxy!.settleOrder(BigInt(accountId));
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Cancel an order
   */
  async cancelOrder(accountId: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requirePerps();
    this.requireSigner();
    
    const tx = await this.perpsMarketProxy!.cancelOrder(BigInt(accountId));
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Get pending order
   */
  async getOrder(accountId: string): Promise<{
    commitmentTime: string;
    marketId: string;
    sizeDelta: string;
    settlementStrategyId: string;
    acceptablePrice: string;
  } | null> {
    this.emitLicenseNotice();
    this.requirePerps();
    
    try {
      const result = await this.perpsMarketProxy!.getOrder(BigInt(accountId));
      if (result.commitmentTime.toString() === '0') {
        return null;
      }
      return {
        commitmentTime: result.commitmentTime.toString(),
        marketId: result.request.marketId.toString(),
        sizeDelta: result.request.sizeDelta.toString(),
        settlementStrategyId: result.settlementStrategyId.toString(),
        acceptablePrice: result.request.acceptablePrice.toString(),
      };
    } catch {
      return null;
    }
  }

  // ============================================
  // MARKET OPERATIONS
  // ============================================

  /**
   * Get market metadata
   */
  async getMarketMetadata(marketId: string): Promise<{ name: string; symbol: string }> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.metadata(BigInt(marketId));
    return {
      name: result[0],
      symbol: result[1],
    };
  }

  /**
   * Get market summary
   */
  async getMarketSummary(marketId: string): Promise<MarketSummary> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.getMarketSummary(BigInt(marketId));
    return {
      skew: result[0].toString(),
      size: result[1].toString(),
      maxOpenInterest: result[2].toString(),
      currentFundingRate: result[3].toString(),
      currentFundingVelocity: result[4].toString(),
      indexPrice: result[5].toString(),
    };
  }

  /**
   * Get market skew
   */
  async getSkew(marketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.skew(BigInt(marketId));
    return result.toString();
  }

  /**
   * Get market size (open interest)
   */
  async getSize(marketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.size(BigInt(marketId));
    return result.toString();
  }

  /**
   * Get max open interest
   */
  async getMaxOpenInterest(marketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.maxOpenInterest(BigInt(marketId));
    return result.toString();
  }

  /**
   * Get current funding rate
   */
  async getFundingRate(marketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.currentFundingRate(BigInt(marketId));
    return result.toString();
  }

  /**
   * Get current funding velocity
   */
  async getFundingVelocity(marketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.currentFundingVelocity(BigInt(marketId));
    return result.toString();
  }

  /**
   * Get index price
   */
  async getIndexPrice(marketId: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.indexPrice(BigInt(marketId));
    return result.toString();
  }

  /**
   * Get fill price for an order
   */
  async getFillPrice(marketId: string, orderSize: string, price: string): Promise<string> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.fillPrice(BigInt(marketId), BigInt(orderSize), BigInt(price));
    return result.toString();
  }

  // ============================================
  // LIQUIDATION OPERATIONS
  // ============================================

  /**
   * Check if account can be liquidated
   */
  async canLiquidate(accountId: string): Promise<boolean> {
    this.emitLicenseNotice();
    this.requirePerps();
    return await this.perpsMarketProxy!.canLiquidate(BigInt(accountId));
  }

  /**
   * Liquidate an account
   */
  async liquidate(accountId: string): Promise<TransactionResult & { liquidationReward?: string }> {
    this.emitLicenseNotice();
    this.requirePerps();
    this.requireSigner();
    
    const tx = await this.perpsMarketProxy!.liquidate(BigInt(accountId));
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Get liquidation capacity
   */
  async getLiquidationCapacity(marketId: string): Promise<{
    capacity: string;
    maxLiquidationInWindow: string;
    latestLiquidationTimestamp: string;
  }> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.liquidationCapacity(BigInt(marketId));
    return {
      capacity: result[0].toString(),
      maxLiquidationInWindow: result[1].toString(),
      latestLiquidationTimestamp: result[2].toString(),
    };
  }

  // ============================================
  // FEE OPERATIONS
  // ============================================

  /**
   * Compute order fees
   */
  async computeOrderFees(marketId: string, sizeDelta: string): Promise<{
    orderFees: string;
    fillPrice: string;
  }> {
    this.emitLicenseNotice();
    this.requirePerps();
    const result = await this.perpsMarketProxy!.computeOrderFees(BigInt(marketId), BigInt(sizeDelta));
    return {
      orderFees: result[0].toString(),
      fillPrice: result[1].toString(),
    };
  }

  /**
   * Get network name
   */
  getNetwork(): string {
    return this.network;
  }
}

/**
 * Create Perps client from n8n execution context
 */
export async function createPerpsClient(
  context: IExecuteFunctions | ILoadOptionsFunctions,
  credentialName: string = 'synthetixNetwork',
): Promise<PerpsClient> {
  const credentials = await context.getCredentials(credentialName);
  
  const network = credentials.network as string;
  const rpcUrl = (credentials.rpcUrl as string) || (credentials.customRpcUrl as string);
  const privateKey = credentials.privateKey as string | undefined;
  
  return new PerpsClient({
    network,
    rpcUrl,
    privateKey,
  });
}
