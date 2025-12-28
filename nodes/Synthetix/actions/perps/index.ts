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
import { createPerpsClient } from '../../transport/perpsClient';
import { createSubgraphClient } from '../../transport/subgraphClient';
import { toWei, formatWei } from '../../utils/weiUtils';
import { isValidAccountId } from '../../utils/accountUtils';
import { PERPS_MARKETS } from '../../constants/markets';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['perps'],
			},
		},
		options: [
			{ name: 'Get Perps Market', value: 'getMarket', description: 'Get perpetual market details', action: 'Get perps market' },
			{ name: 'Get Perps Markets', value: 'getMarkets', description: 'Get all perpetual markets', action: 'Get perps markets' },
			{ name: 'Get Position', value: 'getPosition', description: 'Get open position', action: 'Get position' },
			{ name: 'Get Open Interest', value: 'getOpenInterest', description: 'Get market open interest', action: 'Get open interest' },
			{ name: 'Get Funding Rate', value: 'getFundingRate', description: 'Get current funding rate', action: 'Get funding rate' },
			{ name: 'Get Index Price', value: 'getIndexPrice', description: 'Get market index price', action: 'Get index price' },
			{ name: 'Get Fill Price', value: 'getFillPrice', description: 'Get fill price for size', action: 'Get fill price' },
			{ name: 'Compute Order Fees', value: 'computeOrderFees', description: 'Calculate order fees', action: 'Compute order fees' },
			{ name: 'Commit Order', value: 'commitOrder', description: 'Submit a perps order', action: 'Commit order' },
			{ name: 'Settle Order', value: 'settleOrder', description: 'Settle pending order', action: 'Settle order' },
			{ name: 'Cancel Order', value: 'cancelOrder', description: 'Cancel pending order', action: 'Cancel order' },
			{ name: 'Get Pending Order', value: 'getPendingOrder', description: 'Get pending order details', action: 'Get pending order' },
			{ name: 'Modify Collateral', value: 'modifyCollateral', description: 'Add/remove margin', action: 'Modify collateral' },
			{ name: 'Get Available Margin', value: 'getAvailableMargin', description: 'Get available margin', action: 'Get available margin' },
			{ name: 'Check Liquidatable', value: 'canLiquidate', description: 'Check if position can be liquidated', action: 'Check liquidatable' },
			{ name: 'Liquidate Position', value: 'liquidate', description: 'Liquidate undercollateralized position', action: 'Liquidate position' },
		],
		default: 'getMarkets',
	},

	// Account ID
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['perps'],
				operation: ['getPosition', 'commitOrder', 'settleOrder', 'cancelOrder', 'getPendingOrder', 'modifyCollateral', 'getAvailableMargin', 'canLiquidate', 'liquidate'],
			},
		},
		default: '',
		placeholder: '123456789',
		description: 'The Synthetix account ID',
	},

	// Market ID
	{
		displayName: 'Market ID',
		name: 'marketId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['perps'],
				operation: ['getMarket', 'getPosition', 'getOpenInterest', 'getFundingRate', 'getIndexPrice', 'getFillPrice', 'computeOrderFees', 'commitOrder'],
			},
		},
		default: '100',
		placeholder: '100 (ETH), 200 (BTC)',
		description: 'The perps market ID',
	},

	// Size Delta for orders
	{
		displayName: 'Size Delta',
		name: 'sizeDelta',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['perps'],
				operation: ['commitOrder', 'getFillPrice', 'computeOrderFees'],
			},
		},
		default: '',
		placeholder: '1.0 (long) or -1.0 (short)',
		description: 'Position size change. Positive for long, negative for short.',
	},

	// Acceptable Price
	{
		displayName: 'Acceptable Price',
		name: 'acceptablePrice',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['perps'],
				operation: ['commitOrder'],
			},
		},
		default: '',
		placeholder: '3000.00',
		description: 'Maximum acceptable fill price for longs, minimum for shorts',
	},

	// Settlement Strategy ID
	{
		displayName: 'Settlement Strategy ID',
		name: 'settlementStrategyId',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['perps'],
				operation: ['commitOrder'],
			},
		},
		default: 0,
		description: 'Settlement strategy (0 = default)',
	},

	// Synth Market ID for collateral
	{
		displayName: 'Synth Market ID',
		name: 'synthMarketId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['perps'],
				operation: ['modifyCollateral'],
			},
		},
		default: '0',
		placeholder: '0 (snxUSD)',
		description: 'Synth market ID for collateral (0 = snxUSD)',
	},

	// Amount Delta for collateral
	{
		displayName: 'Amount Delta',
		name: 'amountDelta',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['perps'],
				operation: ['modifyCollateral'],
			},
		},
		default: '',
		placeholder: '100.0 (deposit) or -100.0 (withdraw)',
		description: 'Collateral change. Positive to deposit, negative to withdraw.',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	// Check perps availability for write operations
	if (['commitOrder', 'settleOrder', 'cancelOrder', 'modifyCollateral', 'liquidate'].includes(operation)) {
		if (credentialType !== 'network') {
			throw new NodeOperationError(this.getNode(), `${operation} requires network credentials`, { itemIndex });
		}
	}

	const client = await createPerpsClient(this);

	switch (operation) {
		case 'getMarket': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			const metadata = await client.getMarketMetadata(BigInt(marketId));
			const summary = await client.getMarketSummary(BigInt(marketId));

			return {
				marketId,
				name: metadata.name,
				symbol: metadata.symbol,
				skew: formatWei(summary.skew),
				size: formatWei(summary.size),
				maxOpenInterest: formatWei(summary.maxOpenInterest),
				currentFundingRate: (Number(summary.currentFundingRate) / 1e18 * 100).toFixed(6) + '%',
				currentFundingVelocity: formatWei(summary.currentFundingVelocity),
				indexPrice: formatWei(summary.indexPrice),
			};
		}

		case 'getMarkets': {
			const network = client.getNetwork();
			const markets = PERPS_MARKETS[network] || {};

			const results: IDataObject[] = [];
			for (const [id, config] of Object.entries(markets)) {
				try {
					const summary = await client.getMarketSummary(BigInt(id));
					results.push({
						marketId: id,
						name: config.name,
						symbol: config.symbol,
						baseAsset: config.baseAsset,
						maxLeverage: config.maxLeverage,
						size: formatWei(summary.size),
						indexPrice: formatWei(summary.indexPrice),
						fundingRate: (Number(summary.currentFundingRate) / 1e18 * 100).toFixed(6) + '%',
					});
				} catch {
					results.push({
						marketId: id,
						name: config.name,
						symbol: config.symbol,
						error: 'Failed to fetch market data',
					});
				}
			}
			return results;
		}

		case 'getPosition': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const position = await client.getOpenPosition(BigInt(accountId), BigInt(marketId));

			return {
				accountId,
				marketId,
				positionSize: formatWei(position.positionSize),
				totalPnl: formatWei(position.totalPnl),
				accruedFunding: formatWei(position.accruedFunding),
				isLong: BigInt(position.positionSize.toString()) > 0n,
				isShort: BigInt(position.positionSize.toString()) < 0n,
				hasPosition: BigInt(position.positionSize.toString()) !== 0n,
			};
		}

		case 'getOpenInterest': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			const size = await client.getSize(BigInt(marketId));
			const skew = await client.getSkew(BigInt(marketId));

			const longOI = (BigInt(size.toString()) + BigInt(skew.toString())) / 2n;
			const shortOI = (BigInt(size.toString()) - BigInt(skew.toString())) / 2n;

			return {
				marketId,
				totalOpenInterest: formatWei(size),
				skew: formatWei(skew),
				longOpenInterest: formatWei(longOI),
				shortOpenInterest: formatWei(shortOI),
			};
		}

		case 'getFundingRate': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			const rate = await client.getFundingRate(BigInt(marketId));
			const velocity = await client.getFundingVelocity(BigInt(marketId));

			// Annualize the rate (rate is per second)
			const hourlyRate = Number(rate) / 1e18 * 3600;
			const dailyRate = hourlyRate * 24;
			const annualRate = dailyRate * 365;

			return {
				marketId,
				currentRate: (Number(rate) / 1e18).toFixed(10),
				hourlyRate: (hourlyRate * 100).toFixed(6) + '%',
				dailyRate: (dailyRate * 100).toFixed(4) + '%',
				annualizedRate: (annualRate * 100).toFixed(2) + '%',
				velocity: formatWei(velocity),
			};
		}

		case 'getIndexPrice': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			const price = await client.getIndexPrice(BigInt(marketId));

			return {
				marketId,
				indexPrice: formatWei(price),
				indexPriceRaw: price.toString(),
			};
		}

		case 'getFillPrice': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const sizeDelta = this.getNodeParameter('sizeDelta', itemIndex) as string;

			const sizeDeltaWei = toWei(sizeDelta);
			const fillPrice = await client.getFillPrice(BigInt(marketId), sizeDeltaWei);

			return {
				marketId,
				sizeDelta,
				fillPrice: formatWei(fillPrice),
				fillPriceRaw: fillPrice.toString(),
			};
		}

		case 'computeOrderFees': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const sizeDelta = this.getNodeParameter('sizeDelta', itemIndex) as string;

			const sizeDeltaWei = toWei(sizeDelta);
			const fees = await client.computeOrderFees(BigInt(marketId), sizeDeltaWei);

			return {
				marketId,
				sizeDelta,
				orderFees: formatWei(fees.orderFees),
				fillPrice: formatWei(fees.fillPrice),
			};
		}

		case 'commitOrder': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const sizeDelta = this.getNodeParameter('sizeDelta', itemIndex) as string;
			const acceptablePrice = this.getNodeParameter('acceptablePrice', itemIndex) as string;
			const settlementStrategyId = this.getNodeParameter('settlementStrategyId', itemIndex) as number;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const commitment = {
				marketId: BigInt(marketId),
				accountId: BigInt(accountId),
				sizeDelta: toWei(sizeDelta),
				settlementStrategyId: BigInt(settlementStrategyId),
				acceptablePrice: toWei(acceptablePrice),
				trackingCode: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}`,
				referrer: '0x0000000000000000000000000000000000000000' as `0x${string}`,
			};

			const result = await client.commitOrder(commitment);

			return {
				success: true,
				accountId,
				marketId,
				sizeDelta,
				acceptablePrice,
				settlementStrategyId,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'settleOrder': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const result = await client.settleOrder(BigInt(accountId));

			return {
				success: true,
				accountId,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'cancelOrder': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const result = await client.cancelOrder(BigInt(accountId));

			return {
				success: true,
				accountId,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getPendingOrder': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const order = await client.getOrder(BigInt(accountId));

			return {
				accountId,
				...order,
				sizeDelta: formatWei(order.sizeDelta),
				acceptablePrice: formatWei(order.acceptablePrice),
				commitmentTime: order.commitmentTime.toString(),
			};
		}

		case 'modifyCollateral': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const synthMarketId = this.getNodeParameter('synthMarketId', itemIndex) as string;
			const amountDelta = this.getNodeParameter('amountDelta', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const result = await client.modifyCollateral(
				BigInt(accountId),
				BigInt(synthMarketId),
				toWei(amountDelta),
			);

			return {
				success: true,
				accountId,
				synthMarketId,
				amountDelta,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getAvailableMargin': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const margin = await client.getAvailableMargin(BigInt(accountId));
			const totalCollateral = await client.getTotalCollateralValue(BigInt(accountId));
			const requiredMargins = await client.getRequiredMargins(BigInt(accountId));

			return {
				accountId,
				availableMargin: formatWei(margin),
				totalCollateralValue: formatWei(totalCollateral),
				requiredInitialMargin: formatWei(requiredMargins.requiredInitialMargin),
				requiredMaintenanceMargin: formatWei(requiredMargins.requiredMaintenanceMargin),
				maxLiquidationReward: formatWei(requiredMargins.maxLiquidationReward),
			};
		}

		case 'canLiquidate': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const canLiq = await client.canLiquidate(BigInt(accountId));

			return {
				accountId,
				canLiquidate: canLiq,
			};
		}

		case 'liquidate': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const canLiq = await client.canLiquidate(BigInt(accountId));
			if (!canLiq) {
				throw new NodeOperationError(this.getNode(), 'Position cannot be liquidated', { itemIndex });
			}

			const result = await client.liquidate(BigInt(accountId));

			return {
				success: true,
				accountId,
				amountLiquidated: formatWei(result.amountLiquidated),
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
