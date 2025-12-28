/**
 * n8n-nodes-synthetix: Analytics Resource
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
import { formatWei } from '../../utils/weiUtils';

/**
 * Analytics resource operations
 * Handles Synthetix v3 protocol analytics and statistics
 */
export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['analytics'],
			},
		},
		options: [
			{
				name: 'Get Protocol TVL',
				value: 'getTVL',
				description: 'Get total value locked in the protocol',
				action: 'Get protocol tvl',
			},
			{
				name: 'Get Protocol Stats',
				value: 'getStats',
				description: 'Get overall protocol statistics',
				action: 'Get protocol stats',
			},
			{
				name: 'Get Volume Stats',
				value: 'getVolume',
				description: 'Get trading volume statistics',
				action: 'Get volume stats',
			},
			{
				name: 'Get Pool Rankings',
				value: 'getPoolRankings',
				description: 'Get pools ranked by TVL or performance',
				action: 'Get pool rankings',
			},
			{
				name: 'Get User Stats',
				value: 'getUserStats',
				description: 'Get statistics for a specific user address',
				action: 'Get user stats',
			},
			{
				name: 'Get Market Stats',
				value: 'getMarketStats',
				description: 'Get detailed market statistics',
				action: 'Get market stats',
			},
			{
				name: 'Get Historical Data',
				value: 'getHistorical',
				description: 'Get historical protocol data',
				action: 'Get historical data',
			},
		],
		default: 'getTVL',
	},
	// User stats parameters
	{
		displayName: 'User Address',
		name: 'userAddress',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: ['getUserStats'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'The user address to get statistics for',
	},
	// Market stats parameters
	{
		displayName: 'Market Type',
		name: 'marketType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: ['getMarketStats'],
			},
		},
		options: [
			{ name: 'All Markets', value: 'all' },
			{ name: 'Perps Markets', value: 'perps' },
			{ name: 'Spot Markets', value: 'spot' },
		],
		default: 'all',
		description: 'The type of markets to include',
	},
	// Historical data parameters
	{
		displayName: 'Time Period',
		name: 'timePeriod',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: ['getHistorical', 'getVolume'],
			},
		},
		options: [
			{ name: '24 Hours', value: '24h' },
			{ name: '7 Days', value: '7d' },
			{ name: '30 Days', value: '30d' },
			{ name: '90 Days', value: '90d' },
			{ name: '1 Year', value: '1y' },
			{ name: 'All Time', value: 'all' },
		],
		default: '30d',
		description: 'The time period for historical data',
	},
	// Pool rankings parameters
	{
		displayName: 'Sort By',
		name: 'sortBy',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: ['getPoolRankings'],
			},
		},
		options: [
			{ name: 'TVL (Highest First)', value: 'tvl_desc' },
			{ name: 'TVL (Lowest First)', value: 'tvl_asc' },
			{ name: 'APY (Highest First)', value: 'apy_desc' },
			{ name: 'APY (Lowest First)', value: 'apy_asc' },
			{ name: 'Debt (Highest First)', value: 'debt_desc' },
			{ name: 'Debt (Lowest First)', value: 'debt_asc' },
		],
		default: 'tvl_desc',
		description: 'How to sort the pool rankings',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['analytics'],
				operation: ['getPoolRankings', 'getMarketStats'],
			},
		},
		default: 10,
		description: 'Maximum number of results to return',
	},
];

