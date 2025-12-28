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
import { createSubgraphClient } from '../../transport/subgraphClient';
import { formatWei } from '../../utils/weiUtils';
import { POOLS } from '../../constants/pools';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['pool'],
			},
		},
		options: [
			{ name: 'Get Pool', value: 'getPool', description: 'Get pool details', action: 'Get pool' },
			{ name: 'Get Pool Configuration', value: 'getPoolConfiguration', description: 'Get pool market configuration', action: 'Get pool configuration' },
			{ name: 'Get Pool Collateral', value: 'getPoolCollateral', description: 'Get total collateral in pool', action: 'Get pool collateral' },
			{ name: 'Get Pool Debt', value: 'getPoolDebt', description: 'Get total pool debt', action: 'Get pool debt' },
			{ name: 'Get Pool Markets', value: 'getPoolMarkets', description: 'Get markets connected to pool', action: 'Get pool markets' },
			{ name: 'Get Pool Owner', value: 'getPoolOwner', description: 'Get pool owner address', action: 'Get pool owner' },
			{ name: 'Get Vault Debt', value: 'getVaultDebt', description: 'Get debt for specific vault', action: 'Get vault debt' },
			{ name: 'Get Vault Collateral', value: 'getVaultCollateral', description: 'Get collateral for specific vault', action: 'Get vault collateral' },
			{ name: 'List Pools', value: 'listPools', description: 'List all available pools', action: 'List pools' },
		],
		default: 'getPool',
	},

	// Pool ID
	{
		displayName: 'Pool ID',
		name: 'poolId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['pool'],
				operation: ['getPool', 'getPoolConfiguration', 'getPoolCollateral', 'getPoolDebt', 'getPoolMarkets', 'getPoolOwner', 'getVaultDebt', 'getVaultCollateral'],
			},
		},
		default: '1',
		placeholder: '1',
		description: 'The pool ID (Spartan Council Pool = 1)',
	},

	// Collateral Type for vault operations
	{
		displayName: 'Collateral Type',
		name: 'collateralType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['pool'],
				operation: ['getVaultDebt', 'getVaultCollateral', 'getPoolCollateral'],
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
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	switch (operation) {
		case 'getPool': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;

			if (credentialType === 'api') {
				const client = await createSubgraphClient(this, 'synthetixApi');
				const pool = await client.getPool(poolId);
				return pool as unknown as IDataObject;
			} else {
				const client = await createSynthetixClient(this);
				const owner = await client.getPoolOwner(BigInt(poolId));
				const config = await client.getPoolConfiguration(BigInt(poolId));

				return {
					poolId,
					owner,
					marketsCount: config.length,
					markets: config.map((m) => ({
						marketId: m.marketId.toString(),
						weight: formatWei(m.weightD18),
						maxDebtShareValue: formatWei(m.maxDebtShareValueD18),
					})),
				};
			}
		}

		case 'getPoolConfiguration': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const client = await createSynthetixClient(this);
			const config = await client.getPoolConfiguration(BigInt(poolId));

			return {
				poolId,
				markets: config.map((m) => ({
					marketId: m.marketId.toString(),
					weight: formatWei(m.weightD18),
					weightPercentage: `${(Number(m.weightD18) / 1e18 * 100).toFixed(2)}%`,
					maxDebtShareValue: formatWei(m.maxDebtShareValueD18),
				})),
			};
		}

		case 'getPoolCollateral': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const client = await createSynthetixClient(this);
			const collateral = await client.getVaultCollateral(BigInt(poolId), collateralType);

			return {
				poolId,
				collateralType,
				amount: formatWei(collateral.amount),
				value: formatWei(collateral.value),
				amountRaw: collateral.amount.toString(),
				valueRaw: collateral.value.toString(),
			};
		}

		case 'getPoolDebt': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;

			if (credentialType === 'api') {
				const client = await createSubgraphClient(this, 'synthetixApi');
				const pool = await client.getPool(poolId);
				return {
					poolId,
					totalDebt: pool?.totalDebt || '0',
				};
			} else {
				// Pool debt requires iterating vaults - use subgraph for efficiency
				const client = await createSubgraphClient(this, 'synthetixNetwork');
				const pool = await client.getPool(poolId);
				return {
					poolId,
					totalDebt: pool?.totalDebt || '0',
				};
			}
		}

		case 'getPoolMarkets': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const client = await createSynthetixClient(this);
			const config = await client.getPoolConfiguration(BigInt(poolId));

			return config.map((m) => ({
				marketId: m.marketId.toString(),
				weight: formatWei(m.weightD18),
				maxDebtShareValue: formatWei(m.maxDebtShareValueD18),
			}));
		}

		case 'getPoolOwner': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const client = await createSynthetixClient(this);
			const owner = await client.getPoolOwner(BigInt(poolId));

			return {
				poolId,
				owner,
			};
		}

		case 'getVaultDebt': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const client = await createSynthetixClient(this);
			const debt = await client.getVaultDebt(BigInt(poolId), collateralType);

			return {
				poolId,
				collateralType,
				debt: formatWei(debt),
				debtRaw: debt.toString(),
			};
		}

		case 'getVaultCollateral': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const client = await createSynthetixClient(this);
			const collateral = await client.getVaultCollateral(BigInt(poolId), collateralType);

			return {
				poolId,
				collateralType,
				amount: formatWei(collateral.amount),
				value: formatWei(collateral.value),
				amountRaw: collateral.amount.toString(),
				valueRaw: collateral.value.toString(),
			};
		}

		case 'listPools': {
			const client = await createSynthetixClient(this);
			const network = client.getNetwork();
			const pools = POOLS[network] || {};

			return Object.entries(pools).map(([id, config]) => ({
				poolId: id,
				name: config.name,
				description: config.description,
				isPreferred: config.isPreferred,
			}));
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
