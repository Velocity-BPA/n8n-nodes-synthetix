/**
 * n8n-nodes-synthetix
 * Copyright (c) 2025 Velocity BPA
 *
 * This file is licensed under the Business Source License 1.1 (BSL 1.1).
 * You may use this file in compliance with the BSL 1.1, except for any use
 * that competes with Velocity BPA's commercial offerings.
 *
 * See the LICENSE file in the repository root for full terms.
 * For commercial licensing, contact licensing@velobpa.com.
 */

import type { IExecuteFunctions, IDataObject } from 'n8n-workflow';
import type { JsonObject } from 'n8n-workflow';

/**
 * Subgraph endpoint URLs per network
 */
const SUBGRAPH_ENDPOINTS: Record<string, Record<string, string>> = {
	optimism: {
		core: 'https://api.thegraph.com/subgraphs/name/synthetix/synthetix-v3-optimism',
		perps: 'https://api.thegraph.com/subgraphs/name/synthetix/perps-v3-optimism',
	},
	base: {
		core: 'https://api.thegraph.com/subgraphs/name/synthetix/synthetix-v3-base',
		perps: 'https://api.thegraph.com/subgraphs/name/synthetix/perps-v3-base',
	},
	arbitrum: {
		core: 'https://api.thegraph.com/subgraphs/name/synthetix/synthetix-v3-arbitrum',
		perps: 'https://api.thegraph.com/subgraphs/name/synthetix/perps-v3-arbitrum',
	},
	mainnet: {
		core: 'https://api.thegraph.com/subgraphs/name/synthetix/synthetix-v3-mainnet',
	},
	'optimism-sepolia': {
		core: 'https://api.thegraph.com/subgraphs/name/synthetix/synthetix-v3-optimism-sepolia',
		perps: 'https://api.thegraph.com/subgraphs/name/synthetix/perps-v3-optimism-sepolia',
	},
	'base-sepolia': {
		core: 'https://api.thegraph.com/subgraphs/name/synthetix/synthetix-v3-base-sepolia',
		perps: 'https://api.thegraph.com/subgraphs/name/synthetix/perps-v3-base-sepolia',
	},
	'arbitrum-sepolia': {
		core: 'https://api.thegraph.com/subgraphs/name/synthetix/synthetix-v3-arbitrum-sepolia',
		perps: 'https://api.thegraph.com/subgraphs/name/synthetix/perps-v3-arbitrum-sepolia',
	},
};

/**
 * Account query response
 */
interface AccountData {
	id: string;
	owner: string;
	created: string;
	lastInteraction: string;
	permissions: Array<{
		target: string;
		permissions: string[];
	}>;
	collateralDeposits: Array<{
		collateralType: string;
		amountDeposited: string;
	}>;
	positions: Array<{
		pool: { id: string };
		collateralType: string;
		collateralAmount: string;
		debt: string;
	}>;
}

/**
 * Pool query response
 */
interface PoolData {
	id: string;
	owner: string;
	name: string;
	created: string;
	totalWeight: string;
	configurations: Array<{
		market: { id: string };
		weight: string;
		maxDebtShareValue: string;
	}>;
	vaults: Array<{
		collateralType: string;
		collateralAmount: string;
		debt: string;
	}>;
}

/**
 * Market query response
 */
interface MarketData {
	id: string;
	address: string;
	created: string;
	reportedDebt: string;
	creditCapacity: string;
	netIssuance: string;
	poolConfigurations: Array<{
		pool: { id: string };
		weight: string;
	}>;
}

/**
 * Position query response
 */
interface PositionData {
	id: string;
	account: { id: string };
	pool: { id: string };
	collateralType: string;
	collateralAmount: string;
	debt: string;
	created: string;
	updated: string;
}

/**
 * Liquidation query response
 */
interface LiquidationData {
	id: string;
	account: { id: string };
	pool: { id: string };
	collateralType: string;
	debtLiquidated: string;
	collateralLiquidated: string;
	amountRewarded: string;
	liquidator: string;
	timestamp: string;
	transactionHash: string;
}

/**
 * Reward claim query response
 */
interface RewardClaimData {
	id: string;
	account: { id: string };
	pool: { id: string };
	collateralType: string;
	distributor: string;
	amount: string;
	timestamp: string;
	transactionHash: string;
}

/**
 * Perps position query response
 */
interface PerpsPositionData {
	id: string;
	account: string;
	market: { id: string; name: string };
	size: string;
	entryPrice: string;
	avgPrice: string;
	pnl: string;
	fundingAccrued: string;
	openTimestamp: string;
	lastUpdated: string;
}

