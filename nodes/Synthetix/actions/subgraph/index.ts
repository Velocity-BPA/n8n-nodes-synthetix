/**
 * n8n-nodes-synthetix: Subgraph Resource
 *
 * [Velocity BPA Licensing Notice]
 * This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
 * Use of this node by for-profit organizations in production environments
 * requires a commercial license from Velocity BPA.
 * For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.
 */

import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { getSubgraphClient } from '../../transport/subgraphClient';

/**
 * Subgraph resource operations
 * Handles Synthetix v3 subgraph queries
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['subgraph'],
			},
		},
		options: [
			{
				name: 'Query Accounts',
				value: 'queryAccounts',
				description: 'Query account data from the subgraph',
				action: 'Query accounts',
			},
			{
				name: 'Query Pools',
				value: 'queryPools',
				description: 'Query pool data from the subgraph',
				action: 'Query pools',
			},
			{
				name: 'Query Markets',
				value: 'queryMarkets',
				description: 'Query market data from the subgraph',
				action: 'Query markets',
			},
			{
				name: 'Query Positions',
				value: 'queryPositions',
				description: 'Query position data from the subgraph',
				action: 'Query positions',
			},
			{
				name: 'Query Liquidations',
				value: 'queryLiquidations',
				description: 'Query liquidation events from the subgraph',
				action: 'Query liquidations',
			},
			{
				name: 'Query Rewards',
				value: 'queryRewards',
				description: 'Query reward events from the subgraph',
				action: 'Query rewards',
			},
			{
				name: 'Custom GraphQL Query',
				value: 'customQuery',
				description: 'Execute a custom GraphQL query',
				action: 'Custom graph ql query',
			},
			{
				name: 'Get Subgraph Status',
				value: 'getStatus',
				description: 'Get the status and health of the subgraph',
				action: 'Get subgraph status',
			},
		],
		default: 'queryAccounts',
	},
	// Common query parameters
	{
		displayName: 'First',
		name: 'first',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryAccounts', 'queryPools', 'queryMarkets', 'queryPositions', 'queryLiquidations', 'queryRewards'],
			},
		},
		default: 100,
		description: 'Number of results to return (max 1000)',
	},
	{
		displayName: 'Skip',
		name: 'skip',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryAccounts', 'queryPools', 'queryMarkets', 'queryPositions', 'queryLiquidations', 'queryRewards'],
			},
		},
		default: 0,
		description: 'Number of results to skip (for pagination)',
	},
	{
		displayName: 'Order By',
		name: 'orderBy',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryAccounts', 'queryPools', 'queryMarkets', 'queryPositions', 'queryLiquidations', 'queryRewards'],
			},
		},
		default: 'id',
		description: 'Field to order results by',
	},
	{
		displayName: 'Order Direction',
		name: 'orderDirection',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryAccounts', 'queryPools', 'queryMarkets', 'queryPositions', 'queryLiquidations', 'queryRewards'],
			},
		},
		options: [
			{ name: 'Ascending', value: 'asc' },
			{ name: 'Descending', value: 'desc' },
		],
		default: 'desc',
		description: 'Order direction',
	},
	// Account query parameters
	{
		displayName: 'Owner Address',
		name: 'ownerAddress',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryAccounts'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'Filter accounts by owner address (optional)',
	},
	// Position query parameters
	{
		displayName: 'Account ID Filter',
		name: 'accountIdFilter',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryPositions', 'queryLiquidations', 'queryRewards'],
			},
		},
		default: '',
		placeholder: '123456789',
		description: 'Filter by account ID (optional)',
	},
	// Pool filter
	{
		displayName: 'Pool ID Filter',
		name: 'poolIdFilter',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryPositions', 'queryRewards'],
			},
		},
		default: '',
		placeholder: '1',
		description: 'Filter by pool ID (optional)',
	},
	// Market filter
	{
		displayName: 'Market ID Filter',
		name: 'marketIdFilter',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryPositions'],
			},
		},
		default: '',
		placeholder: '100',
		description: 'Filter by market ID (optional)',
	},
	// Time range filter
	{
		displayName: 'From Timestamp',
		name: 'fromTimestamp',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryLiquidations', 'queryRewards'],
			},
		},
		default: 0,
		description: 'Filter events from this Unix timestamp (optional)',
	},
	{
		displayName: 'To Timestamp',
		name: 'toTimestamp',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['queryLiquidations', 'queryRewards'],
			},
		},
		default: 0,
		description: 'Filter events to this Unix timestamp (optional)',
	},
	// Custom query parameters
	{
		displayName: 'GraphQL Query',
		name: 'graphqlQuery',
		type: 'string',
		typeOptions: {
			rows: 10,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['customQuery'],
			},
		},
		default: `query {
  accounts(first: 10) {
    id
    owner
    permissions {
      user
      permissions
    }
  }
}`,
		description: 'The GraphQL query to execute',
	},
	{
		displayName: 'Variables',
		name: 'variables',
		type: 'json',
		displayOptions: {
			show: {
				resource: ['subgraph'],
				operation: ['customQuery'],
			},
		},
		default: '{}',
		description: 'Variables for the GraphQL query (JSON format)',
	},
];

/**
 * Execute subgraph operations
 */
