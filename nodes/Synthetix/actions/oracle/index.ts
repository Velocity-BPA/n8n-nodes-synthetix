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
import { ORACLE_NODES, ORACLE_TYPES } from '../../constants/oracles';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['oracle'],
			},
		},
		options: [
			{ name: 'Get Oracle Nodes', value: 'getNodes', description: 'Get configured oracle nodes', action: 'Get oracle nodes' },
			{ name: 'Get Oracle Price', value: 'getPrice', description: 'Get price from oracle node', action: 'Get oracle price' },
			{ name: 'Get Oracle Types', value: 'getTypes', description: 'Get supported oracle types', action: 'Get oracle types' },
			{ name: 'Get Collateral Price', value: 'getCollateralPrice', description: 'Get price for collateral type', action: 'Get collateral price' },
		],
		default: 'getNodes',
	},

	// Oracle Node ID
	{
		displayName: 'Oracle Node ID',
		name: 'oracleNodeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['oracle'],
				operation: ['getPrice'],
			},
		},
		default: '',
		placeholder: '0x... (bytes32)',
		description: 'The oracle node ID (bytes32)',
	},

	// Collateral Type
	{
		displayName: 'Collateral Type',
		name: 'collateralType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['oracle'],
				operation: ['getCollateralPrice'],
			},
		},
		default: '',
		placeholder: '0x... (token address)',
		description: 'Address of the collateral token',
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
		case 'getNodes': {
			const nodes = ORACLE_NODES[network] || {};

			return Object.entries(nodes).map(([id, config]) => ({
				nodeId: id,
				name: config.name,
				asset: config.asset,
				oracleType: config.oracleType,
				description: config.description,
			}));
		}

		case 'getPrice': {
			const oracleNodeId = this.getNodeParameter('oracleNodeId', itemIndex) as string;

			// Note: Oracle price fetching requires OracleManager contract interaction
			// This is a simplified version - in production, call the OracleManager
			return {
				oracleNodeId,
				note: 'Direct oracle price queries require OracleManager contract. Use getCollateralPrice for collateral prices.',
			};
		}

		case 'getTypes': {
			return Object.entries(ORACLE_TYPES).map(([key, value]) => ({
				type: key,
				description: value,
			}));
		}

		case 'getCollateralPrice': {
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			// Get price from collateral configuration
			const config = await client.getCollateralConfiguration(collateralType);

			// The price is embedded in position calculations
			// Get a sample position to derive price
			return {
				collateralType,
				oracleNodeId: config.oracleNodeId,
				note: 'Use account position or vault collateral value to derive current price',
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