/**
 * Perps order query response
 */
interface PerpsOrderData {
	id: string;
	account: string;
	market: { id: string };
	orderType: string;
	sizeDelta: string;
	acceptablePrice: string;
	settlementTime: string;
	status: string;
	trackingCode: string;
	transactionHash: string;
	timestamp: string;
}

/**
 * SubgraphClient - GraphQL client for indexed Synthetix data
 */
export class SubgraphClient {
	private static licensingNoticeShown = false;
	private coreEndpoint: string;
	private perpsEndpoint: string | null;
	private apiKey?: string;
	private network: string;

	constructor(network: string, customCoreEndpoint?: string, customPerpsEndpoint?: string, apiKey?: string) {
		// Show licensing notice once per session
		if (!SubgraphClient.licensingNoticeShown) {
			console.warn(
				'[Velocity BPA Licensing Notice] This n8n node is licensed under the Business Source License 1.1 (BSL 1.1). ' +
				'Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA. ' +
				'For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.',
			);
			SubgraphClient.licensingNoticeShown = true;
		}

		this.network = network;
		this.apiKey = apiKey;

		// Set endpoints
		if (customCoreEndpoint) {
			this.coreEndpoint = customCoreEndpoint;
		} else {
			const endpoints = SUBGRAPH_ENDPOINTS[network];
			if (!endpoints?.core) {
				throw new Error(`No subgraph endpoint configured for network: ${network}`);
			}
			this.coreEndpoint = endpoints.core;
		}

		if (customPerpsEndpoint) {
			this.perpsEndpoint = customPerpsEndpoint;
		} else {
			const endpoints = SUBGRAPH_ENDPOINTS[network];
			this.perpsEndpoint = endpoints?.perps || null;
		}
	}

	/**
	 * Execute a GraphQL query
	 */
	private async query<T>(endpoint: string, query: string, variables?: Record<string, unknown>): Promise<T> {
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
		};

		if (this.apiKey) {
			headers['Authorization'] = `Bearer ${this.apiKey}`;
		}

		const response = await fetch(endpoint, {
			method: 'POST',
			headers,
			body: JSON.stringify({ query, variables }),
		});

		if (!response.ok) {
			throw new Error(`Subgraph query failed: ${response.status} ${response.statusText}`);
		}

		const result = await response.json() as { data?: T; errors?: Array<{ message: string }> };

		if (result.errors && result.errors.length > 0) {
			throw new Error(`GraphQL error: ${result.errors.map((e) => e.message).join(', ')}`);
		}

