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
import { createSynthetixClient } from '../../transport/synthetixClient';
import { createSpotClient } from '../../transport/spotClient';
import { createPerpsClient } from '../../transport/perpsClient';
import { formatWei } from '../../utils/weiUtils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['fee'],
			},
		},
		options: [
			{ name: 'Get Collateral Fees', value: 'getCollateralFees', description: 'Get collateral configuration fees', action: 'Get collateral fees' },
			{ name: 'Get Spot Market Fees', value: 'getSpotFees', description: 'Get spot market fee config', action: 'Get spot market fees' },
			{ name: 'Get Perps Order Fees', value: 'getPerpsOrderFees', description: 'Estimate perps order fees', action: 'Get perps order fees' },
		],
		default: 'getCollateralFees',
	},

	// Collateral Type
	{
		displayName: 'Collateral Type',
		name: 'collateralType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['fee'],
				operation: ['getCollateralFees'],
			},
		},
		default: '',
		placeholder: '0x... (token address)',
		description: 'Address of the collateral token',
	},

	// Market ID
	{
		displayName: 'Market ID',
		name: 'marketId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['fee'],
				operation: ['getSpotFees', 'getPerpsOrderFees'],
			},
		},
		default: '',
		description: 'The market ID',
	},

	// Size for perps fees
	{
		displayName: 'Order Size',
		name: 'orderSize',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['fee'],
				operation: ['getPerpsOrderFees'],
			},
		},
		default: '1',
		description: 'Order size to estimate fees for',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'getCollateralFees': {
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const client = await createSynthetixClient(this);
			const config = await client.getCollateralConfiguration(collateralType);

			return {
				collateralType,
				liquidationReward: formatWei(config.liquidationRewardD18),
				liquidationRewardPercentage: (Number(config.liquidationRewardD18) / 1e18 * 100).toFixed(4) + '%',
			};
		}

		case 'getSpotFees': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const client = await createSpotClient(this);
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

		case 'getPerpsOrderFees': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;
			const orderSize = this.getNodeParameter('orderSize', itemIndex) as string;
			const client = await createPerpsClient(this);

			const { toWei } = await import('../../utils/weiUtils');
			const sizeWei = toWei(orderSize);
			const fees = await client.computeOrderFees(BigInt(marketId), sizeWei);

			return {
				marketId,
				orderSize,
				orderFees: formatWei(fees.orderFees),
				fillPrice: formatWei(fees.fillPrice),
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
