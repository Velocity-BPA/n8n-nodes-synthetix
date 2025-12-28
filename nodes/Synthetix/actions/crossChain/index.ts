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
import { NETWORKS } from '../../constants/networks';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['crossChain'],
			},
		},
		options: [
			{ name: 'Get Supported Chains', value: 'getSupportedChains', description: 'Get supported networks', action: 'Get supported chains' },
			{ name: 'Get Chain Info', value: 'getChainInfo', description: 'Get chain configuration', action: 'Get chain info' },
		],
		default: 'getSupportedChains',
	},

	// Chain ID
	{
		displayName: 'Chain ID',
		name: 'chainId',
		type: 'string',
		displayOptions: {
			show: {
				resource: ['crossChain'],
				operation: ['getChainInfo'],
			},
		},
		default: '',
		placeholder: '10 (Optimism)',
		description: 'The chain ID to get info for',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'getSupportedChains': {
			return Object.entries(NETWORKS).map(([name, config]) => ({
				name,
				chainId: config.chainId,
				rpcUrl: config.rpcUrl,
				blockExplorer: config.blockExplorer,
				nativeCurrency: config.nativeCurrency,
				hasSynthetix: true,
			}));
		}

		case 'getChainInfo': {
			const chainId = this.getNodeParameter('chainId', itemIndex) as string;

			const network = Object.entries(NETWORKS).find(([, config]) => config.chainId.toString() === chainId);

			if (!network) {
				throw new NodeOperationError(this.getNode(), `Unsupported chain ID: ${chainId}`, { itemIndex });
			}

			const [name, config] = network;

			return {
				name,
				chainId: config.chainId,
				rpcUrl: config.rpcUrl,
				blockExplorer: config.blockExplorer,
				subgraphUrl: config.subgraphUrl,
				nativeCurrency: config.nativeCurrency,
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