/**
 * Execute analytics operations
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
		case 'getTVL': {
			const tvlData = await subgraphClient.getProtocolTVL();

			return {
				totalValueLocked: formatWei(tvlData.totalValueLocked, 18),
				totalValueLockedUSD: tvlData.totalValueLockedUSD,
				collateralBreakdown: tvlData.collateralBreakdown.map((c: { type: string; amount: bigint; valueUSD: string }) => ({
					collateralType: c.type,
					amount: formatWei(c.amount, 18),
					valueUSD: c.valueUSD,
				})),
				networkBreakdown: tvlData.networkBreakdown || [],
				change24h: tvlData.change24h || '0%',
				change7d: tvlData.change7d || '0%',
				timestamp: new Date().toISOString(),
			};
		}

		case 'getStats': {
			const stats = await subgraphClient.getProtocolStats();

			return {
				totalAccounts: stats.totalAccounts,
				activeAccounts: stats.activeAccounts,
				totalPools: stats.totalPools,
				totalMarkets: stats.totalMarkets,
				totalDebt: formatWei(stats.totalDebt, 18),
				totalCollateral: formatWei(stats.totalCollateral, 18),
				averageCRatio: `${(stats.averageCRatio * 100).toFixed(2)}%`,
				liquidationsLast24h: stats.liquidationsLast24h,
				liquidationsLast7d: stats.liquidationsLast7d,
				rewardsDistributed24h: formatWei(stats.rewardsDistributed24h, 18),
				timestamp: new Date().toISOString(),
			};
		}

		case 'getVolume': {
			const timePeriod = this.getNodeParameter('timePeriod', itemIndex) as string;

			const volumeData = await subgraphClient.getVolumeStats(timePeriod);

			return {
				timePeriod,
				totalVolume: formatWei(volumeData.totalVolume, 18),
				totalVolumeUSD: volumeData.totalVolumeUSD,
				perpsVolume: formatWei(volumeData.perpsVolume, 18),
				perpsVolumeUSD: volumeData.perpsVolumeUSD,
				spotVolume: formatWei(volumeData.spotVolume, 18),
				spotVolumeUSD: volumeData.spotVolumeUSD,
				totalTrades: volumeData.totalTrades,
				uniqueTraders: volumeData.uniqueTraders,
				topMarkets: volumeData.topMarkets.map((m: { marketId: string; name: string; volume: bigint }) => ({
					marketId: m.marketId,
					name: m.name,
					volume: formatWei(m.volume, 18),
				})),
				timestamp: new Date().toISOString(),
			};
		}

		case 'getPoolRankings': {
			const sortBy = this.getNodeParameter('sortBy', itemIndex) as string;
			const limit = this.getNodeParameter('limit', itemIndex) as number;

			const pools = await subgraphClient.getPoolRankings(sortBy, limit);

			return pools.map((pool: {
				poolId: string;
				name: string;
				tvl: bigint;
				tvlUSD: string;
				debt: bigint;
				cRatio: number;
				apy: number;
				delegators: number;
			}, index: number) => ({
				rank: index + 1,
				poolId: pool.poolId,
				name: pool.name,
				tvl: formatWei(pool.tvl, 18),
				tvlUSD: pool.tvlUSD,
				debt: formatWei(pool.debt, 18),
				cRatio: `${(pool.cRatio * 100).toFixed(2)}%`,
				apy: `${pool.apy.toFixed(2)}%`,
				delegators: pool.delegators,
			}));
		}

		case 'getUserStats': {
			const userAddress = this.getNodeParameter('userAddress', itemIndex) as string;

			const userStats = await subgraphClient.getUserStats(userAddress);

			return {
				address: userAddress,
				totalAccounts: userStats.totalAccounts,
				accounts: userStats.accounts.map((a: { accountId: string; createdAt: string }) => ({
					accountId: a.accountId,
					createdAt: a.createdAt,
				})),
				totalCollateralValue: formatWei(userStats.totalCollateralValue, 18),
				totalCollateralValueUSD: userStats.totalCollateralValueUSD,
				totalDebt: formatWei(userStats.totalDebt, 18),
				averageCRatio: `${(userStats.averageCRatio * 100).toFixed(2)}%`,
				totalRewardsClaimed: formatWei(userStats.totalRewardsClaimed, 18),
				totalLiquidations: userStats.totalLiquidations,
				perpsPositions: userStats.perpsPositions,
				spotActivity: userStats.spotActivity,
				firstActivityDate: userStats.firstActivityDate,
				lastActivityDate: userStats.lastActivityDate,
			};
		}

		case 'getMarketStats': {
			const marketType = this.getNodeParameter('marketType', itemIndex) as string;
			const limit = this.getNodeParameter('limit', itemIndex) as number;

			const markets = await subgraphClient.getMarketStats(marketType, limit);

			return markets.map((market: {
				marketId: string;
				name: string;
				type: string;
				totalDebt: bigint;
				creditCapacity: bigint;
				utilization: number;
				volume24h: bigint;
				trades24h: number;
				openInterest: bigint;
				fundingRate: number;
			}) => ({
				marketId: market.marketId,
				name: market.name,
				type: market.type,
				totalDebt: formatWei(market.totalDebt, 18),
				creditCapacity: formatWei(market.creditCapacity, 18),
				utilization: `${(market.utilization * 100).toFixed(2)}%`,
				volume24h: formatWei(market.volume24h, 18),
				trades24h: market.trades24h,
				openInterest: market.type === 'perps' ? formatWei(market.openInterest, 18) : 'N/A',
				fundingRate: market.type === 'perps' ? `${(market.fundingRate * 100).toFixed(4)}%` : 'N/A',
			}));
		}

		case 'getHistorical': {
			const timePeriod = this.getNodeParameter('timePeriod', itemIndex) as string;

			const historicalData = await subgraphClient.getHistoricalData(timePeriod);

			return {
				timePeriod,
				dataPoints: historicalData.dataPoints.map((dp: {
					timestamp: string;
					tvl: bigint;
					debt: bigint;
					accounts: number;
					volume: bigint;
				}) => ({
					timestamp: dp.timestamp,
					tvl: formatWei(dp.tvl, 18),
					debt: formatWei(dp.debt, 18),
					accounts: dp.accounts,
					volume: formatWei(dp.volume, 18),
				})),
				summary: {
					startTVL: formatWei(historicalData.summary.startTVL, 18),
					endTVL: formatWei(historicalData.summary.endTVL, 18),
					tvlChange: historicalData.summary.tvlChange,
					startDebt: formatWei(historicalData.summary.startDebt, 18),
					endDebt: formatWei(historicalData.summary.endDebt, 18),
					debtChange: historicalData.summary.debtChange,
					newAccounts: historicalData.summary.newAccounts,
					totalVolume: formatWei(historicalData.summary.totalVolume, 18),
				},
				timestamp: new Date().toISOString(),
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
