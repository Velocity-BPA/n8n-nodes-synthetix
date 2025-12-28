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
import { isValidAddress } from '../../utils/accountUtils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['vault'],
			},
		},
		options: [
			{ name: 'Get Vault', value: 'getVault', description: 'Get vault details', action: 'Get vault' },
			{ name: 'Get Vault Debt', value: 'getVaultDebt', description: 'Get vault total debt', action: 'Get vault debt' },
			{ name: 'Get Vault Collateral', value: 'getVaultCollateral', description: 'Get vault total collateral', action: 'Get vault collateral' },
			{ name: 'Get Vault Collateral Ratio', value: 'getVaultCRatio', description: 'Get vault C-ratio', action: 'Get vault collateral ratio' },
			{ name: 'Get Vault by Pool and Collateral', value: 'getVaultByPoolAndCollateral', description: 'Get specific vault', action: 'Get vault by pool and collateral' },
			{ name: 'List Vaults', value: 'listVaults', description: 'List all vaults', action: 'List vaults' },
		],
		default: 'getVault',
	},

	// Vault ID
	{
		displayName: 'Vault ID',
		name: 'vaultId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['vault'],
				operation: ['getVault', 'getVaultDebt', 'getVaultCollateral', 'getVaultCRatio'],
			},
		},
		default: '',
		placeholder: 'pool_1_collateral_0x...',
		description: 'The vault ID (format: pool_[poolId]_collateral_[address])',
	},

	// Pool ID
	{
		displayName: 'Pool ID',
		name: 'poolId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['vault'],
				operation: ['getVaultByPoolAndCollateral'],
			},
		},
		default: '1',
		description: 'The pool ID',
	},

	// Collateral Type
	{
		displayName: 'Collateral Type',
		name: 'collateralType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['vault'],
				operation: ['getVaultByPoolAndCollateral'],
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
		case 'getVault': {
			const vaultId = this.getNodeParameter('vaultId', itemIndex) as string;

			if (credentialType === 'api') {
				const client = await createSubgraphClient(this, 'synthetixApi');
				const vault = await client.getVault(vaultId);
				return vault as unknown as IDataObject;
			} else {
				// Parse vault ID to get pool and collateral
				const parts = vaultId.split('_');
				if (parts.length < 4) {
					throw new NodeOperationError(this.getNode(), 'Invalid vault ID format', { itemIndex });
				}

				const poolId = parts[1];
				const collateralType = parts[3];

				const client = await createSynthetixClient(this);
				const debt = await client.getVaultDebt(BigInt(poolId), collateralType);
				const collateral = await client.getVaultCollateral(BigInt(poolId), collateralType);
				const cRatio = await client.getVaultCollateralRatio(BigInt(poolId), collateralType);

				return {
					vaultId,
					poolId,
					collateralType,
					debt: formatWei(debt),
					collateralAmount: formatWei(collateral.amount),
					collateralValue: formatWei(collateral.value),
					cRatio: (Number(cRatio) / 1e18 * 100).toFixed(2) + '%',
				};
			}
		}

		case 'getVaultDebt': {
			const vaultId = this.getNodeParameter('vaultId', itemIndex) as string;
			const parts = vaultId.split('_');
			if (parts.length < 4) {
				throw new NodeOperationError(this.getNode(), 'Invalid vault ID format', { itemIndex });
			}

			const poolId = parts[1];
			const collateralType = parts[3];

			const client = await createSynthetixClient(this);
			const debt = await client.getVaultDebt(BigInt(poolId), collateralType);

			return {
				vaultId,
				poolId,
				collateralType,
				debt: formatWei(debt),
				debtRaw: debt.toString(),
			};
		}

		case 'getVaultCollateral': {
			const vaultId = this.getNodeParameter('vaultId', itemIndex) as string;
			const parts = vaultId.split('_');
			if (parts.length < 4) {
				throw new NodeOperationError(this.getNode(), 'Invalid vault ID format', { itemIndex });
			}

			const poolId = parts[1];
			const collateralType = parts[3];

			const client = await createSynthetixClient(this);
			const collateral = await client.getVaultCollateral(BigInt(poolId), collateralType);

			return {
				vaultId,
				poolId,
				collateralType,
				amount: formatWei(collateral.amount),
				value: formatWei(collateral.value),
				amountRaw: collateral.amount.toString(),
				valueRaw: collateral.value.toString(),
			};
		}

		case 'getVaultCRatio': {
			const vaultId = this.getNodeParameter('vaultId', itemIndex) as string;
			const parts = vaultId.split('_');
			if (parts.length < 4) {
				throw new NodeOperationError(this.getNode(), 'Invalid vault ID format', { itemIndex });
			}

			const poolId = parts[1];
			const collateralType = parts[3];

			const client = await createSynthetixClient(this);
			const cRatio = await client.getVaultCollateralRatio(BigInt(poolId), collateralType);

			return {
				vaultId,
				poolId,
				collateralType,
				cRatio: (Number(cRatio) / 1e18 * 100).toFixed(2),
				cRatioPercentage: (Number(cRatio) / 1e18 * 100).toFixed(2) + '%',
				cRatioRaw: cRatio.toString(),
			};
		}

		case 'getVaultByPoolAndCollateral': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const debt = await client.getVaultDebt(BigInt(poolId), collateralType);
			const collateral = await client.getVaultCollateral(BigInt(poolId), collateralType);
			const cRatio = await client.getVaultCollateralRatio(BigInt(poolId), collateralType);

			const vaultId = `pool_${poolId}_collateral_${collateralType.toLowerCase()}`;

			return {
				vaultId,
				poolId,
				collateralType,
				debt: formatWei(debt),
				collateralAmount: formatWei(collateral.amount),
				collateralValue: formatWei(collateral.value),
				cRatio: (Number(cRatio) / 1e18 * 100).toFixed(2) + '%',
			};
		}

		case 'listVaults': {
			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const vaults = await client.getVaults(50);
			return vaults as unknown as IDataObject[];
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
