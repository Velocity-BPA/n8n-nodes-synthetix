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
import { formatWei } from '../../utils/weiUtils';
import { isValidAddress } from '../../utils/accountUtils';
import { CONTRACT_ADDRESSES } from '../../constants/contracts';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['snxToken'],
			},
		},
		options: [
			{ name: 'Get SNX Balance', value: 'getBalance', description: 'Get SNX token balance', action: 'Get snx balance' },
			{ name: 'Get SNX Contract', value: 'getContract', description: 'Get SNX token contract address', action: 'Get snx contract' },
		],
		default: 'getBalance',
	},

	// Address
	{
		displayName: 'Address',
		name: 'address',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['snxToken'],
				operation: ['getBalance'],
			},
		},
		default: '',
		placeholder: '0x...',
		description: 'Address to check balance for',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const client = await createSynthetixClient(this);
	const network = client.getNetwork();

	switch (operation) {
		case 'getBalance': {
			const address = this.getNodeParameter('address', itemIndex) as string;

			if (!isValidAddress(address)) {
				throw new NodeOperationError(this.getNode(), `Invalid address: ${address}`, { itemIndex });
			}

			const contracts = CONTRACT_ADDRESSES[network];
			if (!contracts?.SNXToken) {
				return {
					address,
					error: 'SNX token not available on this network',
				};
			}

			// Note: This would require a separate ERC20 call
			return {
				address,
				snxToken: contracts.SNXToken,
				note: 'Use ERC20 balanceOf call to get SNX balance',
			};
		}

		case 'getContract': {
			const contracts = CONTRACT_ADDRESSES[network];

			return {
				network,
				snxToken: contracts?.SNXToken || 'Not available',
				coreProxy: contracts?.CoreProxy || 'Not available',
				accountProxy: contracts?.AccountProxy || 'Not available',
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