export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	let credentials;
	let subgraphClient;

	if (credentialType === 'api') {
		credentials = await this.getCredentials('synthetixApi');
		subgraphClient = getSubgraphClient(credentials.subgraphUrl as string);
	} else {
		credentials = await this.getCredentials('synthetixNetwork');
		subgraphClient = getSubgraphClient(credentials.subgraphUrl as string || '');
	}

	switch (operation) {
		case 'queryAccounts': {
			const first = this.getNodeParameter('first', itemIndex) as number;
			const skip = this.getNodeParameter('skip', itemIndex) as number;
			const orderBy = this.getNodeParameter('orderBy', itemIndex) as string;
			const orderDirection = this.getNodeParameter('orderDirection', itemIndex) as string;
			const ownerAddress = this.getNodeParameter('ownerAddress', itemIndex) as string;

			const where = ownerAddress ? { owner: ownerAddress.toLowerCase() } : {};

			const accounts = await subgraphClient.queryAccounts({
				first: Math.min(first, 1000),
				skip,
				orderBy,
				orderDirection,
				where,
			});

			return accounts.map((account: {
				id: string;
				owner: string;
				createdAt: string;
				permissions: { user: string; permissions: string[] }[];
			}) => ({
				accountId: account.id,
				owner: account.owner,
				createdAt: account.createdAt,
				permissions: account.permissions,
				permissionCount: account.permissions?.length || 0,
			}));
		}

		case 'queryPools': {
			const first = this.getNodeParameter('first', itemIndex) as number;
			const skip = this.getNodeParameter('skip', itemIndex) as number;
			const orderBy = this.getNodeParameter('orderBy', itemIndex) as string;
			const orderDirection = this.getNodeParameter('orderDirection', itemIndex) as string;

			const pools = await subgraphClient.queryPools({
				first: Math.min(first, 1000),
				skip,
				orderBy,
				orderDirection,
			});

			return pools.map((pool: {
				id: string;
				name: string;
				owner: string;
				totalLiquidity: string;
				totalDebt: string;
				createdAt: string;
			}) => ({
				poolId: pool.id,
				name: pool.name,
				owner: pool.owner,
				totalLiquidity: pool.totalLiquidity,
				totalDebt: pool.totalDebt,
				createdAt: pool.createdAt,
			}));
		}

		case 'queryMarkets': {
			const first = this.getNodeParameter('first', itemIndex) as number;
			const skip = this.getNodeParameter('skip', itemIndex) as number;
			const orderBy = this.getNodeParameter('orderBy', itemIndex) as string;
			const orderDirection = this.getNodeParameter('orderDirection', itemIndex) as string;

			const markets = await subgraphClient.queryMarkets({
				first: Math.min(first, 1000),
				skip,
				orderBy,
				orderDirection,
			});

			return markets.map((market: {
				id: string;
				name: string;
				type: string;
				owner: string;
				totalDebt: string;
				creditCapacity: string;
			}) => ({
				marketId: market.id,
				name: market.name,
				type: market.type,
				owner: market.owner,
				totalDebt: market.totalDebt,
				creditCapacity: market.creditCapacity,
			}));
		}

		case 'queryPositions': {
			const first = this.getNodeParameter('first', itemIndex) as number;
			const skip = this.getNodeParameter('skip', itemIndex) as number;
			const orderBy = this.getNodeParameter('orderBy', itemIndex) as string;
			const orderDirection = this.getNodeParameter('orderDirection', itemIndex) as string;
			const accountIdFilter = this.getNodeParameter('accountIdFilter', itemIndex) as string;
			const poolIdFilter = this.getNodeParameter('poolIdFilter', itemIndex) as string;
			const marketIdFilter = this.getNodeParameter('marketIdFilter', itemIndex) as string;

			const where: IDataObject = {};
			if (accountIdFilter) where.account = accountIdFilter;
			if (poolIdFilter) where.pool = poolIdFilter;
			if (marketIdFilter) where.market = marketIdFilter;

			const positions = await subgraphClient.queryPositions({
				first: Math.min(first, 1000),
				skip,
				orderBy,
				orderDirection,
				where,
			});

			return positions.map((position: {
				id: string;
				accountId: string;
				poolId: string;
				collateralType: string;
				collateralAmount: string;
				debt: string;
				leverage: string;
				updatedAt: string;
			}) => ({
				positionId: position.id,
				accountId: position.accountId,
				poolId: position.poolId,
				collateralType: position.collateralType,
				collateralAmount: position.collateralAmount,
				debt: position.debt,
				leverage: position.leverage,
				updatedAt: position.updatedAt,
			}));
		}

		case 'queryLiquidations': {
			const first = this.getNodeParameter('first', itemIndex) as number;
			const skip = this.getNodeParameter('skip', itemIndex) as number;
			const orderBy = this.getNodeParameter('orderBy', itemIndex) as string;
			const orderDirection = this.getNodeParameter('orderDirection', itemIndex) as string;
			const accountIdFilter = this.getNodeParameter('accountIdFilter', itemIndex) as string;
			const fromTimestamp = this.getNodeParameter('fromTimestamp', itemIndex) as number;
			const toTimestamp = this.getNodeParameter('toTimestamp', itemIndex) as number;

			const where: IDataObject = {};
			if (accountIdFilter) where.account = accountIdFilter;
			if (fromTimestamp > 0) where.timestamp_gte = fromTimestamp;
			if (toTimestamp > 0) where.timestamp_lte = toTimestamp;

			const liquidations = await subgraphClient.queryLiquidations({
				first: Math.min(first, 1000),
				skip,
				orderBy,
				orderDirection,
				where,
			});

			return liquidations.map((liq: {
				id: string;
				accountId: string;
				poolId: string;
				collateralType: string;
				debtLiquidated: string;
				collateralLiquidated: string;
				amountRewarded: string;
				liquidator: string;
				timestamp: string;
				transactionHash: string;
			}) => ({
				liquidationId: liq.id,
				accountId: liq.accountId,
				poolId: liq.poolId,
				collateralType: liq.collateralType,
				debtLiquidated: liq.debtLiquidated,
				collateralLiquidated: liq.collateralLiquidated,
				amountRewarded: liq.amountRewarded,
				liquidator: liq.liquidator,
				timestamp: liq.timestamp,
				transactionHash: liq.transactionHash,
			}));
		}

		case 'queryRewards': {
			const first = this.getNodeParameter('first', itemIndex) as number;
			const skip = this.getNodeParameter('skip', itemIndex) as number;
			const orderBy = this.getNodeParameter('orderBy', itemIndex) as string;
			const orderDirection = this.getNodeParameter('orderDirection', itemIndex) as string;
			const accountIdFilter = this.getNodeParameter('accountIdFilter', itemIndex) as string;
			const poolIdFilter = this.getNodeParameter('poolIdFilter', itemIndex) as string;
			const fromTimestamp = this.getNodeParameter('fromTimestamp', itemIndex) as number;
			const toTimestamp = this.getNodeParameter('toTimestamp', itemIndex) as number;

			const where: IDataObject = {};
			if (accountIdFilter) where.account = accountIdFilter;
			if (poolIdFilter) where.pool = poolIdFilter;
			if (fromTimestamp > 0) where.timestamp_gte = fromTimestamp;
			if (toTimestamp > 0) where.timestamp_lte = toTimestamp;

			const rewards = await subgraphClient.queryRewards({
				first: Math.min(first, 1000),
				skip,
				orderBy,
				orderDirection,
				where,
			});

			return rewards.map((reward: {
				id: string;
				accountId: string;
				poolId: string;
				collateralType: string;
				distributor: string;
				amount: string;
				timestamp: string;
				transactionHash: string;
			}) => ({
				rewardId: reward.id,
				accountId: reward.accountId,
				poolId: reward.poolId,
				collateralType: reward.collateralType,
				distributor: reward.distributor,
				amount: reward.amount,
				timestamp: reward.timestamp,
				transactionHash: reward.transactionHash,
			}));
		}

		case 'customQuery': {
			const graphqlQuery = this.getNodeParameter('graphqlQuery', itemIndex) as string;
			const variablesJson = this.getNodeParameter('variables', itemIndex) as string;

			let variables: IDataObject = {};
			try {
				variables = JSON.parse(variablesJson);
			} catch {
				throw new NodeOperationError(
					this.getNode(),
					'Invalid JSON in variables field',
					{ itemIndex },
				);
			}

			const result = await subgraphClient.customQuery(graphqlQuery, variables);

			return {
				query: graphqlQuery,
				variables,
				result,
			};
		}

		case 'getStatus': {
			const status = await subgraphClient.getStatus();

			return {
				synced: status.synced,
				syncedBlock: status.syncedBlock,
				latestBlock: status.latestBlock,
				blocksBehind: status.latestBlock - status.syncedBlock,
				health: status.health,
				network: status.network,
				subgraphName: status.subgraphName,
				version: status.version,
				lastUpdated: new Date().toISOString(),
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
