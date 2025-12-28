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

import type { IExecuteFunctions, INodeProperties, IDataObject } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { createSubgraphClient } from '../../transport/subgraphClient';
import { PERPS_MARKETS, SPOT_MARKETS } from '../../constants/markets';
import { createSynthetixClient } from '../../transport/synthetixClient';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['market'],
			},
		},
		options: [
			{ name: 'Get Market', value: 'getMarket', description: 'Get market details', action: 'Get market' },
			{ name: 'Get Markets', value: 'getMarkets', description: 'Get all markets', action: 'Get markets' },
			{ name: 'Get Market Debt', value: 'getMarketDebt', description: 'Get market reported debt', action: 'Get market debt' },
			{ name: 'Get Market Credit Capacity', value: 'getCreditCapacity', description: 'Get market credit capacity', action: 'Get market credit capacity' },
			{ name: 'Get Market Utilization', value: 'getUtilization', description: 'Get market utilization rate', action: 'Get market utilization' },
			{ name: 'Get Market Price', value: 'getPrice', description: 'Get market current price', action: 'Get market price' },
			{ name: 'List Perps Markets', value: 'listPerpsMarkets', description: 'List all perpetual markets', action: 'List perps markets' },
			{ name: 'List Spot Markets', value: 'listSpotMarkets', description: 'List all spot markets', action: 'List spot markets' },
		],
		default: 'getMarkets',
	},

	// Market ID
	{
		displayName: 'Market ID',
		name: 'marketId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['market'],
				operation: ['getMarket', 'getMarketDebt', 'getCreditCapacity', 'getUtilization', 'getPrice'],
			},
		},
		default: '',
		placeholder: '100',
		description: 'The market ID',
	},

	// Market Type
	{
		displayName: 'Market Type',
		name: 'marketType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['market'],
				operation: ['getMarkets', 'getMarket'],
			},
		},
		options: [
			{ name: 'All', value: 'all' },
			{ name: 'Perps', value: 'perps' },
			{ name: 'Spot', value: 'spot' },
		],
		default: 'all',
		description: 'Filter by market type',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	switch (operation) {
		case 'getMarket': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			if (credentialType === 'api') {
				const client = await createSubgraphClient(this, 'synthetixApi');
				const market = await client.getMarket(marketId);
				return market as unknown as IDataObject;
			} else {
				const client = await createSubgraphClient(this, 'synthetixNetwork');
				const market = await client.getMarket(marketId);
				return market as unknown as IDataObject;
			}
		}

		case 'getMarkets': {
			const marketType = this.getNodeParameter('marketType', itemIndex) as string;
			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const markets = await client.getMarkets(50);

			if (marketType === 'all') {
				return markets as unknown as IDataObject[];
			}

			// Filter by type - this is approximate based on ID ranges
			return markets.filter((m) => {
				const id = Number(m.id);
				if (marketType === 'perps') return id >= 100;
				if (marketType === 'spot') return id < 100;
				return true;
			}) as unknown as IDataObject[];
		}

		case 'getMarketDebt': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const market = await client.getMarket(marketId);

			return {
				marketId,
				reportedDebt: market?.reportedDebt || '0',
				creditCapacity: market?.creditCapacity || '0',
			};
		}

		case 'getCreditCapacity': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const market = await client.getMarket(marketId);

			return {
				marketId,
				creditCapacity: market?.creditCapacity || '0',
				reportedDebt: market?.reportedDebt || '0',
				availableCapacity: market ? (BigInt(market.creditCapacity) - BigInt(market.reportedDebt)).toString() : '0',
			};
		}

		case 'getUtilization': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const market = await client.getMarket(marketId);

			if (!market || market.creditCapacity === '0') {
				return {
					marketId,
					utilization: '0',
					utilizationPercentage: '0%',
				};
			}

			const utilization = (BigInt(market.reportedDebt) * BigInt(10000)) / BigInt(market.creditCapacity);

			return {
				marketId,
				reportedDebt: market.reportedDebt,
				creditCapacity: market.creditCapacity,
				utilization: (Number(utilization) / 100).toFixed(2),
				utilizationPercentage: `${(Number(utilization) / 100).toFixed(2)}%`,
			};
		}

		case 'getPrice': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			// Try perps client first for perps markets
			try {
				const { createPerpsClient } = await import('../../transport/perpsClient');
				const perpsClient = await createPerpsClient(this);
				const price = await perpsClient.getIndexPrice(BigInt(marketId));

				return {
					marketId,
					price: (Number(price) / 1e18).toFixed(4),
					priceRaw: price.toString(),
					source: 'perps',
				};
			} catch {
				// Fall back to subgraph
				const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
				const market = await client.getMarket(marketId);

				return {
					marketId,
					price: market?.price || '0',
					source: 'subgraph',
				};
			}
		}

		case 'listPerpsMarkets': {
			const client = await createSynthetixClient(this);
			const network = client.getNetwork();
			const markets = PERPS_MARKETS[network] || {};

			return Object.entries(markets).map(([id, config]) => ({
				marketId: id,
				name: config.name,
				symbol: config.symbol,
				baseAsset: config.baseAsset,
				maxLeverage: config.maxLeverage,
			}));
		}

		case 'listSpotMarkets': {
			const client = await createSynthetixClient(this);
			const network = client.getNetwork();
			const markets = SPOT_MARKETS[network] || {};

			return Object.entries(markets).map(([id, config]) => ({
				marketId: id,
				name: config.name,
				symbol: config.symbol,
				synthAddress: config.synthAddress,
			}));
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
