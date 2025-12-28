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

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['governance'],
			},
		},
		options: [
			{ name: 'Get Governance Info', value: 'getInfo', description: 'Get governance information', action: 'Get governance info' },
		],
		default: 'getInfo',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	switch (operation) {
		case 'getInfo': {
			return {
				note: 'Synthetix governance operates through the Spartan Council',
				councils: [
					{ name: 'Spartan Council', description: 'Primary governance body' },
					{ name: 'Treasury Council', description: 'Manages protocol treasury' },
					{ name: 'Ambassador Council', description: 'External relations' },
				],
				votingPlatform: 'https://governance.synthetix.io',
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
