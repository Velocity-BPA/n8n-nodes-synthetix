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

import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as account from './actions/account';
import * as collateral from './actions/collateral';
import * as pool from './actions/pool';
import * as market from './actions/market';
import * as delegation from './actions/delegation';
import * as vault from './actions/vault';
import * as debt from './actions/debt';
import * as rewards from './actions/rewards';
import * as liquidation from './actions/liquidation';
import * as perps from './actions/perps';
import * as spot from './actions/spot';
import * as snxUsd from './actions/snxUsd';
import * as oracle from './actions/oracle';
import * as fee from './actions/fee';
import * as crossChain from './actions/crossChain';
import * as snxToken from './actions/snxToken';
import * as governance from './actions/governance';
import * as permission from './actions/permission';
import * as configuration from './actions/configuration';
import * as analytics from './actions/analytics';
import * as subgraph from './actions/subgraph';
import * as utility from './actions/utility';

// Show licensing notice once
let licensingNoticeShown = false;

export class Synthetix implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Synthetix',
		name: 'synthetix',
		icon: 'file:synthetix.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Interact with Synthetix v3 protocol for DeFi operations',
		defaults: {
			name: 'Synthetix',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'synthetixNetwork',
				required: true,
				displayOptions: {
					show: {
						credentialType: ['network'],
					},
				},
			},
			{
				name: 'synthetixApi',
				required: true,
				displayOptions: {
					show: {
						credentialType: ['api'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Credential Type',
				name: 'credentialType',
				type: 'options',
				options: [
					{
						name: 'Network (Blockchain)',
						value: 'network',
						description: 'Direct blockchain interaction via RPC',
					},
					{
						name: 'API (Subgraph)',
						value: 'api',
						description: 'Query indexed data via subgraph',
					},
				],
				default: 'network',
				description: 'Type of credentials to use',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account', description: 'Manage Synthetix accounts (NFTs)' },
					{ name: 'Analytics', value: 'analytics', description: 'Protocol analytics and statistics' },
					{ name: 'Collateral', value: 'collateral', description: 'Deposit and manage collateral' },
					{ name: 'Configuration', value: 'configuration', description: 'System configuration' },
					{ name: 'Cross-Chain', value: 'crossChain', description: 'Cross-chain operations' },
					{ name: 'Debt', value: 'debt', description: 'Debt management operations' },
					{ name: 'Delegation', value: 'delegation', description: 'Delegate collateral to pools' },
					{ name: 'Fee', value: 'fee', description: 'Fee management' },
					{ name: 'Governance', value: 'governance', description: 'Governance operations' },
					{ name: 'Liquidation', value: 'liquidation', description: 'Liquidation operations' },
					{ name: 'Market', value: 'market', description: 'Market operations' },
					{ name: 'Oracle', value: 'oracle', description: 'Oracle price feeds' },
					{ name: 'Permission', value: 'permission', description: 'Account permissions' },
					{ name: 'Perps', value: 'perps', description: 'Perpetual futures trading' },
					{ name: 'Pool', value: 'pool', description: 'Liquidity pool operations' },
					{ name: 'Rewards', value: 'rewards', description: 'Rewards management' },
					{ name: 'SNX Token', value: 'snxToken', description: 'SNX token operations' },
					{ name: 'snxUSD', value: 'snxUsd', description: 'snxUSD stablecoin operations' },
					{ name: 'Spot', value: 'spot', description: 'Spot market operations' },
					{ name: 'Subgraph', value: 'subgraph', description: 'GraphQL subgraph queries' },
					{ name: 'Utility', value: 'utility', description: 'Helper utilities' },
					{ name: 'Vault', value: 'vault', description: 'Vault operations' },
				],
				default: 'account',
			},

			// Account Operations
			...account.description,

			// Collateral Operations
			...collateral.description,

			// Pool Operations
			...pool.description,

			// Market Operations
			...market.description,

			// Delegation Operations
			...delegation.description,

			// Vault Operations
			...vault.description,

			// Debt Operations
			...debt.description,

			// Rewards Operations
			...rewards.description,

			// Liquidation Operations
			...liquidation.description,

			// Perps Operations
			...perps.description,

			// Spot Operations
			...spot.description,

			// snxUSD Operations
			...snxUsd.description,

			// Oracle Operations
			...oracle.description,

			// Fee Operations
			...fee.description,

			// Cross-Chain Operations
			...crossChain.description,

			// SNX Token Operations
			...snxToken.description,

			// Governance Operations
			...governance.description,

			// Permission Operations
			...permission.description,

			// Configuration Operations
			...configuration.description,

			// Analytics Operations
			...analytics.description,

			// Subgraph Operations
			...subgraph.description,

			// Utility Operations
			...utility.description,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Show licensing notice once per node load
		if (!licensingNoticeShown) {
			console.warn(
				'[Velocity BPA Licensing Notice] This n8n node is licensed under the Business Source License 1.1 (BSL 1.1). ' +
				'Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA. ' +
				'For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.',
			);
			licensingNoticeShown = true;
		}

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: IDataObject | IDataObject[];

				switch (resource) {
					case 'account':
						result = await account.execute.call(this, operation, i);
						break;
					case 'collateral':
						result = await collateral.execute.call(this, operation, i);
						break;
					case 'pool':
						result = await pool.execute.call(this, operation, i);
						break;
					case 'market':
						result = await market.execute.call(this, operation, i);
						break;
					case 'delegation':
						result = await delegation.execute.call(this, operation, i);
						break;
					case 'vault':
						result = await vault.execute.call(this, operation, i);
						break;
					case 'debt':
						result = await debt.execute.call(this, operation, i);
						break;
					case 'rewards':
						result = await rewards.execute.call(this, operation, i);
						break;
					case 'liquidation':
						result = await liquidation.execute.call(this, operation, i);
						break;
					case 'perps':
						result = await perps.execute.call(this, operation, i);
						break;
					case 'spot':
						result = await spot.execute.call(this, operation, i);
						break;
					case 'snxUsd':
						result = await snxUsd.execute.call(this, operation, i);
						break;
					case 'oracle':
						result = await oracle.execute.call(this, operation, i);
						break;
					case 'fee':
						result = await fee.execute.call(this, operation, i);
						break;
					case 'crossChain':
						result = await crossChain.execute.call(this, operation, i);
						break;
					case 'snxToken':
						result = await snxToken.execute.call(this, operation, i);
						break;
					case 'governance':
						result = await governance.execute.call(this, operation, i);
						break;
					case 'permission':
						result = await permission.execute.call(this, operation, i);
						break;
					case 'configuration':
						result = await configuration.execute.call(this, operation, i);
						break;
					case 'analytics':
						result = await analytics.execute.call(this, operation, i);
						break;
					case 'subgraph':
						result = await subgraph.execute.call(this, operation, i);
						break;
					case 'utility':
						result = await utility.execute.call(this, operation, i);
						break;
					default:
						throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`, { itemIndex: i });
				}

				// Handle array results
				if (Array.isArray(result)) {
					for (const item of result) {
						returnData.push({ json: item });
					}
				} else {
					returnData.push({ json: result });
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error instanceof Error ? error.message : String(error),
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
