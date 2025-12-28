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
import { toWei, formatWei } from '../../utils/weiUtils';
import { isValidAccountId, isValidAddress } from '../../utils/accountUtils';
import { calculateDebtSharePercentage } from '../../utils/debtUtils';

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['debt'],
			},
		},
		options: [
			{ name: 'Get Account Debt', value: 'getAccountDebt', description: 'Get debt for an account', action: 'Get account debt' },
			{ name: 'Get Pool Debt', value: 'getPoolDebt', description: 'Get total pool debt', action: 'Get pool debt' },
			{ name: 'Get Market Debt', value: 'getMarketDebt', description: 'Get market reported debt', action: 'Get market debt' },
			{ name: 'Burn Debt', value: 'burnDebt', description: 'Burn snxUSD to reduce debt', action: 'Burn debt' },
			{ name: 'Get Debt Shares', value: 'getDebtShares', description: 'Get debt share balance', action: 'Get debt shares' },
			{ name: 'Calculate Debt Share', value: 'calculateDebtShare', description: 'Calculate debt from shares', action: 'Calculate debt share' },
			{ name: 'Get Debt Distribution', value: 'getDebtDistribution', description: 'Get debt distribution info', action: 'Get debt distribution' },
		],
		default: 'getAccountDebt',
	},

	// Account ID
	{
		displayName: 'Account ID',
		name: 'accountId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['debt'],
				operation: ['getAccountDebt', 'burnDebt', 'getDebtShares', 'calculateDebtShare'],
			},
		},
		default: '',
		placeholder: '123456789',
		description: 'The Synthetix account ID',
	},

	// Pool ID
	{
		displayName: 'Pool ID',
		name: 'poolId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['debt'],
				operation: ['getAccountDebt', 'getPoolDebt', 'burnDebt', 'getDebtShares', 'calculateDebtShare', 'getDebtDistribution'],
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
				resource: ['debt'],
				operation: ['getAccountDebt', 'burnDebt', 'getPoolDebt', 'getDebtShares', 'calculateDebtShare'],
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
				resource: ['debt'],
				operation: ['getMarketDebt'],
			},
		},
		default: '',
		placeholder: '100',
		description: 'The market ID',
	},

	// Amount for burn
	{
		displayName: 'Amount',
		name: 'amount',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['debt'],
				operation: ['burnDebt'],
			},
		},
		default: '',
		placeholder: '100.0',
		description: 'Amount of snxUSD to burn',
	},

	// Debt shares for calculation
	{
		displayName: 'Debt Shares',
		name: 'debtShares',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['debt'],
				operation: ['calculateDebtShare'],
			},
		},
		default: '',
		placeholder: '1000000000000000000',
		description: 'Amount of debt shares (in wei)',
	},
];

export async function execute(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<IDataObject | IDataObject[]> {
	const credentialType = this.getNodeParameter('credentialType', itemIndex) as string;

	switch (operation) {
		case 'getAccountDebt': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);

			return {
				accountId,
				poolId,
				collateralType,
				debt: formatWei(position.debt),
				debtRaw: position.debt.toString(),
				collateralValue: formatWei(position.collateralValue),
				cRatio: (Number(position.cRatio) / 1e18 * 100).toFixed(2) + '%',
			};
		}

		case 'getPoolDebt': {
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

		case 'getMarketDebt': {
			const marketId = this.getNodeParameter('marketId', itemIndex) as string;

			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const market = await client.getMarket(marketId);

			return {
				marketId,
				reportedDebt: market?.reportedDebt || '0',
				creditCapacity: market?.creditCapacity || '0',
			};
		}

		case 'burnDebt': {
			if (credentialType !== 'network') {
				throw new NodeOperationError(this.getNode(), 'Burn debt requires network credentials', { itemIndex });
			}

			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;
			const amount = this.getNodeParameter('amount', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			if (!isValidAddress(collateralType)) {
				throw new NodeOperationError(this.getNode(), `Invalid collateral address: ${collateralType}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const amountWei = toWei(amount);

			const result = await client.burnUsd(
				BigInt(accountId),
				BigInt(poolId),
				collateralType,
				amountWei,
			);

			return {
				success: true,
				accountId,
				poolId,
				collateralType,
				amountBurned: amount,
				transactionHash: result.transactionHash,
				blockNumber: result.blockNumber,
			};
		}

		case 'getDebtShares': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			// Get position to determine debt shares
			const client = await createSynthetixClient(this);
			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);

			return {
				accountId,
				poolId,
				collateralType,
				debt: formatWei(position.debt),
				debtRaw: position.debt.toString(),
				note: 'Debt shares are proportional to position debt',
			};
		}

		case 'calculateDebtShare': {
			const accountId = this.getNodeParameter('accountId', itemIndex) as string;
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;
			const collateralType = this.getNodeParameter('collateralType', itemIndex) as string;

			if (!isValidAccountId(accountId)) {
				throw new NodeOperationError(this.getNode(), `Invalid account ID: ${accountId}`, { itemIndex });
			}

			const client = await createSynthetixClient(this);
			const position = await client.getPosition(BigInt(accountId), BigInt(poolId), collateralType);
			const vaultDebt = await client.getVaultDebt(BigInt(poolId), collateralType);

			const sharePercentage = calculateDebtSharePercentage(position.debt, vaultDebt);

			return {
				accountId,
				poolId,
				collateralType,
				accountDebt: formatWei(position.debt),
				totalVaultDebt: formatWei(vaultDebt),
				sharePercentage: sharePercentage.toFixed(4) + '%',
			};
		}

		case 'getDebtDistribution': {
			const poolId = this.getNodeParameter('poolId', itemIndex) as string;

			const client = await createSubgraphClient(this, credentialType === 'api' ? 'synthetixApi' : 'synthetixNetwork');
			const pool = await client.getPool(poolId);

			return {
				poolId,
				totalDebt: pool?.totalDebt || '0',
				markets: pool?.markets || [],
			};
		}

		default:
			throw new NodeOperationError(this.getNode(), `Unknown operation: ${operation}`, { itemIndex });
	}
}