		return result.data as T;
	}

	/**
	 * Get subgraph status
	 */
	async getStatus(): Promise<IDataObject> {
		const query = `
			{
				_meta {
					block {
						number
						hash
						timestamp
					}
					hasIndexingErrors
				}
			}
		`;

		const result = await this.query<{ _meta: IDataObject }>(this.coreEndpoint, query);
		return result._meta;
	}

	// ============================================================
	// Account Queries
	// ============================================================

	/**
	 * Query accounts with filters
	 */
	async queryAccounts(options: {
		first?: number;
		skip?: number;
		orderBy?: string;
		orderDirection?: 'asc' | 'desc';
		where?: Record<string, unknown>;
	} = {}): Promise<AccountData[]> {
		const { first = 100, skip = 0, orderBy = 'created', orderDirection = 'desc', where } = options;

		const whereClause = where ? `, where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}` : '';

		const query = `
			{
				accounts(
					first: ${first}
					skip: ${skip}
					orderBy: ${orderBy}
					orderDirection: ${orderDirection}
					${whereClause}
				) {
					id
					owner
					created
					lastInteraction
					permissions {
						target
						permissions
					}
					collateralDeposits {
						collateralType
						amountDeposited
					}
					positions {
						pool { id }
						collateralType
						collateralAmount
						debt
					}
				}
			}
		`;

		const result = await this.query<{ accounts: AccountData[] }>(this.coreEndpoint, query);
		return result.accounts;
	}

	/**
	 * Get account by ID
	 */
	async getAccount(accountId: string): Promise<AccountData | null> {
		const query = `
			{
				account(id: "${accountId}") {
					id
					owner
					created
					lastInteraction
					permissions {
						target
						permissions
					}
					collateralDeposits {
						collateralType
						amountDeposited
					}
					positions {
						pool { id }
						collateralType
						collateralAmount
						debt
					}
				}
			}
		`;

		const result = await this.query<{ account: AccountData | null }>(this.coreEndpoint, query);
		return result.account;
	}

	/**
	 * Get accounts by owner
	 */
	async getAccountsByOwner(owner: string): Promise<AccountData[]> {
		return this.queryAccounts({ where: { owner: owner.toLowerCase() } });
	}

	/**
	 * Get account history (collateral deposits/withdrawals, delegations, etc.)
	 */
	async getAccountHistory(accountId: string, first = 100): Promise<IDataObject[]> {
		const query = `
			{
				collateralDeposits: depositeds(
					first: ${first}
					where: { account: "${accountId}" }
					orderBy: timestamp
					orderDirection: desc
				) {
					id
					account { id }
					collateralType
					tokenAmount
					timestamp
					transactionHash
				}
				collateralWithdrawals: withdrawns(
					first: ${first}
					where: { account: "${accountId}" }
					orderBy: timestamp
					orderDirection: desc
				) {
					id
					account { id }
					collateralType
					tokenAmount
					timestamp
					transactionHash
				}
				delegations: delegationUpdateds(
					first: ${first}
					where: { account: "${accountId}" }
					orderBy: timestamp
					orderDirection: desc
				) {
					id
					account { id }
					pool { id }
					collateralType
					amount
					leverage
					timestamp
					transactionHash
				}
			}
		`;

		const result = await this.query<IDataObject>(this.coreEndpoint, query);
		return [result];
	}

	// ============================================================
	// Pool Queries
	// ============================================================

	/**
	 * Query pools with filters
	 */
	async queryPools(options: {
		first?: number;
		skip?: number;
		orderBy?: string;
		orderDirection?: 'asc' | 'desc';
	} = {}): Promise<PoolData[]> {
		const { first = 100, skip = 0, orderBy = 'created', orderDirection = 'desc' } = options;

		const query = `
			{
				pools(
					first: ${first}
					skip: ${skip}
					orderBy: ${orderBy}
					orderDirection: ${orderDirection}
				) {
					id
					owner
					name
					created
					totalWeight
					configurations {
						market { id }
						weight
						maxDebtShareValue
					}
					vaults {
						collateralType
						collateralAmount
						debt
					}
				}
			}
		`;

		const result = await this.query<{ pools: PoolData[] }>(this.coreEndpoint, query);
		return result.pools;
	}

	/**
	 * Get pool by ID
	 */
	async getPool(poolId: string): Promise<PoolData | null> {
		const query = `
			{
				pool(id: "${poolId}") {
					id
					owner
					name
					created
					totalWeight
					configurations {
						market { id }
						weight
						maxDebtShareValue
					}
					vaults {
						collateralType
						collateralAmount
						debt
					}
				}
			}
		`;

		const result = await this.query<{ pool: PoolData | null }>(this.coreEndpoint, query);
		return result.pool;
	}

	// ============================================================
	// Market Queries
	// ============================================================

	/**
	 * Query markets with filters
	 */
	async queryMarkets(options: {
		first?: number;
		skip?: number;
		orderBy?: string;
		orderDirection?: 'asc' | 'desc';
	} = {}): Promise<MarketData[]> {
		const { first = 100, skip = 0, orderBy = 'created', orderDirection = 'desc' } = options;

		const query = `
			{
				markets(
					first: ${first}
					skip: ${skip}
					orderBy: ${orderBy}
					orderDirection: ${orderDirection}
				) {
					id
					address
					created
					reportedDebt
					creditCapacity
					netIssuance
					poolConfigurations {
						pool { id }
						weight
					}
				}
			}
		`;

		const result = await this.query<{ markets: MarketData[] }>(this.coreEndpoint, query);
		return result.markets;
	}

	/**
	 * Get market by ID
	 */
	async getMarket(marketId: string): Promise<MarketData | null> {
		const query = `
			{
				market(id: "${marketId}") {
					id
					address
					created
					reportedDebt
					creditCapacity
					netIssuance
					poolConfigurations {
						pool { id }
						weight
					}
				}
			}
		`;

		const result = await this.query<{ market: MarketData | null }>(this.coreEndpoint, query);
		return result.market;
	}

	// ============================================================
	// Position Queries
	// ============================================================

	/**
	 * Query positions with filters
	 */
	async queryPositions(options: {
		first?: number;
		skip?: number;
		orderBy?: string;
		orderDirection?: 'asc' | 'desc';
		where?: Record<string, unknown>;
	} = {}): Promise<PositionData[]> {
		const { first = 100, skip = 0, orderBy = 'updated', orderDirection = 'desc', where } = options;

		const whereClause = where ? `, where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}` : '';

		const query = `
			{
				positions(
					first: ${first}
					skip: ${skip}
					orderBy: ${orderBy}
					orderDirection: ${orderDirection}
					${whereClause}
				) {
					id
					account { id }
					pool { id }
					collateralType
					collateralAmount
					debt
					created
					updated
				}
			}
		`;

		const result = await this.query<{ positions: PositionData[] }>(this.coreEndpoint, query);
		return result.positions;
	}

	/**
	 * Get positions by account
	 */
	async getPositionsByAccount(accountId: string): Promise<PositionData[]> {
		return this.queryPositions({ where: { account: accountId } });
	}

	/**
	 * Get positions by pool
	 */
	async getPositionsByPool(poolId: string): Promise<PositionData[]> {
		return this.queryPositions({ where: { pool: poolId } });
	}

	// ============================================================
	// Liquidation Queries
	// ============================================================

	/**
	 * Query liquidations with filters
	 */
	async queryLiquidations(options: {
		first?: number;
		skip?: number;
		orderBy?: string;
		orderDirection?: 'asc' | 'desc';
		where?: Record<string, unknown>;
	} = {}): Promise<LiquidationData[]> {
		const { first = 100, skip = 0, orderBy = 'timestamp', orderDirection = 'desc', where } = options;

		const whereClause = where ? `, where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}` : '';

		const query = `
			{
				liquidations(
					first: ${first}
					skip: ${skip}
					orderBy: ${orderBy}
					orderDirection: ${orderDirection}
					${whereClause}
				) {
					id
					account { id }
					pool { id }
					collateralType
					debtLiquidated
					collateralLiquidated
					amountRewarded
					liquidator
					timestamp
					transactionHash
				}
			}
		`;

		const result = await this.query<{ liquidations: LiquidationData[] }>(this.coreEndpoint, query);
		return result.liquidations;
	}

	/**
	 * Get liquidation history for an account
	 */
	async getLiquidationsByAccount(accountId: string): Promise<LiquidationData[]> {
		return this.queryLiquidations({ where: { account: accountId } });
	}

	// ============================================================
	// Reward Queries
	// ============================================================

	/**
	 * Query reward claims with filters
	 */
	async queryRewardClaims(options: {
		first?: number;
		skip?: number;
		orderBy?: string;
		orderDirection?: 'asc' | 'desc';
		where?: Record<string, unknown>;
	} = {}): Promise<RewardClaimData[]> {
		const { first = 100, skip = 0, orderBy = 'timestamp', orderDirection = 'desc', where } = options;

		const whereClause = where ? `, where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}` : '';

		const query = `
			{
				rewardsClaimed(
					first: ${first}
					skip: ${skip}
					orderBy: ${orderBy}
					orderDirection: ${orderDirection}
					${whereClause}
				) {
					id
					account { id }
					pool { id }
					collateralType
					distributor
					amount
					timestamp
					transactionHash
				}
			}
		`;

		const result = await this.query<{ rewardsClaimed: RewardClaimData[] }>(this.coreEndpoint, query);
		return result.rewardsClaimed;
	}

	/**
	 * Get reward claims by account
	 */
	async getRewardClaimsByAccount(accountId: string): Promise<RewardClaimData[]> {
		return this.queryRewardClaims({ where: { account: accountId } });
	}

	// ============================================================
	// Perps Queries
	// ============================================================

	/**
	 * Check if perps subgraph is available
	 */
	isPerpsAvailable(): boolean {
		return this.perpsEndpoint !== null;
	}

	/**
	 * Require perps subgraph availability
	 */
	private requirePerps(): void {
		if (!this.perpsEndpoint) {
			throw new Error(`Perps subgraph not available for network: ${this.network}`);
		}
	}

	/**
	 * Query perps positions
	 */
	async queryPerpsPositions(options: {
		first?: number;
		skip?: number;
		orderBy?: string;
		orderDirection?: 'asc' | 'desc';
		where?: Record<string, unknown>;
	} = {}): Promise<PerpsPositionData[]> {
		this.requirePerps();

		const { first = 100, skip = 0, orderBy = 'lastUpdated', orderDirection = 'desc', where } = options;

		const whereClause = where ? `, where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}` : '';

		const query = `
			{
				positions(
					first: ${first}
					skip: ${skip}
					orderBy: ${orderBy}
					orderDirection: ${orderDirection}
					${whereClause}
				) {
					id
					account
					market { id name }
					size
					entryPrice
					avgPrice
					pnl
					fundingAccrued
					openTimestamp
					lastUpdated
				}
			}
		`;

		const result = await this.query<{ positions: PerpsPositionData[] }>(this.perpsEndpoint!, query);
		return result.positions;
	}

	/**
	 * Get perps positions by account
	 */
	async getPerpsPositionsByAccount(accountId: string): Promise<PerpsPositionData[]> {
		return this.queryPerpsPositions({ where: { account: accountId } });
	}

	/**
	 * Query perps orders
	 */
	async queryPerpsOrders(options: {
		first?: number;
		skip?: number;
		orderBy?: string;
		orderDirection?: 'asc' | 'desc';
		where?: Record<string, unknown>;
	} = {}): Promise<PerpsOrderData[]> {
		this.requirePerps();

		const { first = 100, skip = 0, orderBy = 'timestamp', orderDirection = 'desc', where } = options;

		const whereClause = where ? `, where: ${JSON.stringify(where).replace(/"([^"]+)":/g, '$1:')}` : '';

		const query = `
			{
				orders(
					first: ${first}
					skip: ${skip}
					orderBy: ${orderBy}
					orderDirection: ${orderDirection}
					${whereClause}
				) {
					id
					account
					market { id }
					orderType
					sizeDelta
					acceptablePrice
					settlementTime
					status
					trackingCode
					transactionHash
					timestamp
				}
			}
		`;

		const result = await this.query<{ orders: PerpsOrderData[] }>(this.perpsEndpoint!, query);
		return result.orders;
	}

	/**
	 * Get perps orders by account
	 */
	async getPerpsOrdersByAccount(accountId: string): Promise<PerpsOrderData[]> {
		return this.queryPerpsOrders({ where: { account: accountId } });
	}

	// ============================================================
	// Custom Query
	// ============================================================

	/**
	 * Execute a custom GraphQL query
	 */
	async customQuery(graphqlQuery: string, subgraph: 'core' | 'perps' = 'core'): Promise<IDataObject> {
		const endpoint = subgraph === 'perps' ? this.perpsEndpoint : this.coreEndpoint;

		if (!endpoint) {
			throw new Error(`Subgraph endpoint not available: ${subgraph}`);
		}

		const result = await this.query<IDataObject>(endpoint, graphqlQuery);
		return result;
	}

	// ============================================================
	// Analytics Queries
	// ============================================================

	/**
	 * Get protocol statistics
	 */
	async getProtocolStats(): Promise<IDataObject> {
		const query = `
			{
				protocolStats(id: "protocol") {
					totalAccounts
					totalPools
					totalMarkets
					totalDebt
					totalCollateral
					totalLiquidations
				}
			}
		`;

		try {
			const result = await this.query<{ protocolStats: IDataObject }>(this.coreEndpoint, query);
			return result.protocolStats || {};
		} catch {
			// If protocolStats entity doesn't exist, calculate from individual queries
			const [accounts, pools, markets] = await Promise.all([
				this.queryAccounts({ first: 1 }),
				this.queryPools({ first: 1 }),
				this.queryMarkets({ first: 1 }),
			]);

			return {
				totalAccounts: accounts.length > 0 ? 'Available' : '0',
				totalPools: pools.length > 0 ? 'Available' : '0',
				totalMarkets: markets.length > 0 ? 'Available' : '0',
			};
		}
	}

	/**
	 * Get volume statistics
	 */
	async getVolumeStats(days = 7): Promise<IDataObject[]> {
		const timestamp = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

		const query = `
			{
				dailyStats(
					first: ${days}
					where: { timestamp_gte: ${timestamp} }
					orderBy: timestamp
					orderDirection: desc
				) {
					id
					timestamp
					volume
					fees
					trades
					uniqueUsers
				}
			}
		`;

		try {
			const result = await this.query<{ dailyStats: IDataObject[] }>(this.coreEndpoint, query);
			return result.dailyStats || [];
		} catch {
			return [];
		}
	}
}

/**
 * Create SubgraphClient from n8n context
 */
export async function createSubgraphClient(
	context: IExecuteFunctions,
	credentialType: 'synthetixApi' | 'synthetixNetwork' = 'synthetixApi',
): Promise<SubgraphClient> {
	if (credentialType === 'synthetixApi') {
		const credentials = await context.getCredentials('synthetixApi') as {
			environment: string;
			subgraphUrl: string;
			perpsSubgraphUrl?: string;
			apiKey?: string;
		};

		return new SubgraphClient(
			credentials.environment,
			credentials.subgraphUrl,
			credentials.perpsSubgraphUrl,
			credentials.apiKey,
		);
	} else {
		const credentials = await context.getCredentials('synthetixNetwork') as {
			network: string;
			subgraphUrl?: string;
		};

		return new SubgraphClient(credentials.network, credentials.subgraphUrl);
	}
}
