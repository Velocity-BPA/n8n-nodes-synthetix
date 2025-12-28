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
import { createSpotClient } from '../../transport/spotClient';
import { toWei, formatWei } from '../../utils/weiUtils';
import { SPOT_MARKETS } from '../../constants/markets';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['spot'],
			},
		},
		options: [
			{ name: 'Get Spot Market', value: 'getMarket', description: 'Get spot market details', action: 'Get spot market' },
			{ name: 'Get Spot Markets', value: 'getMarkets', description: 'Get all spot markets', action: 'Get spot markets' },
			{ name: 'Get Synth Price', value: 'getSynthPrice', description: 'Get synth price', action: 'Get synth price' },
			{ name: 'Wrap Collateral', value: 'wrap', description: 'Wrap collateral to synth', action: 'Wrap collateral' },
			{ name: 'Unwrap Collateral', value: 'unwrap', description: 'Unwrap synth to collateral', action: 'Unwrap collateral' },
			{ name: 'Buy Synth', value: 'buy', description: 'Buy synth with USD', action: 'Buy synth' },
			{ name: 'Sell Synth', value: 'sell', description: 'Sell synth for USD', action: 'Sell synth' },
			{ name: 'Quote Buy', value: 'quoteBuy', description: 'Get quote for buying synth', action: 'Quote buy' },
			{ name: 'Quote Sell', value: 'quoteSell', description: 'Get quote for selling synth', action: 'Quote sell' },
			{ name: 'Get Market Fees', value: 'getFees', description: 'Get market fee configuration', action: 'Get market fees' },
			{ name: 'Get Wrapper Info', value: 'getWrapper', description: 'Get wrapper configuration', action: 'Get wrapper info' },
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
				resource: ['spot'],
				operation: ['getMarket', 'getSynthPrice', 'wrap', 'unwrap', 'buy', 'sell', 'quoteBuy', 'quoteSell', 'getFees', 'getWrapper'],
			},
		},
		default: '1',
		placeholder: '1 (sUSD), 2 (sETH)',
		description: 'The spot market ID',
	},

	// Amount for trades/wraps
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['spot'],
				operation: ['wrap', 'unwrap', 'buy', 'sell', 'quoteBuy', 'quoteSell'],
			},
		},
		default: '',
		placeholder: '100.0',
		description: 'Amount to trade/wrap',
	},

	// Min Amount Out for trades
	{
		displayName: 'Minimum Amount Out',
		name: 'minAmountOut',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['spot'],
				operation: ['buy', 'sell', 'wrap', 'unwrap'],
			},
		},
		default: '0',
		placeholder: '99.0',
		description: 'Minimum amount to receive (slippage protection)',
	},

	// Referrer
	{
		displayName: 'Referrer',
		name: 'referrer',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['spot'],
				operation: ['buy', 'sell'],
			},
		},
		default: '0x0000000000000000000000000000000000000000',
		description: 'Referrer address for fee sharing',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	// Check for write operations
	if (['wrap', 'unwrap', 'buy', 'sell'].includes(operation)) {
		if (credentialType !== 'network') {
			throw new NodeOperationError(this.getNode(), `${operation} requires network credentials`, { itemIndex });
		}
	}

	const client = await createSpotClient(this);

	switch (operation) {
		case 'getMarket': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			const name = await client.getMarketName(BigInt(marketId));
			const synth = await client.getSynth(BigInt(marketId));
			const utilization = await client.getMarketUtilization(BigInt(marketId));
			const fees = await client.getMarketFees(BigInt(marketId));

			return {
				marketId,
				name,
				synthAddress: synth,
				utilization: (Number(utilization.utilizationRate) / 1e18 * 100).toFixed(2) + '%',
				delegatedCollateral: formatWei(utilization.delegatedCollateral),
				lockedCredit: formatWei(utilization.lockedCredit),
				atomicFixedFee: formatWei(fees.atomicFixedFee),
				asyncFixedFee: formatWei(fees.asyncFixedFee),
				wrapFee: formatWei(fees.wrapFee),
				unwrapFee: formatWei(fees.unwrapFee),
			};
		}

		case 'getMarkets': {
			const network = client.getNetwork();
			const markets = SPOT_MARKETS[network] || {};

			const results: IDataObject[] = [];
			for (const [id, config] of Object.entries(markets)) {
				try {
					const name = await client.getMarketName(BigInt(id));
					results.push({
						marketId: id,
						name,
						symbol: config.symbol,
						synthAddress: config.synthAddress,
					});
				} catch {
					results.push({
						marketId: id,
						symbol: config.symbol,
						error: 'Failed to fetch market data',
					});
				}
			}
			return results;
		}

		case 'getSynthPrice': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			// Get price via quote
			const oneUnit = toWei('1');
			const quote = await client.quoteBuyExactIn(BigInt(marketId), oneUnit, 0n);

			return {
				marketId,
				price: formatWei(quote.synthAmount),
				note: 'Price represents 1 USD worth of synth',
			};
		}

		case 'wrap': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;
			const minAmountOut = this.getNodeParameter('minAmountOut', itemIndex) as string;

			const amountWei = toWei(amount);
			const minAmountWei = toWei(minAmountOut || '0');

			const result = await client.wrap(BigInt(marketId), amountWei, minAmountWei);

			return {
				success: true,
				marketId,
				amountWrapped: amount,
				synthReceived: formatWei(result.synthAmount),
				fees: {
					fixedFees: formatWei(result.fees.fixedFees),
					utilizationFees: formatWei(result.fees.utilizationFees),
					skewFees: formatWei(result.fees.skewFees),
					wrapperFees: formatWei(result.fees.wrapperFees),
				},
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'unwrap': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;
			const minAmountOut = this.getNodeParameter('minAmountOut', itemIndex) as string;

			const amountWei = toWei(amount);
			const minAmountWei = toWei(minAmountOut || '0');

			const result = await client.unwrap(BigInt(marketId), amountWei, minAmountWei);

			return {
				success: true,
				marketId,
				synthUnwrapped: amount,
				collateralReceived: formatWei(result.collateralAmount),
				fees: {
					fixedFees: formatWei(result.fees.fixedFees),
					utilizationFees: formatWei(result.fees.utilizationFees),
					skewFees: formatWei(result.fees.skewFees),
					wrapperFees: formatWei(result.fees.wrapperFees),
				},
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'buy': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;
			const minAmountOut = this.getNodeParameter('minAmountOut', itemIndex) as string;
			const referrer = this.getNodeParameter('referrer', itemIndex) as string;

			const amountWei = toWei(amount);
			const minAmountWei = toWei(minAmountOut || '0');

			const result = await client.buyExactIn(
				BigInt(marketId),
				amountWei,
				minAmountWei,
				referrer as `0x${string}`,
			);

			return {
				success: true,
				marketId,
				usdSpent: amount,
				synthReceived: formatWei(result.synthAmount),
				fees: {
					fixedFees: formatWei(result.fees.fixedFees),
					utilizationFees: formatWei(result.fees.utilizationFees),
					skewFees: formatWei(result.fees.skewFees),
					wrapperFees: formatWei(result.fees.wrapperFees),
				},
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'sell': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;
			const minAmountOut = this.getNodeParameter('minAmountOut', itemIndex) as string;
			const referrer = this.getNodeParameter('referrer', itemIndex) as string;

			const amountWei = toWei(amount);
			const minAmountWei = toWei(minAmountOut || '0');

			const result = await client.sellExactIn(
				BigInt(marketId),
				amountWei,
				minAmountWei,
				referrer as `0x${string}`,
			);

			return {
				success: true,
				marketId,
				synthSold: amount,
				usdReceived: formatWei(result.usdAmount),
				fees: {
					fixedFees: formatWei(result.fees.fixedFees),
					utilizationFees: formatWei(result.fees.utilizationFees),
					skewFees: formatWei(result.fees.skewFees),
					wrapperFees: formatWei(result.fees.wrapperFees),
				},
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'quoteBuy': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;

			const amountWei = toWei(amount);
			const quote = await client.quoteBuyExactIn(BigInt(marketId), amountWei, 0n);

			return {
				marketId,
				usdIn: amount,
				synthOut: formatWei(quote.synthAmount),
				fees: {
					fixedFees: formatWei(quote.fees.fixedFees),
					utilizationFees: formatWei(quote.fees.utilizationFees),
					skewFees: formatWei(quote.fees.skewFees),
					wrapperFees: formatWei(quote.fees.wrapperFees),
				},
			};
		}

		case 'quoteSell': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;

			const amountWei = toWei(amount);
			const quote = await client.quoteSellExactIn(BigInt(marketId), amountWei, 0n);

			return {
				marketId,
				synthIn: amount,
				usdOut: formatWei(quote.usdAmount),
				fees: {
					fixedFees: formatWei(quote.fees.fixedFees),
					utilizationFees: formatWei(quote.fees.utilizationFees),
					skewFees: formatWei(quote.fees.skewFees),
					wrapperFees: formatWei(quote.fees.wrapperFees),
				},
			};
		}

		case 'getFees': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			const fees = await client.getMarketFees(BigInt(marketId));

			return {
				marketId,
				atomicFixedFee: formatWei(fees.atomicFixedFee),
				atomicFixedFeePercentage: (Number(fees.atomicFixedFee) / 1e18 * 100).toFixed(4) + '%',
				asyncFixedFee: formatWei(fees.asyncFixedFee),
				asyncFixedFeePercentage: (Number(fees.asyncFixedFee) / 1e18 * 100).toFixed(4) + '%',
				wrapFee: formatWei(fees.wrapFee),
				wrapFeePercentage: (Number(fees.wrapFee) / 1e18 * 100).toFixed(4) + '%',
				unwrapFee: formatWei(fees.unwrapFee),
				unwrapFeePercentage: (Number(fees.unwrapFee) / 1e18 * 100).toFixed(4) + '%',
			};
		}

		case 'getWrapper': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			const wrapper = await client.getWrapper(BigInt(marketId));

			return {
				marketId,
				wrapCollateralType: wrapper.wrapCollateralType,
				maxWrappableAmount: formatWei(wrapper.maxWrappableAmount),
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
