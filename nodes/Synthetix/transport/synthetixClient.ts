/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

/**
 * Synthetix Client
 * 
 * Main client for interacting with Synthetix v3 Core contracts.
 * Handles account management, collateral operations, pool interactions,
 * and debt management.
 */

import { ethers, JsonRpcProvider, Wallet, Contract, TransactionResponse } from 'ethers';
import { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-workflow';
import { getNetworkConfig, getContractAddresses } from '../constants';

// Core Proxy ABI (simplified - includes main functions)
const CORE_PROXY_ABI = [
  // Account functions
  'function createAccount() external returns (uint128)',
  'function createAccount(uint128 requestedAccountId) external',
  'function getAccountOwner(uint128 accountId) external view returns (address)',
  'function getAccountPermissions(uint128 accountId) external view returns (tuple(address user, bytes32[] permissions)[])',
  'function hasPermission(uint128 accountId, bytes32 permission, address user) external view returns (bool)',
  'function grantPermission(uint128 accountId, bytes32 permission, address user) external',
  'function revokePermission(uint128 accountId, bytes32 permission, address user) external',
  'function renouncePermission(uint128 accountId, bytes32 permission) external',
  
  // Collateral functions
  'function deposit(uint128 accountId, address collateralType, uint256 tokenAmount) external',
  'function withdraw(uint128 accountId, address collateralType, uint256 tokenAmount) external',
  'function getAccountCollateral(uint128 accountId, address collateralType) external view returns (uint256 totalDeposited, uint256 totalAssigned, uint256 totalLocked)',
  'function getAccountAvailableCollateral(uint128 accountId, address collateralType) external view returns (uint256)',
  'function getCollateralConfiguration(address collateralType) external view returns (bool depositingEnabled, uint256 issuanceRatioD18, uint256 liquidationRatioD18, uint256 liquidationRewardD18, bytes32 oracleNodeId, address tokenAddress, uint256 minDelegationD18)',
  'function getCollateralConfigurations(bool hideDisabled) external view returns (tuple(bool depositingEnabled, uint256 issuanceRatioD18, uint256 liquidationRatioD18, uint256 liquidationRewardD18, bytes32 oracleNodeId, address tokenAddress, uint256 minDelegationD18)[])',
  
  // Pool functions
  'function getPoolConfiguration(uint128 poolId) external view returns (tuple(uint128 marketId, uint128 weightD18, int128 maxDebtShareValueD18)[])',
  'function getPoolOwner(uint128 poolId) external view returns (address)',
  'function getPoolCollateralConfiguration(uint128 poolId, address collateralType) external view returns (uint256 collateralLimitD18, uint256 issuanceRatioD18)',
  
  // Delegation functions
  'function delegateCollateral(uint128 accountId, uint128 poolId, address collateralType, uint256 newCollateralAmountD18, uint256 leverage) external',
  'function getPosition(uint128 accountId, uint128 poolId, address collateralType) external view returns (uint256 collateralAmount, uint256 collateralValue, int256 debt, uint256 collateralizationRatio)',
  'function getPositionDebt(uint128 accountId, uint128 poolId, address collateralType) external view returns (int256)',
  'function getPositionCollateral(uint128 accountId, uint128 poolId, address collateralType) external view returns (uint256 amount, uint256 value)',
  
  // Vault functions
  'function getVaultDebt(uint128 poolId, address collateralType) external view returns (int256)',
  'function getVaultCollateral(uint128 poolId, address collateralType) external view returns (uint256 amount, uint256 value)',
  'function getVaultCollateralRatio(uint128 poolId, address collateralType) external view returns (uint256)',
  
  // Market functions
  'function getMarketDebtPerShare(uint128 poolId, uint128 marketId) external view returns (int256)',
  'function getMarketCollateral(uint128 marketId) external view returns (uint256)',
  
  // snxUSD (Mint/Burn)
  'function mintUsd(uint128 accountId, uint128 poolId, address collateralType, uint256 amount) external',
  'function burnUsd(uint128 accountId, uint128 poolId, address collateralType, uint256 amount) external',
  
  // Liquidation functions
  'function liquidate(uint128 accountId, uint128 poolId, address collateralType, uint128 liquidateAsAccountId) external returns (tuple(uint256 debtLiquidated, uint256 collateralLiquidated, uint256 amountRewarded))',
  'function liquidateVault(uint128 poolId, address collateralType, uint128 liquidateAsAccountId, uint256 maxUsd) external returns (tuple(uint256 debtLiquidated, uint256 collateralLiquidated, uint256 amountRewarded))',
  'function isPositionLiquidatable(uint128 accountId, uint128 poolId, address collateralType) external view returns (bool)',
  'function isVaultLiquidatable(uint128 poolId, address collateralType) external view returns (bool)',
  
  // Rewards functions
  'function claimRewards(uint128 accountId, uint128 poolId, address collateralType, address distributor) external returns (uint256)',
  'function getRewardRate(uint128 poolId, address collateralType, address distributor) external view returns (uint256)',
  'function getAvailableRewards(uint128 accountId, uint128 poolId, address collateralType, address distributor) external view returns (uint256)',
  
  // Events
  'event AccountCreated(uint128 indexed accountId, address indexed owner)',
  'event Deposited(uint128 indexed accountId, address indexed collateralType, uint256 tokenAmount, address indexed sender)',
  'event Withdrawn(uint128 indexed accountId, address indexed collateralType, uint256 tokenAmount, address indexed sender)',
  'event DelegationUpdated(uint128 indexed accountId, uint128 indexed poolId, address collateralType, uint256 amount, uint256 leverage, address indexed sender)',
  'event UsdMinted(uint128 indexed accountId, uint128 indexed poolId, address collateralType, uint256 amount, address indexed sender)',
  'event UsdBurned(uint128 indexed accountId, uint128 indexed poolId, address collateralType, uint256 amount, address indexed sender)',
  'event Liquidation(uint128 indexed accountId, uint128 indexed poolId, address collateralType, tuple(uint256 debtLiquidated, uint256 collateralLiquidated, uint256 amountRewarded) liquidationData, uint128 liquidateAsAccountId, address sender)',
  'event RewardsClaimed(uint128 indexed accountId, uint128 indexed poolId, address collateralType, address distributor, uint256 amount, address indexed sender)',
];

// Account Proxy ABI (ERC-721)
const ACCOUNT_PROXY_ABI = [
  'function balanceOf(address owner) external view returns (uint256)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)',
  'function transferFrom(address from, address to, uint256 tokenId) external',
  'function safeTransferFrom(address from, address to, uint256 tokenId) external',
  'function approve(address to, uint256 tokenId) external',
  'function getApproved(uint256 tokenId) external view returns (address)',
];

// USD Proxy ABI (ERC-20)
const USD_PROXY_ABI = [
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
];

export interface SynthetixClientConfig {
  network: string;
  rpcUrl?: string;
  privateKey?: string;
}

export interface TransactionResult {
  hash: string;
  blockNumber?: number;
  status: 'pending' | 'success' | 'failed';
  gasUsed?: string;
}

export class SynthetixClient {
  private provider: JsonRpcProvider;
  private signer: Wallet | null = null;
  private network: string;
  private coreProxy: Contract;
  private accountProxy: Contract;
  private usdProxy: Contract;

  constructor(config: SynthetixClientConfig) {
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
    
    // Initialize contracts
    const signerOrProvider = this.signer || this.provider;
    this.coreProxy = new Contract(addresses.CoreProxy, CORE_PROXY_ABI, signerOrProvider);
    this.accountProxy = new Contract(addresses.AccountProxy, ACCOUNT_PROXY_ABI, signerOrProvider);
    this.usdProxy = new Contract(addresses.USDProxy, USD_PROXY_ABI, signerOrProvider);
  }

  /**
   * Emit licensing notice (called once per session)
   */
  private static licenseNoticeEmitted = false;
  private emitLicenseNotice(): void {
    if (!SynthetixClient.licenseNoticeEmitted) {
      console.warn(
        '[Velocity BPA Licensing Notice]\n' +
        'This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).\n' +
        'Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.\n' +
        'For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.'
      );
      SynthetixClient.licenseNoticeEmitted = true;
    }
  }

  // ============================================
  // ACCOUNT OPERATIONS
  // ============================================

  /**
   * Create a new Synthetix account (NFT)
   */
  async createAccount(requestedAccountId?: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    
    let tx: TransactionResponse;
    if (requestedAccountId) {
      tx = await this.coreProxy.createAccount(BigInt(requestedAccountId));
    } else {
      tx = await this.coreProxy['createAccount()']();
    }
    
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Get account owner
   */
  async getAccountOwner(accountId: string): Promise<string> {
    this.emitLicenseNotice();
    return await this.coreProxy.getAccountOwner(BigInt(accountId));
  }

  /**
   * Get account permissions
   */
  async getAccountPermissions(accountId: string): Promise<Array<{ user: string; permissions: string[] }>> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getAccountPermissions(BigInt(accountId));
    return result.map((p: { user: string; permissions: string[] }) => ({
      user: p.user,
      permissions: p.permissions.map((perm: string) => ethers.decodeBytes32String(perm)),
    }));
  }

  /**
   * Check if user has permission
   */
  async hasPermission(accountId: string, permission: string, user: string): Promise<boolean> {
    this.emitLicenseNotice();
    const permissionBytes32 = ethers.encodeBytes32String(permission);
    return await this.coreProxy.hasPermission(BigInt(accountId), permissionBytes32, user);
  }

  /**
   * Grant permission to user
   */
  async grantPermission(accountId: string, permission: string, user: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    const permissionBytes32 = ethers.encodeBytes32String(permission);
    const tx = await this.coreProxy.grantPermission(BigInt(accountId), permissionBytes32, user);
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(accountId: string, permission: string, user: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    const permissionBytes32 = ethers.encodeBytes32String(permission);
    const tx = await this.coreProxy.revokePermission(BigInt(accountId), permissionBytes32, user);
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Get accounts owned by address
   */
  async getAccountsByOwner(owner: string): Promise<string[]> {
    this.emitLicenseNotice();
    const balance = await this.accountProxy.balanceOf(owner);
    const accounts: string[] = [];
    for (let i = 0; i < Number(balance); i++) {
      const accountId = await this.accountProxy.tokenOfOwnerByIndex(owner, i);
      accounts.push(accountId.toString());
    }
    return accounts;
  }

  /**
   * Transfer account to new owner
   */
  async transferAccount(accountId: string, from: string, to: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    const tx = await this.accountProxy.transferFrom(from, to, BigInt(accountId));
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  // ============================================
  // COLLATERAL OPERATIONS
  // ============================================

  /**
   * Deposit collateral
   */
  async deposit(accountId: string, collateralType: string, amount: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    const tx = await this.coreProxy.deposit(BigInt(accountId), collateralType, BigInt(amount));
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Withdraw collateral
   */
  async withdraw(accountId: string, collateralType: string, amount: string): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    const tx = await this.coreProxy.withdraw(BigInt(accountId), collateralType, BigInt(amount));
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Get account collateral
   */
  async getAccountCollateral(accountId: string, collateralType: string): Promise<{
    totalDeposited: string;
    totalAssigned: string;
    totalLocked: string;
  }> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getAccountCollateral(BigInt(accountId), collateralType);
    return {
      totalDeposited: result[0].toString(),
      totalAssigned: result[1].toString(),
      totalLocked: result[2].toString(),
    };
  }

  /**
   * Get available collateral
   */
  async getAccountAvailableCollateral(accountId: string, collateralType: string): Promise<string> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getAccountAvailableCollateral(BigInt(accountId), collateralType);
    return result.toString();
  }

  /**
   * Get collateral configuration
   */
  async getCollateralConfiguration(collateralType: string): Promise<{
    depositingEnabled: boolean;
    issuanceRatioD18: string;
    liquidationRatioD18: string;
    liquidationRewardD18: string;
    oracleNodeId: string;
    tokenAddress: string;
    minDelegationD18: string;
  }> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getCollateralConfiguration(collateralType);
    return {
      depositingEnabled: result[0],
      issuanceRatioD18: result[1].toString(),
      liquidationRatioD18: result[2].toString(),
      liquidationRewardD18: result[3].toString(),
      oracleNodeId: result[4],
      tokenAddress: result[5],
      minDelegationD18: result[6].toString(),
    };
  }

  // ============================================
  // DELEGATION OPERATIONS
  // ============================================

  /**
   * Delegate collateral to pool
   */
  async delegateCollateral(
    accountId: string,
    poolId: string,
    collateralType: string,
    amount: string,
    leverage: string = '1000000000000000000', // 1x leverage
  ): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    const tx = await this.coreProxy.delegateCollateral(
      BigInt(accountId),
      BigInt(poolId),
      collateralType,
      BigInt(amount),
      BigInt(leverage),
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
   * Get position
   */
  async getPosition(accountId: string, poolId: string, collateralType: string): Promise<{
    collateralAmount: string;
    collateralValue: string;
    debt: string;
    collateralizationRatio: string;
  }> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getPosition(BigInt(accountId), BigInt(poolId), collateralType);
    return {
      collateralAmount: result[0].toString(),
      collateralValue: result[1].toString(),
      debt: result[2].toString(),
      collateralizationRatio: result[3].toString(),
    };
  }

  /**
   * Get position debt
   */
  async getPositionDebt(accountId: string, poolId: string, collateralType: string): Promise<string> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getPositionDebt(BigInt(accountId), BigInt(poolId), collateralType);
    return result.toString();
  }

  // ============================================
  // POOL OPERATIONS
  // ============================================

  /**
   * Get pool configuration
   */
  async getPoolConfiguration(poolId: string): Promise<Array<{
    marketId: string;
    weightD18: string;
    maxDebtShareValueD18: string;
  }>> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getPoolConfiguration(BigInt(poolId));
    return result.map((m: { marketId: bigint; weightD18: bigint; maxDebtShareValueD18: bigint }) => ({
      marketId: m.marketId.toString(),
      weightD18: m.weightD18.toString(),
      maxDebtShareValueD18: m.maxDebtShareValueD18.toString(),
    }));
  }

  /**
   * Get pool owner
   */
  async getPoolOwner(poolId: string): Promise<string> {
    this.emitLicenseNotice();
    return await this.coreProxy.getPoolOwner(BigInt(poolId));
  }

  // ============================================
  // VAULT OPERATIONS
  // ============================================

  /**
   * Get vault debt
   */
  async getVaultDebt(poolId: string, collateralType: string): Promise<string> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getVaultDebt(BigInt(poolId), collateralType);
    return result.toString();
  }

  /**
   * Get vault collateral
   */
  async getVaultCollateral(poolId: string, collateralType: string): Promise<{
    amount: string;
    value: string;
  }> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getVaultCollateral(BigInt(poolId), collateralType);
    return {
      amount: result[0].toString(),
      value: result[1].toString(),
    };
  }

  /**
   * Get vault collateral ratio
   */
  async getVaultCollateralRatio(poolId: string, collateralType: string): Promise<string> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getVaultCollateralRatio(BigInt(poolId), collateralType);
    return result.toString();
  }

  // ============================================
  // snxUSD OPERATIONS
  // ============================================

  /**
   * Mint snxUSD
   */
  async mintUsd(
    accountId: string,
    poolId: string,
    collateralType: string,
    amount: string,
  ): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    const tx = await this.coreProxy.mintUsd(BigInt(accountId), BigInt(poolId), collateralType, BigInt(amount));
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Burn snxUSD
   */
  async burnUsd(
    accountId: string,
    poolId: string,
    collateralType: string,
    amount: string,
  ): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    const tx = await this.coreProxy.burnUsd(BigInt(accountId), BigInt(poolId), collateralType, BigInt(amount));
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Get snxUSD balance
   */
  async getUsdBalance(address: string): Promise<string> {
    this.emitLicenseNotice();
    const result = await this.usdProxy.balanceOf(address);
    return result.toString();
  }

  /**
   * Get snxUSD total supply
   */
  async getUsdTotalSupply(): Promise<string> {
    this.emitLicenseNotice();
    const result = await this.usdProxy.totalSupply();
    return result.toString();
  }

  // ============================================
  // LIQUIDATION OPERATIONS
  // ============================================

  /**
   * Check if position is liquidatable
   */
  async isPositionLiquidatable(accountId: string, poolId: string, collateralType: string): Promise<boolean> {
    this.emitLicenseNotice();
    return await this.coreProxy.isPositionLiquidatable(BigInt(accountId), BigInt(poolId), collateralType);
  }

  /**
   * Liquidate account
   */
  async liquidate(
    accountId: string,
    poolId: string,
    collateralType: string,
    liquidateAsAccountId: string,
  ): Promise<TransactionResult & { liquidationData?: { debtLiquidated: string; collateralLiquidated: string; amountRewarded: string } }> {
    this.emitLicenseNotice();
    this.requireSigner();
    const tx = await this.coreProxy.liquidate(
      BigInt(accountId),
      BigInt(poolId),
      collateralType,
      BigInt(liquidateAsAccountId),
    );
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  // ============================================
  // REWARDS OPERATIONS
  // ============================================

  /**
   * Claim rewards
   */
  async claimRewards(
    accountId: string,
    poolId: string,
    collateralType: string,
    distributor: string,
  ): Promise<TransactionResult> {
    this.emitLicenseNotice();
    this.requireSigner();
    const tx = await this.coreProxy.claimRewards(BigInt(accountId), BigInt(poolId), collateralType, distributor);
    const receipt = await tx.wait();
    return {
      hash: tx.hash,
      blockNumber: receipt?.blockNumber,
      status: receipt?.status === 1 ? 'success' : 'failed',
      gasUsed: receipt?.gasUsed?.toString(),
    };
  }

  /**
   * Get available rewards
   */
  async getAvailableRewards(
    accountId: string,
    poolId: string,
    collateralType: string,
    distributor: string,
  ): Promise<string> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getAvailableRewards(BigInt(accountId), BigInt(poolId), collateralType, distributor);
    return result.toString();
  }

  /**
   * Get reward rate
   */
  async getRewardRate(poolId: string, collateralType: string, distributor: string): Promise<string> {
    this.emitLicenseNotice();
    const result = await this.coreProxy.getRewardRate(BigInt(poolId), collateralType, distributor);
    return result.toString();
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Get network name
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * Get signer address
   */
  async getSignerAddress(): Promise<string | null> {
    if (!this.signer) return null;
    return await this.signer.getAddress();
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(method: string, params: unknown[]): Promise<string> {
    this.emitLicenseNotice();
    const gasEstimate = await this.coreProxy[method].estimateGas(...params);
    return gasEstimate.toString();
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Check if signer is available
   */
  private requireSigner(): void {
    if (!this.signer) {
      throw new Error('Private key required for write operations. Please configure credentials.');
    }
  }
}

/**
 * Create Synthetix client from n8n execution context
 */
export async function createSynthetixClient(
  context: IExecuteFunctions | ILoadOptionsFunctions,
  credentialName: string = 'synthetixNetwork',
): Promise<SynthetixClient> {
  const credentials = await context.getCredentials(credentialName);
  
  const network = credentials.network as string;
  const rpcUrl = (credentials.rpcUrl as string) || (credentials.customRpcUrl as string);
  const privateKey = credentials.privateKey as string | undefined;
  
  return new SynthetixClient({
    network,
    rpcUrl,
    privateKey,
  });
}
